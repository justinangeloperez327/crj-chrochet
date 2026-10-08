"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { requireDb } from "@/lib/db";

export async function updateAccountProfile(formData: FormData) {
  const user = await requireUser();
  const db = requireDb();

  const name = required(formData, "name");
  const phone = optional(formData, "phone");
  const [firstName, ...rest] = name.split(/\s+/);
  const lastName = rest.join(" ") || null;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name },
    });

    if (user.customer) {
      await tx.customer.update({
        where: { id: user.customer.id },
        data: {
          firstName: firstName || null,
          lastName,
          phone: phone || null,
        },
      });
    }
  });

  revalidatePath("/account");
}

export async function addAccountAddress(formData: FormData) {
  const user = await requireUser();
  const db = requireDb();

  if (!user.customer) {
    throw new Error("Customer profile not found.");
  }

  const count = await db.address.count({
    where: { customerId: user.customer.id },
  });

  await db.address.create({
    data: {
      customerId: user.customer.id,
      label: optional(formData, "label") || "Address",
      recipient: required(formData, "recipient"),
      phone: optional(formData, "phone") || null,
      addressLine1: required(formData, "addressLine1"),
      addressLine2: optional(formData, "addressLine2") || null,
      city: required(formData, "city"),
      emirate: required(formData, "emirate"),
      countryCode: "AE",
      isDefault: count === 0,
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(formData: FormData) {
  const user = await requireUser();
  const db = requireDb();
  const addressId = required(formData, "addressId");

  if (!user.customer) throw new Error("Customer profile not found.");

  const address = await db.address.findFirst({
    where: {
      id: addressId,
      customerId: user.customer.id,
    },
  });

  if (!address) throw new Error("Address not found.");

  await db.$transaction([
    db.address.updateMany({
      where: { customerId: user.customer.id },
      data: { isDefault: false },
    }),
    db.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/account");
  revalidatePath("/account/addresses");
}

export async function deleteAccountAddress(formData: FormData) {
  const user = await requireUser();
  const db = requireDb();
  const addressId = required(formData, "addressId");

  if (!user.customer) throw new Error("Customer profile not found.");

  const address = await db.address.findFirst({
    where: {
      id: addressId,
      customerId: user.customer.id,
    },
  });

  if (!address) return;

  await db.address.delete({ where: { id: addressId } });

  if (address.isDefault) {
    const next = await db.address.findFirst({
      where: { customerId: user.customer.id },
      orderBy: { createdAt: "desc" },
    });

    if (next) {
      await db.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath("/account");
  revalidatePath("/account/addresses");
}

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function optional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

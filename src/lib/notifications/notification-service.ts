import { Resend } from "resend";

import { requireDb } from "@/lib/db";

type OrderNotificationPayload = {
  orderNumber: string;
  total: number;
  currency: string;
};

export async function processNotificationOutbox(limit = 20) {
  const db = requireDb();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;

  if (!apiKey || !from) {
    return { processed: 0, sent: 0, configured: false };
  }

  const resend = new Resend(apiKey);
  const notifications = await db.notificationOutbox.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;

  for (const notification of notifications) {
    try {
      const payload = notification.payload as unknown as OrderNotificationPayload;

      const result = await resend.emails.send({
        from,
        to: notification.toEmail,
        subject: notification.subject,
        html: renderEmail(notification.type, payload),
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await db.notificationOutbox.update({
        where: { id: notification.id },
        data: {
          status: "SENT",
          attempts: { increment: 1 },
          lastError: null,
          sentAt: new Date(),
        },
      });
      sent += 1;
    } catch (error) {
      await db.notificationOutbox.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
          lastError:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Unknown email error",
        },
      });
    }
  }

  return {
    processed: notifications.length,
    sent,
    configured: true,
  };
}

function renderEmail(
  type: string,
  payload: OrderNotificationPayload,
) {
  const title =
    type === "ORDER_CONFIRMED"
      ? "Your Handmade Blooms order is confirmed"
      : type === "PAYMENT_FAILED"
        ? "We couldn’t confirm your payment"
        : "Update on your Handmade Blooms order";

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#321A32">
      <p style="font-size:12px;color:#E85D9E;text-transform:uppercase;letter-spacing:.12em">Handmade Blooms by CRJ</p>
      <h1 style="font-size:28px;margin:16px 0">${escapeHtml(title)}</h1>
      <p>Order <strong>${escapeHtml(payload.orderNumber)}</strong></p>
      <p>Total: <strong>${escapeHtml(payload.currency)} ${payload.total.toFixed(2)}</strong></p>
      <p style="color:#756471;line-height:1.6">We’ll continue updating your order as it moves through preparation and fulfillment.</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

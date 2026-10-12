import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { hashAuthToken } from "../../src/lib/auth/email-tokens";

const email = "e2e-customer@example.invalid";
const password = "e2e isolated customer password";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

test.beforeAll(async () => {
  expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/crj_test");
  await db.user.upsert({ where: { email }, update: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() }, create: {
    email, passwordHash: await hashPassword(password), name: "Browser Test Customer", emailVerifiedAt: new Date(),
    customer: { create: { email, firstName: "Browser", lastName: "Customer" } },
  } });
});
test.afterAll(async () => {
  const user = await db.user.findUnique({ where: { email } });
  if (user) { await db.customer.deleteMany({ where: { userId: user.id } }); await db.user.delete({ where: { id: user.id } }); }
  await db.$disconnect();
});

test("storefront routes render and catalogue cart persists", async ({ page }) => {
  for (const route of ["/", "/shop", "/collections", "/register", "/forgot-password"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
  await page.goto("/products/pink-tulip-bouquet");
  await page.getByRole("button", { name: /^Add · AED/ }).click();
  await page.goto("/cart");
  await expect(page.getByText("Pink Tulip Bouquet").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Pink Tulip Bouquet").first()).toBeVisible();
});

test("anonymous admin access redirects and cross-origin logout fails", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  expect((await request.post("/api/auth/logout", { headers: { origin: "https://other.example" } })).status()).toBe(403);
});

test("customer login, account, admin isolation, and logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/account/orders");
  await expect(page.locator("main")).toBeVisible();
  await page.locator('form[action="/api/auth/logout"] button').first().click();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

test("admin signs in and operational pages render", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const route of ["products", "inventory", "orders", "materials", "settings", "production"]) {
    expect((await page.goto("/admin/" + route))?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
});

test("password reset revokes browser session", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const token = randomBytes(32).toString("base64url");
  await db.authToken.create({ data: { userId: user.id, tokenHash: hashAuthToken(token), type: "PASSWORD_RESET", expiresAt: new Date(Date.now() + 600000) } });
  const response = await request.post("/api/auth/reset", { headers: { origin: "http://127.0.0.1:3000" }, form: { token, password: "new secure e2e test password" }, maxRedirects: 0 });
  expect(response.status()).toBe(303);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "../../src/lib/auth/password";

const email = "e2e-customer@example.invalid";
const password = "e2e isolated customer password";
const stemSlug = "e2e-stem-" + randomUUID();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

test.beforeAll(async () => {
  expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/crj_test");
  await db.query('DELETE FROM "User" WHERE email=$1', ["e2e-bootstrap-admin@example.invalid"]);
  const userId = randomUUID();
  await db.query(`INSERT INTO "User" (id,email,"passwordHash",name,"emailVerifiedAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())
    ON CONFLICT(email) DO UPDATE SET "passwordHash"=EXCLUDED."passwordHash", "emailVerifiedAt"=NOW()`, [userId,email,await hashPassword(password),"Browser Test Customer"]);
  const user = (await db.query<{ id: string }>('SELECT id FROM "User" WHERE email=$1', [email])).rows[0];
  await db.query(`INSERT INTO "Customer" (id,"userId",email,"firstName","lastName","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT(email) DO NOTHING`, [randomUUID(),user.id,email,"Browser","Customer"]);
});
test.afterAll(async () => {
  await db.query('DELETE FROM "Customer" WHERE email=$1', [email]);
  await db.query('DELETE FROM "User" WHERE email=$1', [email]);
  await db.query('DELETE FROM "BouquetStemOption" WHERE slug=$1', [stemSlug]);
  await db.query('DELETE FROM "User" WHERE email=$1', ["e2e-bootstrap-admin@example.invalid"]);
  await db.end();
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
  for (const route of ["products", "inventory", "orders", "materials", "settings", "production", "bouquet-options"]) {
    expect((await page.goto("/admin/" + route))?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
  await page.goto("/admin/bouquet-options");
  const create = page.getByTestId("new-stem");
  await create.getByLabel("Slug", { exact: true }).fill(stemSlug);
  await create.getByLabel("Flower", { exact: true }).fill("Test flower");
  await create.getByLabel("Colour name", { exact: true }).fill("Pink");
  await create.getByLabel("Price (AED)", { exact: true }).fill("9.99");
  await create.getByRole("button", { name: "Create option" }).click();
  await expect.poll(async () => (await db.query('SELECT COUNT(*)::int AS count FROM "BouquetStemOption" WHERE slug=$1', [stemSlug])).rows[0].count).toBe(1);
  const edit = page.getByTestId("edit-stem").filter({ has: page.locator(`input[name="slug"][value="${stemSlug}"]`) });
  await edit.getByLabel("Active", { exact: true }).uncheck();
  await edit.getByRole("button", { name: "Save option" }).click();
  await expect.poll(async () => (await db.query('SELECT "isActive" FROM "BouquetStemOption" WHERE slug=$1', [stemSlug])).rows[0].isActive).toBe(false);
});

test("password reset revokes browser session", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const user = (await db.query<{ id: string }>('SELECT id FROM "User" WHERE email=$1', [email])).rows[0];
  const token = randomBytes(32).toString("base64url");
  await db.query('INSERT INTO "AuthToken" (id,"userId","tokenHash",type,"expiresAt") VALUES ($1,$2,$3,$4,$5)', [randomUUID(),user.id,createHash("sha256").update(token).digest("hex"),"PASSWORD_RESET",new Date(Date.now() + 600000)]);
  const response = await request.post("/api/auth/reset", { headers: { origin: "http://127.0.0.1:3000" }, form: { token, password: "new secure e2e test password" }, maxRedirects: 0 });
  expect(response.status()).toBe(303);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

test("Vercel environment admin is created on first correct login", async ({ page }) => {
  const bootstrapEmail = "e2e-bootstrap-admin@example.invalid";
  await page.goto("/login");
  await page.getByLabel("Email address").fill(bootstrapEmail);
  await page.getByLabel("Password", { exact: true }).fill("wrong bootstrap password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  expect((await db.query('SELECT COUNT(*)::int AS count FROM "User" WHERE email=$1', [bootstrapEmail])).rows[0].count).toBe(0);
  await page.getByLabel("Email address").fill(bootstrapEmail);
  await page.getByLabel("Password", { exact: true }).fill("e2e unique bootstrap admin password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const saved = (await db.query('SELECT role,"emailVerifiedAt" FROM "User" WHERE email=$1', [bootstrapEmail])).rows[0];
  expect(saved.role).toBe("ADMIN"); expect(saved.emailVerifiedAt).toBeTruthy();
  await page.reload(); await expect(page).toHaveURL(/\/admin$/);
});

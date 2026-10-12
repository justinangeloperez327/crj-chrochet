export function checkoutProvider(): "STRIPE" | "ZIINA" {
  const value = process.env.PAYMENT_PROVIDER ?? "stripe";
  if (value === "stripe") return "STRIPE";
  if (value === "ziina") return "ZIINA";
  throw new Error("PAYMENT_PROVIDER must be stripe or ziina.");
}
export function paymentProviderName() { return checkoutProvider() === "ZIINA" ? "Ziina" : "Stripe"; }

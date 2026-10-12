import { checkoutProvider } from "./provider";
import { createStripeCheckoutSession } from "./stripe";
import { createZiinaCheckoutSession } from "./ziina";
export function createHostedCheckout(orderId: string) {
  return checkoutProvider() === "ZIINA" ? createZiinaCheckoutSession(orderId) : createStripeCheckoutSession(orderId);
}

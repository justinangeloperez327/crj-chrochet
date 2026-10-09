import { getDb } from "@/lib/db";

export async function getOrderConfirmationByStripeSession(
  sessionId: string,
) {
  const db = getDb();
  if (!db) return null;

  const attempt = await db.paymentAttempt.findUnique({
    where: { externalId: sessionId },
    include: {
      order: {
        include: {
          items: {
            orderBy: { createdAt: "asc" },
          },
          shippingAddress: true,
          customBouquetRequest: {
            select: {
              id: true,
              referenceNumber: true,
              totalStems: true,
            },
          },
        },
      },
    },
  });

  return attempt;
}

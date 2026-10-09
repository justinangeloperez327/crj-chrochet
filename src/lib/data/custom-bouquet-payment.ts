import { getDb } from "@/lib/db";

export async function getCustomBouquetPaymentQuote(token: string) {
  const db = getDb();
  if (!db) return null;

  return db.customBouquetRequest.findUnique({
    where: { paymentToken: token },
    include: {
      wrapping: true,
      order: {
        include: {
          paymentAttempts: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
}

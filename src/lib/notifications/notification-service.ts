import { Resend } from "resend";

import { requireDb } from "@/lib/db";

type OrderNotificationPayload = {
  orderNumber: string;
  total: number;
  currency: string;
  refundAmount?: number;
  refundedTotal?: number;
  reason?: string;
  carrier?: string | null;
  trackingNumber?: string | null;
};

type CustomBouquetQuotePayload = {
  referenceNumber: string;
  finalPrice: number;
  currency: string;
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  paymentUrl: string;
  quoteExpiresAt: string;
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
      const result = await resend.emails.send({
        from,
        to: notification.toEmail,
        subject: notification.subject,
        html: renderEmail(
          notification.type,
          notification.payload as unknown,
        ),
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

function renderEmail(type: string, payload: unknown) {
  if (type === "CUSTOM_BOUQUET_QUOTE_READY") {
    const quote = payload as CustomBouquetQuotePayload;

    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#321A32">
        <p style="font-size:12px;color:#E85D9E;text-transform:uppercase;letter-spacing:.12em">Handmade Blooms by CRJ</p>
        <h1 style="font-size:28px;margin:16px 0">Your custom bouquet is ready for payment</h1>
        <p>Reference <strong>${escapeHtml(quote.referenceNumber)}</strong></p>
        <p>Final bouquet price: <strong>${escapeHtml(quote.currency)} ${quote.finalPrice.toFixed(2)}</strong> before delivery.</p>
        <p>Production lead time: <strong>${quote.leadTimeMinDays}–${quote.leadTimeMaxDays} days</strong> after confirmed payment.</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(quote.paymentUrl)}" style="background:#321A32;color:white;text-decoration:none;padding:12px 18px;display:inline-block;font-weight:600">Complete delivery & payment</a>
        </p>
        <p style="color:#756471;line-height:1.6">This quote expires on ${escapeHtml(formatEmailDate(quote.quoteExpiresAt))}. Delivery is calculated from the selected emirate before Stripe Checkout opens.</p>
      </div>
    `;
  }

  const order = payload as OrderNotificationPayload;

  const config: Record<
    string,
    { title: string; message: string }
  > = {
    ORDER_CONFIRMED: {
      title: "Your Handmade Blooms order is confirmed",
      message:
        "We’ll continue updating your order as it moves through preparation and fulfillment.",
    },
    PAYMENT_FAILED: {
      title: "We couldn’t confirm your payment",
      message:
        "No new payment is required until you intentionally start checkout again.",
    },
    ORDER_CANCELLED: {
      title: "Your Handmade Blooms order was cancelled",
      message: order.reason
        ? `Reason: ${order.reason}`
        : "This order will not continue to fulfillment.",
    },
    ORDER_REFUND_STARTED: {
      title: "Your refund has started",
      message:
        "Stripe is processing the refund. We’ll update the order when the refund reaches its final state.",
    },
    ORDER_PARTIALLY_REFUNDED: {
      title: "A partial refund was completed",
      message: `Refunded: ${order.currency} ${(order.refundAmount ?? 0).toFixed(2)}. Total refunded so far: ${order.currency} ${(order.refundedTotal ?? 0).toFixed(2)}.`,
    },
    ORDER_REFUNDED: {
      title: "Your refund was completed",
      message: `Refunded: ${order.currency} ${(order.refundAmount ?? 0).toFixed(2)}.`,
    },
    ORDER_REFUND_FAILED: {
      title: "There was a problem with your refund",
      message: order.reason
        ? order.reason
        : "The refund did not complete successfully. CRJ will review the payment and contact you if action is required.",
    },
    ORDER_SHIPPED: {
      title: "Your Handmade Blooms order has shipped",
      message: [
        order.carrier ? `Carrier: ${order.carrier}` : null,
        order.trackingNumber
          ? `Tracking: ${order.trackingNumber}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Your order is on the way.",
    },
    ORDER_DELIVERED: {
      title: "Your Handmade Blooms order was delivered",
      message: "We hope the blooms make the moment a little more special.",
    },
  };

  const selected = config[type] ?? {
    title: "Update on your Handmade Blooms order",
    message:
      "We’ll continue updating your order as it moves through preparation and fulfillment.",
  };

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#321A32">
      <p style="font-size:12px;color:#E85D9E;text-transform:uppercase;letter-spacing:.12em">Handmade Blooms by CRJ</p>
      <h1 style="font-size:28px;margin:16px 0">${escapeHtml(selected.title)}</h1>
      <p>Order <strong>${escapeHtml(order.orderNumber)}</strong></p>
      <p>Total: <strong>${escapeHtml(order.currency)} ${order.total.toFixed(2)}</strong></p>
      <p style="color:#756471;line-height:1.6">${escapeHtml(selected.message)}</p>
    </div>
  `;
}

function formatEmailDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

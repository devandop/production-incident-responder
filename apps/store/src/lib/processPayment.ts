export class TimeoutError extends Error {
  constructor(message = "Payment gateway timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulated payment path. Keep this module small so PostHog stack traces
 * point at a stable `processPayment` frame during incidents.
 */
export async function processPayment(input: {
  amount: number;
  buggyCheckout: boolean;
  slowCheckout?: boolean;
}): Promise<{ orderId: string }> {
  await sleep(input.slowCheckout ? 3200 : 450);

  if (input.amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  if (input.buggyCheckout && Math.random() < 0.9) {
    throw new TimeoutError(
      "Payment gateway timed out in processPayment (new-checkout-v2)",
    );
  }

  return { orderId: `ord_${Date.now()}` };
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFeatureFlagEnabled, usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { cartCount, cartTotal, clearCart, readCart, type CartItem } from "@/lib/cart";
import { readChaosKind, readChaosMode, readSlowMode } from "@/lib/incident";
import { readIdentity } from "@/lib/identity";
import { itemsToOrderLines, saveFailedCheckout, saveOrder } from "@/lib/orders";
import { cartPricing, money } from "@/lib/pricing";
import { processPayment } from "@/lib/processPayment";
import { ProductArt } from "@/components/ProductArt";

async function reportMetrics(ok: boolean, latencyMs: number) {
  try {
    await fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok, latencyMs }),
    });
  } catch {
    /* demo metrics are best-effort */
  }
}

type Step = "contact" | "pay";

export default function CheckoutPage() {
  const posthog = usePostHog();
  const flagOn = Boolean(useFeatureFlagEnabled("new-checkout-v2"));
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("contact");
  const [email, setEmail] = useState("alice@forge.store");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    setItems(readCart());
  }, []);

  useEffect(() => {
    posthog?.capture("checkout_step", { step: "contact" });
  }, [posthog]);

  const pricing = cartPricing(cartTotal(items));

  function goToPay() {
    setStep("pay");
    posthog?.capture("checkout_step", { step: "pay", email_domain: email.split("@")[1] });
  }

  async function pay() {
    setBusy(true);
    setError(null);
    const chaosKind = readChaosKind();
    const identity = readIdentity();
    const orderContext = {
      userId: identity.id,
      userName: identity.name,
      chaosKind,
      newCheckoutV2: flagOn,
      email,
    };
    posthog?.capture("checkout_started", {
      item_count: cartCount(items),
      amount: pricing.total,
      checkout_step: "pay",
      chaos_kind: chaosKind,
    });

    const buggyCheckout = flagOn || readChaosMode();
    const slowCheckout = readSlowMode();
    const started = performance.now();

    try {
      const result = await processPayment({
        amount: pricing.total,
        buggyCheckout,
        slowCheckout,
      });
      const latencyMs = Math.round(performance.now() - started);
      await reportMetrics(true, latencyMs);
      posthog?.capture("purchase_completed", {
        amount: pricing.total,
        order_id: result.orderId,
        new_checkout_v2: flagOn,
        chaos_mode: readChaosMode(),
        chaos_kind: chaosKind,
        item_count: cartCount(items),
      });
      saveOrder({
        id: result.orderId,
        items: itemsToOrderLines(items),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        total: pricing.total,
        createdAt: new Date().toISOString(),
        userId: orderContext.userId,
        userName: orderContext.userName,
        chaosKind: orderContext.chaosKind,
        newCheckoutV2: orderContext.newCheckoutV2,
        email: orderContext.email,
      });
      clearCart();
      router.push(`/success?order=${result.orderId}`);
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started);
      await reportMetrics(false, latencyMs);
      const message = err instanceof Error ? err.message : "Payment failed";
      posthog?.capture("payment_failed", {
        amount: pricing.total,
        error_name: err instanceof Error ? err.name : "Error",
        error_message: message,
        new_checkout_v2: flagOn,
        chaos_mode: readChaosMode(),
        chaos_kind: chaosKind,
        retry: Boolean(error),
      });
      posthog?.captureException(err);
      saveFailedCheckout({
        items: itemsToOrderLines(items),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        total: pricing.total,
        context: orderContext,
        failureReason: message,
      });
      setError(message);
      router.push(`/failure?reason=${encodeURIComponent(message)}`);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <p>
        Nothing to check out.{" "}
        <Link href="/" className="text-accent underline">
          Add a product
        </Link>
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-4xl">Checkout</h1>
          {hydrated && flagOn ? (
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-accent">
              Checkout v2
            </span>
          ) : null}
        </div>
        <ol className="mt-4 flex gap-4 text-sm text-slate-500">
          <li className={step === "contact" ? "font-medium text-ink" : ""}>1. Contact</li>
          <li className={step === "pay" ? "font-medium text-ink" : ""}>2. Payment</li>
        </ol>

        {step === "contact" ? (
          <div className="mt-8">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 ring-1 ring-slate-200"
            />
            <p className="mt-2 text-xs text-slate-500">No account required. Payments are simulated.</p>
            <button
              type="button"
              onClick={goToPay}
              className="mt-6 w-full rounded-full bg-ink py-2.5 text-white"
            >
              Continue to payment
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-sm text-slate-600">
              Paying as <span className="font-medium text-ink">{email}</span>
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Card number
                <input
                  readOnly
                  value="4242 4242 4242 4242"
                  className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-slate-200"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Expiry
                  <input
                    readOnly
                    value="12 / 28"
                    className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-slate-200"
                  />
                </label>
                <label className="block text-sm font-medium">
                  CVC
                  <input
                    readOnly
                    value="123"
                    className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-slate-200"
                  />
                </label>
              </div>
            </div>
            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={pay}
              className="mt-6 w-full rounded-full bg-accent py-2.5 text-white disabled:opacity-60"
            >
              {busy
                ? "Processing payment…"
                : `Pay $${money(pricing.total)}`}
            </button>
            <button
              type="button"
              className="mt-3 w-full text-sm text-slate-500"
              onClick={() => setStep("contact")}
            >
              Back
            </button>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-medium">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.product.id} className="flex gap-3">
              <ProductArt product={item.product} labeled={false} className="h-12 w-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{item.product.name}</p>
                <p className="text-slate-500">
                  {item.quantity} × ${item.product.price}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
          <p className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>${money(pricing.subtotal)}</span>
          </p>
          <p className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span>${money(pricing.tax)}</span>
          </p>
          <p className="flex justify-between font-medium">
            <span>Total</span>
            <span>${money(pricing.total)}</span>
          </p>
        </div>
      </aside>
    </div>
  );
}

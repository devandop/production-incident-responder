"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Suspense } from "react";

function FailureBody() {
  const params = useSearchParams();
  const posthog = usePostHog();
  const reason = params.get("reason") ?? "Payment failed";

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-red-200">
      <p className="text-xs uppercase tracking-[0.16em] text-red-700">Gateway error</p>
      <h1 className="mt-2 font-serif text-4xl">Payment failed</h1>
      <p className="mt-3 text-slate-600">{reason}</p>
      <p className="mt-2 text-sm text-slate-500">
        Your cart is still saved. If Demo → Timeouts or{" "}
        <code className="font-mono">new-checkout-v2</code> is on, this is expected. The
        incident agent should see TimeoutError in PostHog.
      </p>
      <div className="mt-8 flex gap-4 text-sm">
        <Link
          href="/checkout"
          className="rounded-full bg-accent px-4 py-2 text-white"
          onClick={() => posthog?.capture("checkout_retry", { reason })}
        >
          Try again
        </Link>
        <Link href="/" className="rounded-full px-4 py-2 ring-1 ring-slate-200">
          Back to catalog
        </Link>
      </div>
    </div>
  );
}

export default function FailurePage() {
  return (
    <Suspense>
      <FailureBody />
    </Suspense>
  );
}

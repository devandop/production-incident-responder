"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessBody() {
  const params = useSearchParams();
  const order = params.get("order");

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-xs uppercase tracking-[0.16em] text-accent">Paid</p>
      <h1 className="mt-2 font-serif text-4xl">Order confirmed</h1>
      <p className="mt-3 text-slate-600">
        Payment succeeded{order ? ` for ${order}` : ""}. This is the healthy checkout path.
      </p>
      <div className="mt-8 flex justify-center gap-4 text-sm">
        <Link href="/orders" className="rounded-full bg-ink px-4 py-2 text-white">
          View orders
        </Link>
        <Link href="/" className="rounded-full px-4 py-2 ring-1 ring-slate-200">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessBody />
    </Suspense>
  );
}

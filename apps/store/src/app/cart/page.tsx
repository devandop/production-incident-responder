"use client";

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import {
  cartTotal,
  readCart,
  removeFromCart,
  setCartQuantity,
  type CartItem,
} from "@/lib/cart";
import { cartPricing, money } from "@/lib/pricing";
import { ProductArt } from "@/components/ProductArt";

export default function CartPage() {
  const posthog = usePostHog();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    refresh();
    window.addEventListener("forge-cart-changed", refresh);
    return () => window.removeEventListener("forge-cart-changed", refresh);
  }, []);

  const pricing = cartPricing(cartTotal(items));

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">Cart</h1>
      {items.length === 0 ? (
        <p className="mt-4 text-slate-600">
          Cart is empty.{" "}
          <Link href="/" className="text-accent underline">
            Browse products
          </Link>
        </p>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center gap-4 px-5 py-4">
                <ProductArt product={item.product} labeled={false} className="h-16 w-16 shrink-0 rounded-lg" />
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-slate-500">${item.product.price} each</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md ring-1 ring-slate-200"
                      onClick={() => {
                        setCartQuantity(item.product.id, item.quantity - 1);
                        posthog?.capture("cart_updated", { action: "decrement" });
                      }}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md ring-1 ring-slate-200"
                      onClick={() => {
                        setCartQuantity(item.product.id, item.quantity + 1);
                        posthog?.capture("cart_updated", { action: "increment" });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-red-700 hover:underline"
                  onClick={() => {
                    removeFromCart(item.product.id);
                    posthog?.capture("cart_updated", { action: "remove" });
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-1 text-slate-600">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span>${money(pricing.subtotal)}</span>
            </p>
            <p className="flex justify-between">
              <span>Tax</span>
              <span>${money(pricing.tax)}</span>
            </p>
            <p className="flex justify-between text-lg font-medium text-ink">
              <span>Total</span>
              <span>${money(pricing.total)}</span>
            </p>
          </div>
          <Link
            href="/checkout"
            className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-white"
          >
            Checkout
          </Link>
        </>
      )}
    </div>
  );
}

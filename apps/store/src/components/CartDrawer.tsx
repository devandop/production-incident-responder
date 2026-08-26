"use client";

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import {
  cartCount,
  cartTotal,
  readCart,
  removeFromCart,
  setCartQuantity,
  type CartItem,
} from "@/lib/cart";
import { cartPricing, money } from "@/lib/pricing";
import { ProductArt } from "./ProductArt";
import { useStoreUi } from "./StoreProvider";

export function CartDrawer() {
  const posthog = usePostHog();
  const { cartOpen, setCartOpen } = useStoreUi();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    refresh();
    window.addEventListener("forge-cart-changed", refresh);
    return () => window.removeEventListener("forge-cart-changed", refresh);
  }, []);

  const pricing = cartPricing(cartTotal(items));
  const count = cartCount(items);

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close cart"
        onClick={() => setCartOpen(false)}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-serif text-2xl">Cart ({count})</h2>
          <button type="button" className="text-sm text-slate-500" onClick={() => setCartOpen(false)}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-slate-600">
              Empty cart.{" "}
              <Link href="/" className="text-accent underline" onClick={() => setCartOpen(false)}>
                Browse the catalog
              </Link>
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.product.id} className="flex gap-3">
                  <ProductArt product={item.product} labeled={false} className="h-16 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-slate-500">${item.product.price}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-md ring-1 ring-slate-200"
                        onClick={() => {
                          setCartQuantity(item.product.id, item.quantity - 1);
                          posthog?.capture("cart_updated", {
                            action: "decrement",
                            product_id: item.product.id,
                          });
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
                          posthog?.capture("cart_updated", {
                            action: "increment",
                            product_id: item.product.id,
                          });
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-xs text-red-700"
                        onClick={() => {
                          removeFromCart(item.product.id);
                          posthog?.capture("cart_updated", {
                            action: "remove",
                            product_id: item.product.id,
                          });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 ? (
          <div className="border-t border-slate-200 px-5 py-4">
            <p className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>${money(pricing.subtotal)}</span>
            </p>
            <p className="mt-1 flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>${money(pricing.tax)}</span>
            </p>
            <p className="mt-2 flex justify-between font-medium">
              <span>Total</span>
              <span>${money(pricing.total)}</span>
            </p>
            <Link
              href="/checkout"
              className="mt-4 block rounded-full bg-accent py-2.5 text-center text-sm font-medium text-white"
              onClick={() => setCartOpen(false)}
            >
              Checkout
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

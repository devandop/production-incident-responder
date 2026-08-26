"use client";

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { addToCart } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { ProductArt } from "./ProductArt";
import { useStoreUi } from "./StoreProvider";

export function ProductCard({ product }: { product: Product }) {
  const posthog = usePostHog();
  const { setCartOpen } = useStoreUi();

  return (
    <li className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/product/${product.id}`} className="block">
        <ProductArt product={product} className="h-44" />
      </Link>
      <div className="p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-accent">{product.tag}</p>
        <h2 className="mt-1 font-serif text-xl">{product.name}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-medium">${product.price}</span>
          <button
            type="button"
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-accent"
            onClick={() => {
              addToCart(product);
              posthog?.capture("add_to_cart", {
                product_id: product.id,
                product_name: product.name,
                price: product.price,
              });
              posthog?.capture("cart_updated", {
                action: "add",
                product_id: product.id,
              });
              setCartOpen(true);
            }}
          >
            Add to cart
          </button>
        </div>
        {product.stock <= 4 ? (
          <p className="mt-2 text-xs text-amber-800">Only {product.stock} left</p>
        ) : null}
      </div>
    </li>
  );
}

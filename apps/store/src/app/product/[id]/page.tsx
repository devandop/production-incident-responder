"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { addToCart } from "@/lib/cart";
import { getProduct } from "@/lib/products";
import { ProductArt } from "@/components/ProductArt";
import { useStoreUi } from "@/components/StoreProvider";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = getProduct(id);
  const posthog = usePostHog();
  const { setCartOpen } = useStoreUi();

  useEffect(() => {
    if (!product) return;
    posthog?.capture("product_viewed", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
    });
  }, [product, posthog]);

  if (!product) {
    return (
      <p>
        Unknown product.{" "}
        <Link href="/" className="text-accent underline">
          Back to catalog
        </Link>
      </p>
    );
  }

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <ProductArt product={product} className="min-h-[320px] rounded-3xl" />
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-accent">{product.tag}</p>
        <h1 className="mt-2 font-serif text-4xl">{product.name}</h1>
        <p className="mt-4 text-slate-600">{product.description}</p>
        <p className="mt-6 text-3xl font-medium">${product.price}</p>
        {product.stock <= 4 ? (
          <p className="mt-2 text-sm text-amber-800">Only {product.stock} left</p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">In stock ({product.stock})</p>
        )}
        <button
          type="button"
          className="mt-8 rounded-full bg-accent px-6 py-3 text-white"
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
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCT_TAGS, PRODUCTS } from "@/lib/products";

export default function HomePage() {
  const posthog = usePostHog();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const tagOk = tag === "All" || p.tag === tag;
      const textOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q);
      return tagOk && textOk;
    });
  }, [query, tag]);

  return (
    <div>
      <section className="overflow-hidden rounded-3xl bg-ink px-8 py-14 text-white md:px-12">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-200">On-call merch</p>
        <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight md:text-5xl">
          Tools for people who get paged.
        </h1>
        <p className="mt-4 max-w-lg text-white/70">
          A small shop with a fragile checkout. Use it to generate payment
          failures the incident agent can investigate in PostHog and Grafana.
        </p>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className={`rounded-full px-3 py-1 text-sm ${
                tag === t ? "bg-ink text-white" : "bg-white ring-1 ring-slate-200"
              }`}
              onClick={() => {
                setTag(t);
                posthog?.capture("catalog_filtered", { tag: t });
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search catalog"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.length === 0 || value.length > 2) {
              posthog?.capture("product_searched", { query: value });
            }
          }}
          className="w-full rounded-full bg-white px-4 py-2 text-sm ring-1 ring-slate-200 sm:w-64"
        />
      </div>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="mt-8 text-slate-600">No products match that search.</p>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { cartCount, readCart } from "@/lib/cart";
import { IDENTITIES, readIdentity, writeIdentity, type Identity } from "@/lib/identity";
import { DemoControl } from "./DemoControl";
import { useStoreUi } from "./StoreProvider";

export function Header() {
  const posthog = usePostHog();
  const { setCartOpen } = useStoreUi();
  const [count, setCount] = useState(0);
  const [identity, setIdentity] = useState<Identity>(IDENTITIES[0]);

  useEffect(() => {
    const refreshCart = () => setCount(cartCount(readCart()));
    refreshCart();
    window.addEventListener("forge-cart-changed", refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      window.removeEventListener("forge-cart-changed", refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, []);

  useEffect(() => {
    const current = readIdentity();
    setIdentity(current);
    applyIdentify(current);
    const onChange = () => setIdentity(readIdentity());
    window.addEventListener("forge-identity-changed", onChange);
    return () => window.removeEventListener("forge-identity-changed", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posthog]);

  function applyIdentify(next: Identity) {
    if (!posthog) return;
    if (next.id === "guest") {
      posthog.reset();
      return;
    }
    posthog.identify(next.id, { name: next.name, demo_user: true });
  }

  function select(next: Identity) {
    writeIdentity(next);
    setIdentity(next);
    applyIdentify(next);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Forge Store
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/80 sm:flex">
          <Link href="/" className="hover:text-white">
            Catalog
          </Link>
          <Link href="/orders" className="hover:text-white">
            Orders
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <select
            aria-label="Shop as"
            className="max-w-[9.5rem] rounded-full bg-white/10 px-2 py-1.5 text-xs text-white"
            value={identity.id}
            onChange={(e) => {
              const next = IDENTITIES.find((i) => i.id === e.target.value);
              if (next) select(next);
            }}
          >
            {IDENTITIES.map((item) => (
              <option key={item.id} value={item.id} className="text-ink">
                {item.id === "guest" ? "Guest" : item.name}
              </option>
            ))}
          </select>
          <DemoControl />
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink"
            onClick={() => setCartOpen(true)}
          >
            Cart ({count})
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type StoreUi = {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  toast: (message: string) => void;
  toasts: { id: number; message: string }[];
};

const Ctx = createContext<StoreUi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(
    () => ({ cartOpen, setCartOpen, toast, toasts }),
    [cartOpen, toast, toasts],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useStoreUi() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStoreUi must be used within StoreProvider");
  return ctx;
}

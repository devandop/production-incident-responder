"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IDENTITIES, readIdentity, type Identity } from "@/lib/identity";
import type { ChaosKind } from "@/lib/incident";
import { readChaosKind } from "@/lib/incident";
import {
  chaosKindLabel,
  readOrders,
  userIdLabel,
  type StoredOrder,
} from "@/lib/orders";
import { money } from "@/lib/pricing";

type UserFilter = "all" | Identity["id"] | "unknown";
type ChaosFilter = "all" | ChaosKind | "unknown";
type StatusFilter = "all" | "completed" | "failed";

const USER_FILTERS: { id: UserFilter; label: string }[] = [
  { id: "all", label: "All users" },
  ...IDENTITIES.map((i) => ({ id: i.id as UserFilter, label: i.id === "guest" ? "Guest" : i.name })),
  { id: "unknown", label: "Unknown" },
];

const CHAOS_FILTERS: { id: ChaosFilter; label: string }[] = [
  { id: "all", label: "All modes" },
  { id: "off", label: "Healthy" },
  { id: "timeout", label: "Timeouts" },
  { id: "slow", label: "Slow gateway" },
  { id: "unknown", label: "Unknown" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Paid" },
  { id: "failed", label: "Failed" },
];

function matchesUser(order: StoredOrder, filter: UserFilter) {
  if (filter === "all") return true;
  return order.userId === filter;
}

function matchesChaos(order: StoredOrder, filter: ChaosFilter) {
  if (filter === "all") return true;
  return order.chaosKind === filter;
}

function matchesStatus(order: StoredOrder, filter: StatusFilter) {
  if (filter === "all") return true;
  return order.status === filter;
}

function FilterChip<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            value === opt.id ? "bg-ink text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OrderBadges({ order }: { order: StoredOrder }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
        {userIdLabel(order.userId, order.userName)}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
          order.chaosKind === "timeout"
            ? "bg-red-100 text-red-800"
            : order.chaosKind === "slow"
              ? "bg-amber-100 text-amber-900"
              : order.chaosKind === "off"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-100 text-slate-600"
        }`}
      >
        {chaosKindLabel(order.chaosKind)}
      </span>
      {order.newCheckoutV2 ? (
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-accent">
          Checkout v2
        </span>
      ) : null}
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
          order.status === "failed" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {order.status === "failed" ? "Failed" : "Paid"}
      </span>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [chaosFilter, setChaosFilter] = useState<ChaosFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadOrders = useCallback(() => {
    setOrders(readOrders());
  }, []);

  const syncFiltersFromHeader = useCallback(() => {
    setUserFilter(readIdentity().id);
    setChaosFilter(readChaosKind());
  }, []);

  useEffect(() => {
    loadOrders();
    syncFiltersFromHeader();
    const onOrdersChanged = () => loadOrders();
    const onHeaderChanged = () => {
      loadOrders();
      syncFiltersFromHeader();
    };
    window.addEventListener("forge-identity-changed", onHeaderChanged);
    window.addEventListener("forge-chaos-changed", onHeaderChanged);
    window.addEventListener("forge-orders-changed", onOrdersChanged);
    return () => {
      window.removeEventListener("forge-identity-changed", onHeaderChanged);
      window.removeEventListener("forge-chaos-changed", onHeaderChanged);
      window.removeEventListener("forge-orders-changed", onOrdersChanged);
    };
  }, [loadOrders, syncFiltersFromHeader]);

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesUser(order, userFilter) &&
          matchesChaos(order, chaosFilter) &&
          matchesStatus(order, statusFilter),
      ),
    [orders, userFilter, chaosFilter, statusFilter],
  );

  const activeUserLabel = USER_FILTERS.find((f) => f.id === userFilter)?.label ?? "selection";
  const activeChaosLabel = CHAOS_FILTERS.find((f) => f.id === chaosFilter)?.label ?? "selection";

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">Orders</h1>
      <p className="mt-2 text-sm text-slate-600">
        Filter by shopper and incident control mode. Defaults follow the header user and Demo
        setting.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">User</p>
          <FilterChip options={USER_FILTERS} value={userFilter} onChange={setUserFilter} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Incident control
          </p>
          <FilterChip options={CHAOS_FILTERS} value={chaosFilter} onChange={setChaosFilter} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <FilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-slate-600">
          No orders or checkout attempts yet.{" "}
          <Link href="/" className="text-accent underline">
            Shop the catalog
          </Link>
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-slate-600">
          No orders for <span className="font-medium">{activeUserLabel}</span> in{" "}
          <span className="font-medium">{activeChaosLabel}</span> mode. Try broadening the filters.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {filtered.map((order) => (
            <li key={`${order.id}-${order.createdAt}`} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.id}</p>
                  {order.email ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{order.email}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <OrderBadges order={order} />
              {order.status === "failed" && order.failureReason ? (
                <p className="mt-2 text-sm text-red-700">{order.failureReason}</p>
              ) : null}
              <ul className="mt-3 text-sm text-slate-600">
                {order.items.map((line) => (
                  <li key={`${order.id}-${line.name}`}>
                    {line.quantity} × {line.name}
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-medium">${money(order.total)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { CartItem } from "./cart";
import type { ChaosKind } from "./incident";

export type OrderStatus = "completed" | "failed";

/** Legacy orders without incident metadata are tagged unknown. */
export type StoredChaosKind = ChaosKind | "unknown";

export type StoredOrder = {
  id: string;
  status: OrderStatus;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  userId: string;
  userName?: string;
  chaosKind: StoredChaosKind;
  newCheckoutV2: boolean;
  email?: string;
  failureReason?: string;
};

export type CheckoutOrderContext = {
  userId: string;
  userName: string;
  chaosKind: ChaosKind;
  newCheckoutV2: boolean;
  email?: string;
};

const KEY = "forge-store-orders";
const MAX_ORDERS = 40;

function notifyOrdersChanged() {
  window.dispatchEvent(new Event("forge-orders-changed"));
}

function normalizeOrder(raw: Partial<StoredOrder> & Pick<StoredOrder, "id" | "items" | "total" | "createdAt">): StoredOrder {
  return {
    id: raw.id,
    status: raw.status ?? "completed",
    items: raw.items,
    subtotal: raw.subtotal ?? raw.total,
    tax: raw.tax ?? 0,
    total: raw.total,
    createdAt: raw.createdAt,
    userId: raw.userId ?? "unknown",
    userName: raw.userName,
    chaosKind: raw.chaosKind ?? "unknown",
    newCheckoutV2: raw.newCheckoutV2 ?? false,
    email: raw.email,
    failureReason: raw.failureReason,
  };
}

export function readOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<StoredOrder> & Pick<StoredOrder, "id" | "items" | "total" | "createdAt">>;
    return parsed.map(normalizeOrder);
  } catch {
    return [];
  }
}

function persistOrders(orders: StoredOrder[]) {
  localStorage.setItem(KEY, JSON.stringify(orders));
  notifyOrdersChanged();
}

export function saveOrder(
  order: Omit<StoredOrder, "status" | "chaosKind" | "userId" | "newCheckoutV2"> &
    Partial<Pick<StoredOrder, "status" | "chaosKind" | "userId" | "newCheckoutV2">>,
) {
  const record = normalizeOrder({
    ...order,
    status: order.status ?? "completed",
  });
  const next = [record, ...readOrders()].slice(0, MAX_ORDERS);
  persistOrders(next);
}

export function saveFailedCheckout(input: {
  id?: string;
  items: StoredOrder["items"];
  subtotal: number;
  tax: number;
  total: number;
  context: CheckoutOrderContext;
  failureReason: string;
}) {
  const record = normalizeOrder({
    id: input.id ?? `att_${Date.now()}`,
    status: "failed",
    items: input.items,
    subtotal: input.subtotal,
    tax: input.tax,
    total: input.total,
    createdAt: new Date().toISOString(),
    userId: input.context.userId,
    userName: input.context.userName,
    chaosKind: input.context.chaosKind,
    newCheckoutV2: input.context.newCheckoutV2,
    email: input.context.email,
    failureReason: input.failureReason,
  });
  const next = [record, ...readOrders()].slice(0, MAX_ORDERS);
  persistOrders(next);
}

export function itemsToOrderLines(items: CartItem[]) {
  return items.map((i) => ({
    name: i.product.name,
    quantity: i.quantity,
    price: i.product.price,
  }));
}

export function chaosKindLabel(kind: StoredChaosKind): string {
  switch (kind) {
    case "off":
      return "Healthy";
    case "timeout":
      return "Timeouts";
    case "slow":
      return "Slow gateway";
    default:
      return "Unknown";
  }
}

export function userIdLabel(userId: string, userName?: string): string {
  if (userId === "guest") return "Guest";
  if (userId === "unknown") return "Unknown";
  return userName ?? userId;
}

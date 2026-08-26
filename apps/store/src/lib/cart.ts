import type { Product } from "./products";

export type CartItem = {
  product: Product;
  quantity: number;
};

const KEY = "forge-store-cart";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("forge-cart-changed"));
}

export function addToCart(product: Product, quantity = 1) {
  const items = readCart();
  const existing = items.find((i) => i.product.id === product.id);
  if (existing) existing.quantity += quantity;
  else items.push({ product, quantity });
  writeCart(items);
}

export function setCartQuantity(productId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  writeCart(
    readCart().map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
  );
}

export function removeFromCart(productId: string) {
  writeCart(readCart().filter((i) => i.product.id !== productId));
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function clearCart() {
  writeCart([]);
}

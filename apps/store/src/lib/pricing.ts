export const TAX_RATE = 0.08;

export function money(n: number) {
  return n.toFixed(2);
}

export function cartPricing(subtotal: number) {
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  tag: string;
  accent: string;
  stock: number;
};

export const PRODUCTS: Product[] = [
  {
    id: "notebook",
    name: "Field Notebook",
    price: 24,
    tag: "Stationery",
    accent: "from-teal-800 to-slate-900",
    stock: 14,
    description: "Dot-grid notebook for incident notes and postmortems.",
  },
  {
    id: "mug",
    name: "On-call Mug",
    price: 18,
    tag: "Desk",
    accent: "from-amber-700 to-stone-900",
    stock: 8,
    description: "Holds coffee through a 3 a.m. checkout outage.",
  },
  {
    id: "lamp",
    name: "Pager Lamp",
    price: 64,
    tag: "Lighting",
    accent: "from-orange-500 to-zinc-900",
    stock: 3,
    description: "Warm desk lamp. Does not page you. The mug might.",
  },
  {
    id: "hoodie",
    name: "SRE Hoodie",
    price: 72,
    tag: "Apparel",
    accent: "from-emerald-900 to-black",
    stock: 11,
    description: "Soft fleece for long investigations and longer standups.",
  },
  {
    id: "sticker",
    name: "Rollback Sticker Pack",
    price: 8,
    tag: "Merch",
    accent: "from-rose-700 to-slate-900",
    stock: 42,
    description: "Five stickers. One of them is a feature flag.",
  },
];

export const PRODUCT_TAGS = ["All", ...Array.from(new Set(PRODUCTS.map((p) => p.tag)))];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

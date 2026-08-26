import type { Product } from "@/lib/products";

export function ProductArt({
  product,
  className = "",
  labeled = true,
}: {
  product: Product;
  className?: string;
  labeled?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${product.accent} ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_80%,white,transparent_40%)]" />
      {labeled ? (
        <p className="absolute bottom-3 left-3 font-serif text-2xl text-white/90">{product.name}</p>
      ) : null}
    </div>
  );
}

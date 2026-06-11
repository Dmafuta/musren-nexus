import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  return (
    <Link
      to="/solutions/$slug"
      params={{ slug: product.slug }}
      className="group relative rounded-2xl glass p-6 hover:bg-white/[0.06] transition-all border-gradient overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 size-48 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="size-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center mb-5">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold">{product.name}</h3>
        <p className="text-sm text-primary/80 mt-0.5">{product.tagline}</p>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">
          {product.description}
        </p>
        <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
          Explore
          <ArrowRight className="size-4" />
        </div>
      </div>
    </Link>
  );
}

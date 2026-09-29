import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, MousePointerClick, UserPlus, ShoppingCart } from "lucide-react";
import { MerchantShell } from "@/components/layouts/MerchantShell";
import { Section } from "@/components/site/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { products } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/merchant/conversions")({
  head: () => ({
    meta: [
      { title: "Conversions — Musren Merchant" },
      { name: "description", content: "Recent affiliate conversion events for your products." },
    ],
  }),
  component: ConversionsPage,
});

interface ConversionEvent {
  id: string;
  kind: "click" | "signup" | "purchase";
  product_slug: string | null;
  user_id: string | null;
  points_awarded: number;
  occurred_at: string;
}

const KIND_ICONS: Record<string, React.ReactNode> = {
  click:    <MousePointerClick className="size-3.5 text-sky-400" />,
  signup:   <UserPlus className="size-3.5 text-primary" />,
  purchase: <ShoppingCart className="size-3.5 text-emerald-400" />,
};

const KIND_STYLES: Record<string, string> = {
  click:    "bg-sky-500/10 text-sky-400 border-sky-500/30",
  signup:   "bg-primary/10 text-primary border-primary/30",
  purchase: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

function ConversionsPage() {
  const [productFilter, setProductFilter] = useState<string>("all");
  const [kindFilter, setKindFilter]       = useState<string>("all");

  const params = new URLSearchParams();
  if (productFilter !== "all") params.set("product_slug", productFilter);
  if (kindFilter !== "all")    params.set("kind", kindFilter);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-conversions", productFilter, kindFilter],
    queryFn: () => api.get<{ data: ConversionEvent[] }>(`/api/merchant/conversions${qs}`),
  });

  const rows = data?.data ?? [];

  return (
    <MerchantShell>
      <Section
        eyebrow="Merchant"
        title={<>Recent <span className="text-gradient">conversions</span></>}
        description="The last 50 affiliate events across all your products."
      >
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="glass w-52">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="glass w-40">
              <SelectValue placeholder="All kinds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="click">Clicks</SelectItem>
              <SelectItem value="signup">Signups</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border/40">
            <TrendingUp className="size-4 text-primary" />
            <span className="font-semibold">Conversion events</span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No conversion events match the selected filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Event</th>
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-right">Points</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const product = products.find((p) => p.slug === row.product_slug);
                  return (
                    <tr key={row.id} className="border-t border-border/30 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${KIND_STYLES[row.kind] ?? ""}`}>
                          {KIND_ICONS[row.kind]}
                          <span className="capitalize">{row.kind}</span>
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{product?.name ?? row.product_slug ?? "—"}</div>
                        {row.product_slug && (
                          <div className="text-xs text-muted-foreground font-mono">{row.product_slug}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-amber-400">
                        {row.points_awarded > 0 ? `+${row.points_awarded}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.occurred_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </MerchantShell>
  );
}

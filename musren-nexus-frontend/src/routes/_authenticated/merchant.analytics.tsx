import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, MousePointerClick, UserPlus, ShoppingCart, Sparkles } from "lucide-react";
import { MerchantShell } from "@/components/layouts/MerchantShell";
import { Section } from "@/components/site/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { products } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/merchant/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Musren Merchant" },
      { name: "description", content: "Affiliate conversion analytics for your products." },
    ],
  }),
  component: AnalyticsPage,
});

interface Analytics {
  totals: { clicks: number; signups: number; purchases: number; points_awarded: number };
  by_product: Array<{ product_slug: string; clicks: number; signups: number; purchases: number; points: number }>;
}

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["merchant-analytics"],
    queryFn: () => api.get<Analytics>("/api/merchant/analytics"),
  });

  const t = data?.totals;

  return (
    <MerchantShell>
      <Section
        eyebrow="Analytics"
        title={<>Conversion <span className="text-gradient">analytics</span></>}
        description="Aggregate affiliate performance across all your products."
      >
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={<MousePointerClick className="size-5 text-sky-400" />} label="Total clicks"
            value={isLoading ? null : (t?.clicks ?? 0).toLocaleString()} />
          <KpiCard icon={<UserPlus className="size-5 text-primary" />} label="Signups"
            value={isLoading ? null : (t?.signups ?? 0).toLocaleString()} />
          <KpiCard icon={<ShoppingCart className="size-5 text-emerald-400" />} label="Purchases"
            value={isLoading ? null : (t?.purchases ?? 0).toLocaleString()} />
          <KpiCard icon={<Sparkles className="size-5 text-amber-400" />} label="Points awarded"
            value={isLoading ? null : (t?.points_awarded ?? 0).toLocaleString()} />
        </div>

        {/* By product table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border/40">
            <BarChart3 className="size-4 text-primary" />
            <span className="font-semibold">Performance by product</span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (data?.by_product?.length ?? 0) === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No conversion data yet. Share referral links to start tracking.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-right">Clicks</th>
                  <th className="px-5 py-3 text-right">Signups</th>
                  <th className="px-5 py-3 text-right">Purchases</th>
                  <th className="px-5 py-3 text-right">Points paid</th>
                  <th className="px-5 py-3 text-right">Conv. rate</th>
                </tr>
              </thead>
              <tbody>
                {data?.by_product.map((row) => {
                  const product = products.find((p) => p.slug === row.product_slug);
                  const convRate = row.clicks > 0
                    ? ((row.signups / row.clicks) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={row.product_slug} className="border-t border-border/30 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-medium">{product?.name ?? row.product_slug}</div>
                        <div className="text-xs text-muted-foreground font-mono">{row.product_slug}</div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{row.clicks}</td>
                      <td className="px-5 py-3 text-right font-mono">{row.signups}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-400 font-semibold">{row.purchases}</td>
                      <td className="px-5 py-3 text-right font-mono text-amber-400">{Number(row.points).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant="outline" className={Number(convRate) >= 5
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-muted/40 text-muted-foreground"}>
                          {convRate}%
                        </Badge>
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

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-2xl font-bold font-mono">
        {value === null ? <Skeleton className="h-7 w-20" /> : value}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, MousePointerClick, UserPlus, ShoppingCart, Sparkles, Clock } from "lucide-react";
import { MerchantShell } from "@/components/layouts/MerchantShell";
import { Section } from "@/components/site/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/merchant/affiliates")({
  head: () => ({
    meta: [
      { title: "Affiliates — Musren Merchant" },
      { name: "description", content: "Top affiliate performers for your products." },
    ],
  }),
  component: MerchantAffiliatesPage,
});

interface AffiliateRow {
  user_id: string;
  clicks: number;
  signups: number;
  purchases: number;
  total_points: number;
  last_activity: string | null;
}

function MerchantAffiliatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["merchant-affiliates"],
    queryFn: () => api.get<{ data: AffiliateRow[] }>("/api/merchant/affiliates"),
  });

  const rows = data?.data ?? [];

  return (
    <MerchantShell>
      <Section
        eyebrow="Merchant"
        title={<>Top <span className="text-gradient">affiliates</span></>}
        description="Your highest-performing affiliates ranked by points earned."
      >
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border/40">
            <Users className="size-4 text-primary" />
            <span className="font-semibold">Affiliate leaderboard</span>
            {!isLoading && (
              <Badge variant="outline" className="ml-auto bg-muted/40 text-muted-foreground">
                Top {rows.length}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No affiliate activity yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Affiliate</th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <MousePointerClick className="size-3" /> Clicks
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <UserPlus className="size-3" /> Signups
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <ShoppingCart className="size-3" /> Purchases
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Sparkles className="size-3" /> Points
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Clock className="size-3" /> Last active
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.user_id} className="border-t border-border/30 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs text-muted-foreground">{row.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{row.clicks}</td>
                    <td className="px-5 py-3 text-right font-mono">{row.signups}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-400 font-semibold">{row.purchases}</td>
                    <td className="px-5 py-3 text-right font-mono text-amber-400 font-semibold">
                      {Number(row.total_points).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {row.last_activity ? new Date(row.last_activity).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </MerchantShell>
  );
}

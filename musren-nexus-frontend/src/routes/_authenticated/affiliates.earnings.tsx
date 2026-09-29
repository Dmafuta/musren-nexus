import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Sparkles, Wallet, Clock, Gift, BellRing } from "lucide-react";
import { AffiliateShell } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/affiliates/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings — Musren Affiliate" },
      { name: "description", content: "Your affiliate earnings, activity and exchange rates." },
    ],
  }),
  component: EarningsPage,
});

function EarningsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const wallet = useQuery({
    queryKey: ["aff-wallet", userId],
    enabled: !!userId,
    queryFn: () =>
      api.get<{ balance_points: number; pending_points: number; lifetime_points: number; balance_cash_cents: number }>(
        "/api/affiliate/wallet"
      ),
  });

  const events = useQuery({
    queryKey: ["aff-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/events");
      return res.data ?? [];
    },
  });

  const rates = useQuery({
    queryKey: ["aff-rates"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/rates");
      return res.data ?? [];
    },
  });

  const promotions = useQuery({
    queryKey: ["aff-promos"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/promotions");
      return res.data ?? [];
    },
  });

  const w = wallet.data;
  const cashRate = rates.data?.find((r: any) => r.kind === "cash");
  const cashEquivalent = cashRate && w
    ? Math.floor((w.balance_points / cashRate.points) * cashRate.value_amount)
    : 0;

  return (
    <AffiliateShell>
      <Section
        eyebrow="Earnings"
        title={<>Your <span className="text-gradient">earnings</span></>}
        description="Points earned per event, exchange rates and active promotions."
      >
        {/* Wallet stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Sparkles className="size-5 text-primary" />}
            label="Available points"
            value={wallet.isLoading ? null : (w?.balance_points ?? 0).toLocaleString()}
            sub={cashRate ? `≈ KES ${(cashEquivalent / 100).toFixed(2)}` : undefined}
          />
          <StatCard
            icon={<Clock className="size-5 text-amber-400" />}
            label="Pending points"
            value={wallet.isLoading ? null : (w?.pending_points ?? 0).toLocaleString()}
            sub="Held against payouts"
          />
          <StatCard
            icon={<TrendingUp className="size-5 text-emerald-400" />}
            label="Lifetime earned"
            value={wallet.isLoading ? null : (w?.lifetime_points ?? 0).toLocaleString()}
            sub="All-time total"
          />
          <StatCard
            icon={<Wallet className="size-5 text-accent" />}
            label="Cash balance"
            value={wallet.isLoading ? null : `KES ${((w?.balance_cash_cents ?? 0) / 100).toFixed(2)}`}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity events */}
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Activity history
            </h3>
            {events.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (events.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet — share a referral link to start earning points.
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {events.data?.map((e: any) => (
                  <li key={e.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className="capitalize shrink-0">{e.kind}</Badge>
                      <span className="text-muted-foreground truncate">{e.product_slug ?? "—"}</span>
                      {e.multiplier_applied && Number(e.multiplier_applied) > 1 && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 shrink-0">
                          {Number(e.multiplier_applied).toFixed(1)}× promo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-semibold text-emerald-400">+{e.points_awarded}</span>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(e.occurred_at).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            {/* Exchange rates */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Gift className="size-4 text-primary" /> Exchange rates
              </h3>
              {rates.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (rates.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No rates configured.</p>
              ) : (
                <ul className="space-y-2">
                  {rates.data?.map((r: any, i: number) => (
                    <li key={i} className="flex items-center justify-between text-sm rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                      <span className="capitalize font-medium">
                        {r.kind === "cash" ? "M-Pesa" : r.kind === "data" ? "Data" : "Airtime"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.points} pts → {r.kind === "data" ? `${r.value_amount} MB` : `KES ${(r.value_amount / 100).toFixed(2)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Active promotions */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BellRing className="size-4 text-primary" /> Active promotions
              </h3>
              {promotions.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (promotions.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No active promotions.</p>
              ) : (
                <ul className="space-y-3">
                  {promotions.data?.map((p: any) => (
                    <li key={p.id} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm">{p.name}</span>
                        <Badge className="bg-primary/15 text-primary border-primary/30 shrink-0">
                          {Number(p.multiplier).toFixed(1)}×
                        </Badge>
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                      {p.ends_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ends {new Date(p.ends_at).toLocaleString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </Section>
    </AffiliateShell>
  );
}

function StatCard({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: string | null; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-2xl font-bold font-mono">
        {value === null ? <Skeleton className="h-7 w-20" /> : value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

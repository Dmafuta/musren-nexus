import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, Sparkles, ArrowUpRight, Clock } from "lucide-react";
import { CustomerShell } from "@/components/layouts/CustomerShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/customer/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — Musren" },
      { name: "description", content: "Your loyalty points and redemption options." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const walletQuery = useQuery({
    queryKey: ["customer-wallet", userId],
    enabled: !!userId,
    queryFn: () =>
      api.get<{ balance_points: number; pending_points: number; lifetime_points: number; balance_cash_cents: number } | null>(
        "/api/customer/wallet"
      ),
  });

  const ratesQuery = useQuery({
    queryKey: ["customer-rates"],
    queryFn: () =>
      api.get<Array<{ kind: string; points: number; value_amount: number; label: string | null }>>(
        "/api/exchange-rates"
      ),
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["customer-withdrawals", userId],
    enabled: !!userId,
    queryFn: () =>
      api.get<Array<{ id: string; method: string; amount_points: number; amount_value: number; status: string; created_at: string }>>(
        "/api/customer/withdrawals"
      ),
  });

  const w = walletQuery.data;

  return (
    <CustomerShell>
      <Section
        eyebrow="Rewards"
        title={<>Your <span className="text-gradient">loyalty points</span></>}
        description="Earn points and redeem them for M-Pesa cash, airtime or data."
      >
        {/* Points stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Sparkles className="size-5 text-primary" />}
            label="Available points"
            value={walletQuery.isLoading ? null : (w?.balance_points ?? 0).toLocaleString()}
            highlight
          />
          <StatCard
            icon={<Clock className="size-5 text-amber-400" />}
            label="Pending points"
            value={walletQuery.isLoading ? null : (w?.pending_points ?? 0).toLocaleString()}
          />
          <StatCard
            icon={<Gift className="size-5 text-emerald-400" />}
            label="Lifetime earned"
            value={walletQuery.isLoading ? null : (w?.lifetime_points ?? 0).toLocaleString()}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Redemption rates */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Gift className="size-4 text-primary" /> Redemption rates
            </h3>
            {ratesQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (ratesQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No redemption options configured yet.</p>
            ) : (
              <ul className="space-y-3">
                {ratesQuery.data?.map((r, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                    <div>
                      <div className="font-medium capitalize text-sm">
                        {r.kind === "cash" ? "M-Pesa cash" : r.kind === "data" ? "Mobile data" : "Airtime"}
                      </div>
                      {r.label && <div className="text-xs text-primary/80 mt-0.5">{r.label}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-sm">
                        {r.kind === "data" ? `${r.value_amount} MB` : `KES ${(r.value_amount / 100).toFixed(2)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.points.toLocaleString()} pts</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground border-t border-border/40 pt-3">
              To redeem your points, contact{" "}
              <a href="mailto:support@musren.co.ke" className="text-primary hover:underline">
                support@musren.co.ke
              </a>
            </p>
          </div>

          {/* Redemption history */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ArrowUpRight className="size-4 text-primary" /> Redemption history
            </h3>
            {withdrawalsQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (withdrawalsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No redemptions yet.</p>
            ) : (
              <ul className="space-y-3">
                {withdrawalsQuery.data?.map((wr) => (
                  <li key={wr.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium capitalize">
                        {wr.method} · {wr.amount_points.toLocaleString()} pts
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(wr.created_at).toLocaleDateString()} ·{" "}
                        {wr.method !== "data"
                          ? `KES ${(wr.amount_value / 100).toFixed(2)}`
                          : `${wr.amount_value} MB`}
                      </div>
                    </div>
                    <StatusBadge status={wr.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </CustomerShell>
  );
}

function StatCard({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${highlight ? "bg-primary/10 border border-primary/30" : "glass"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-bold font-mono">
        {value === null ? <Skeleton className="h-8 w-24" /> : value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid"      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "approved"  ? "bg-primary/15 text-primary border-primary/30" :
    status === "pending"   ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    "bg-red-500/15 text-red-400 border-red-500/30";
  return <Badge variant="outline" className={`capitalize shrink-0 ${cls}`}>{status}</Badge>;
}

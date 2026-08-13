import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Gift, Wallet, Sparkles, Receipt, UserRound, Users, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerShell } from "@/components/layouts/CustomerShell";
import { Section } from "@/components/site/Section";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api-client";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL as string;

export const Route = createFileRoute("/_authenticated/customer/dashboard")({
  head: () => ({
    meta: [
      { title: "Customer dashboard — Musren" },
      { name: "description", content: "Your loyalty points, rewards, bundles and wallet." },
    ],
  }),
  component: CustomerDashboard,
});

function CustomerDashboard() {
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

  const ledgerQuery = useQuery({
    queryKey: ["customer-ledger", userId],
    enabled: !!userId,
    queryFn: () =>
      api.get<Array<{ id: string; amount_cents: number; kind: string; description: string | null; created_at: string }>>(
        "/api/customer/ledger"
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

  const ratesQuery = useQuery({
    queryKey: ["customer-rates"],
    queryFn: () =>
      api.get<Array<{ kind: string; points: number; value_amount: number; label: string | null }>>(
        "/api/exchange-rates"
      ),
  });

  const w = walletQuery.data;

  return (
    <CustomerShell>
      <Section
        eyebrow="Customer"
        title={<>Welcome, <span className="text-gradient">{user?.email?.split("@")[0]}</span></>}
        description="Your loyalty, rewards and account in one place."
      >
        <div className="mb-6">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Customer account</Badge>
        </div>

        {/* Wallet stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Sparkles className="size-5 text-primary" />} label="Points balance"
            value={walletQuery.isLoading ? null : (w?.balance_points ?? 0).toLocaleString()} />
          <StatCard icon={<Wallet className="size-5 text-amber-400" />} label="Pending points"
            value={walletQuery.isLoading ? null : (w?.pending_points ?? 0).toLocaleString()} />
          <StatCard icon={<Receipt className="size-5 text-emerald-400" />} label="Lifetime earned"
            value={walletQuery.isLoading ? null : (w?.lifetime_points ?? 0).toLocaleString()} />
          <StatCard icon={<Users className="size-5 text-accent" />} label="Wallet balance"
            value={walletQuery.isLoading ? null : `KES ${((w?.balance_cash_cents ?? 0) / 100).toFixed(2)}`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: transactions + withdrawals */}
          <div className="lg:col-span-2 space-y-6">
            <TopUpCard userId={userId} />

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Receipt className="size-4 text-primary" /> Recent transactions
              </h3>
              {ledgerQuery.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : ledgerQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {ledgerQuery.data?.map((tx) => {
                    const isCredit = tx.amount_cents > 0;
                    return (
                      <li key={tx.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          {isCredit
                            ? <ArrowDownLeft className="size-4 text-emerald-400 shrink-0" />
                            : <ArrowUpRight className="size-4 text-red-400 shrink-0" />}
                          <div>
                            <div className="capitalize text-xs font-medium">{tx.kind?.replace(/_/g, " ") ?? "transaction"}</div>
                            {tx.description && <div className="text-xs text-muted-foreground truncate max-w-[240px]">{tx.description}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono font-semibold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                            {isCredit ? "+" : ""}KES {(tx.amount_cents / 100).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Wallet className="size-4 text-primary" /> Withdrawal history
              </h3>
              {withdrawalsQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : withdrawalsQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {withdrawalsQuery.data?.map((wr) => (
                    <li key={wr.id} className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <div className="font-medium capitalize">{wr.method} · {wr.amount_points.toLocaleString()} pts</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(wr.created_at).toLocaleDateString()} · {wr.method !== "data"
                            ? `KES ${(wr.amount_value / 100).toFixed(2)}`
                            : `${wr.amount_value} MB`}
                        </div>
                      </div>
                      <StatusPill status={wr.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: exchange rates + quick nav */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Gift className="size-4 text-primary" /> Redemption rates
              </h3>
              {ratesQuery.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : ratesQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No redemption options configured.</p>
              ) : (
                <ul className="space-y-3">
                  {ratesQuery.data?.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium capitalize">{r.kind === "cash" ? "M-Pesa cash" : r.kind}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.points.toLocaleString()} pts → {r.kind === "data" ? `${r.value_amount} MB` : `KES ${(r.value_amount / 100).toFixed(2)}`}
                      </div>
                      {r.label && <div className="text-xs text-primary/80 mt-0.5">{r.label}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: UserRound, title: "Profile",  desc: user?.email ?? "—",         href: null },
                { icon: Users,     title: "Referrals", desc: "Invite friends, earn pts.", href: "/affiliates" },
              ].map((c) => (
                <div key={c.title} className="glass rounded-2xl p-5">
                  <c.icon className="size-5 text-primary mb-2" />
                  <div className="font-semibold text-sm">{c.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.desc}</p>
                  {c.href && (
                    <Link to={c.href} className="mt-2 text-xs text-primary hover:underline inline-block">
                      Open →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/solutions" className="text-sm text-primary hover:underline">Browse Musren solutions →</Link>
        </div>
      </Section>
    </CustomerShell>
  );
}

/* ─── Top-up Card (STK Push) ──────────────────────────────────────────────── */

function TopUpCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const topup = useMutation({
    mutationFn: async () => {
      const amountKes = parseInt(amount, 10);
      if (!phone.match(/^2547\d{8}$/) && !phone.match(/^07\d{8}$/)) {
        throw new Error("Enter a valid Kenyan phone number (07XXXXXXXX or 2547XXXXXXXX)");
      }
      if (!amountKes || amountKes < 10) throw new Error("Minimum top-up is KES 10");

      const token = getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}/api/payments/topup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amountKes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? "Top-up failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("STK Push sent — check your phone for the M-Pesa prompt");
      setPhone(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["customer-wallet", userId] });
      qc.invalidateQueries({ queryKey: ["customer-ledger", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wallet className="size-4 text-primary" /> Top up wallet
      </h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="07XXXXXXXX" className="glass" />
        <Input value={amount} onChange={(e) => setAmount(e.target.value)}
          type="number" min={10} placeholder="Amount (KES)" className="glass" />
        <Button onClick={() => topup.mutate()} disabled={topup.isPending || !phone || !amount}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          {topup.isPending ? <Loader2 className="size-4 animate-spin" /> : "Pay via M-Pesa"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">You'll receive an M-Pesa STK Push prompt on your phone.</p>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-2xl font-bold font-mono">
        {value === null ? <Skeleton className="h-7 w-20" /> : value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "paid"     ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "approved" ? "bg-primary/15 text-primary border-primary/30" :
    status === "pending"  ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    "bg-red-500/15 text-red-400 border-red-500/30";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{status}</Badge>;
}

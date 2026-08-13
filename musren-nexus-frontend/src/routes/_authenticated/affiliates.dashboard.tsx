import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, TrendingUp, Sparkles, Link2, Copy, Send, Plus, Loader2, BellRing,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { AffiliateShell as SiteLayout } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RequestRoleAccess } from "@/components/site/RequestRoleAccess";
import { RolesBadges } from "@/components/site/RolesBadges";
import { products } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliates/dashboard")({
  head: () => ({
    meta: [
      { title: "Affiliate dashboard — Musren" },
      { name: "description", content: "Earn points on every click, signup and purchase. Redeem to M-Pesa, airtime or data." },
    ],
  }),
  component: AffiliateDashboard,
});

function AffiliateDashboard() {
  const { user, hasAnyRole } = useAuth();
  const allowed = hasAnyRole(["affiliate", "admin", "staff"]);
  if (!allowed) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Affiliates"
          title="Affiliate access required"
          description="Apply to join the Musren affiliate program — earn points on clicks, signups and purchases."
        >
          <div className="space-y-5">
            <RolesBadges highlightMissing="affiliate" />
            <RequestRoleAccess role="affiliate" />
            <Link to="/affiliates"><Button variant="outline" className="glass">Back to overview</Button></Link>
          </div>
        </Section>
      </SiteLayout>
    );
  }
  if (!user) return null;
  return <DashboardContent userId={user.id} email={user.email ?? ""} />;
}

function DashboardContent({ userId, email }: { userId: string; email: string }) {
  const wallet = useQuery({
    queryKey: ["aff-wallet", userId],
    queryFn: () => api.get<{ balance_points: number; pending_points: number; lifetime_points: number; balance_cash_cents: number }>("/api/affiliate/wallet"),
  });

  const promotions = useQuery({
    queryKey: ["aff-promos"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/promotions");
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

  const events = useQuery({
    queryKey: ["aff-events", userId],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/events");
      return res.data ?? [];
    },
  });

  const withdrawals = useQuery({
    queryKey: ["aff-withdrawals", userId],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/withdrawals");
      return res.data ?? [];
    },
  });

  const notifications = useQuery({
    queryKey: ["aff-notifications", userId],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/notifications");
      return res.data ?? [];
    },
  });

  const w = wallet.data ?? { balance_points: 0, pending_points: 0, lifetime_points: 0, balance_cash_cents: 0 };
  const cashRate = rates.data?.find((r: any) => r.kind === "cash");
  const cashEquivalent = cashRate ? Math.floor((w.balance_points / cashRate.points) * cashRate.value_amount) : 0;

  return (
    <SiteLayout>
      <Section
        eyebrow="Affiliates"
        title={<>Welcome back, <span className="text-gradient">{email.split("@")[0]}</span></>}
        description="Track points, share referral links and redeem rewards."
      >
        <div className="mb-6"><RolesBadges /></div>

        {/* Products to promote */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Promote a product</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.slug}
                  to="/affiliates/promote/$slug"
                  params={{ slug: p.slug }}
                  className="group glass rounded-xl p-4 hover:bg-white/[0.06] transition flex items-start gap-3 border border-border/50 hover:border-primary/40"
                >
                  <div className="size-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center shrink-0">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{p.tagline}</div>
                    <div className="mt-2 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition">Promote →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Wallet summary */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Wallet className="size-5 text-primary" />} label="Available points" value={w.balance_points.toLocaleString()} sub={cashRate ? `≈ KES ${(cashEquivalent / 100).toFixed(2)}` : undefined} />
          <StatCard icon={<Sparkles className="size-5 text-amber-400" />} label="Pending payout" value={w.pending_points.toLocaleString()} sub="Held against withdrawals" />
          <StatCard icon={<TrendingUp className="size-5 text-emerald-400" />} label="Lifetime earned" value={w.lifetime_points.toLocaleString()} sub="All-time points" />
          <StatCard icon={<BellRing className="size-5 text-accent" />} label="Active promotions" value={(promotions.data?.length ?? 0).toString()} sub="Boosted earnings" />
        </div>

        {/* Active promotions */}
        {promotions.data && promotions.data.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active promotions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {promotions.data.map((p: any) => (
                <div key={p.id} className="glass rounded-xl p-4 border border-primary/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{p.name}</div>
                    <Badge className="bg-primary/15 text-primary border-primary/30">{Number(p.multiplier).toFixed(1)}×</Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  {p.ends_at && <div className="mt-2 text-xs text-muted-foreground">Ends {new Date(p.ends_at).toLocaleString()}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left col: links + events */}
          <div className="lg:col-span-2 space-y-6">
            <ReferralLinksCard userId={userId} />

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Recent activity</h3>
              {events.isLoading ? <SkeletonRow /> : events.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet — share a referral link to start earning.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {events.data?.map((e: any) => (
                    <li key={e.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">{e.kind}</Badge>
                        <span className="text-muted-foreground">{e.product_slug ?? "—"}</span>
                        {e.multiplier_applied && Number(e.multiplier_applied) > 1 && (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">{Number(e.multiplier_applied).toFixed(1)}× promo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-emerald-400">+{e.points_awarded}</span>
                        <span className="text-xs text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right col: redeem + notifications */}
          <div className="space-y-6">
            <RedeemCard userId={userId} balance={w.balance_points} rates={rates.data ?? []} />

            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Recent withdrawals</h3>
              {withdrawals.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
              ) : (
                <ul className="space-y-3">
                  {withdrawals.data?.map((wr: any) => (
                    <li key={wr.id} className="text-sm flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium capitalize">{wr.method} • {wr.amount_points} pts</div>
                        <div className="text-xs text-muted-foreground">{new Date(wr.created_at).toLocaleDateString()}</div>
                      </div>
                      <StatusPill status={wr.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notifications.data && notifications.data.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><BellRing className="size-4 text-accent" /> Notifications</h3>
                <ul className="space-y-3">
                  {notifications.data.map((n: any) => (
                    <li key={n.id} className="text-sm">
                      <div className="font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold font-mono">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "paid" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "approved" ? "bg-primary/15 text-primary border-primary/30" :
    status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    status === "rejected" || status === "failed" ? "bg-red-500/15 text-red-400 border-red-500/30" :
    "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{status}</Badge>;
}

function SkeletonRow() {
  return <div className="h-16 rounded-lg bg-muted/30 animate-pulse" />;
}

function ReferralLinksCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [productSlug, setProductSlug] = useState<string>("");

  const codes = useQuery({
    queryKey: ["aff-codes", userId],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/codes");
      return res.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const c = code.trim();
      if (!c.match(/^[a-zA-Z0-9_-]{3,32}$/)) throw new Error("Code must be 3–32 chars: letters, numbers, _ or -");
      await api.post("/api/affiliate/codes", { code: c, product_slug: productSlug || null });
    },
    onSuccess: () => {
      toast.success("Referral code created");
      setCode("");
      qc.invalidateQueries({ queryKey: ["aff-codes", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Link2 className="size-4 text-primary" /> Referral links</h3>
      <div className="grid sm:grid-cols-[1fr,200px,auto] gap-2 mb-4">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="your-code" className="glass" />
        <Select value={productSlug} onValueChange={setProductSlug}>
          <SelectTrigger className="glass"><SelectValue placeholder="Any product" /></SelectTrigger>
          <SelectContent>
            {products.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1" /> Create</>}
        </Button>
      </div>
      {codes.isLoading ? <SkeletonRow /> : codes.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes yet — create one to start sharing.</p>
      ) : (
        <ul className="space-y-2">
          {codes.data?.map((c: any) => {
            const link = `${origin}/api/public/r/${c.code}${c.product_slug ? `?p=${c.product_slug}` : ""}`;
            return (
              <li key={c.id} className="flex items-center gap-2 text-sm bg-background/40 rounded-lg p-2 border border-border/50">
                <code className="font-mono text-xs truncate flex-1">{link}</code>
                {c.product_slug && <Badge variant="outline" className="text-xs">{c.product_slug}</Badge>}
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
                  <Copy className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RedeemCard({ userId, balance, rates }: { userId: string; balance: number; rates: any[] }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<"mpesa" | "airtime" | "data">("mpesa");
  const [amount, setAmount] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  const rateKind = method === "mpesa" ? "cash" : method;
  const rate = rates.find((r: any) => r.kind === rateKind);
  const points = parseInt(amount || "0", 10) || 0;
  const projected = rate && points > 0 ? Math.floor((points / rate.points) * rate.value_amount) : 0;
  const valueLabel = method === "data" ? `${projected} MB` : `KES ${(projected / 100).toFixed(2)}`;

  const submit = useMutation({
    mutationFn: async () => {
      if (points <= 0) throw new Error("Enter a points amount");
      await api.post("/api/affiliate/withdraw", {
        method, amount_points: points, destination: destination || null,
      });
    },
    onSuccess: () => {
      toast.success("Withdrawal submitted");
      setAmount(""); setDestination("");
      qc.invalidateQueries({ queryKey: ["aff-wallet", userId] });
      qc.invalidateQueries({ queryKey: ["aff-withdrawals", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Send className="size-4 text-primary" /> Redeem points</h3>
      <div className="space-y-3">
        <Select value={method} onValueChange={(v) => setMethod(v as any)}>
          <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mpesa">M-Pesa cash</SelectItem>
            <SelectItem value="airtime">Airtime</SelectItem>
            <SelectItem value="data">Data bundle</SelectItem>
          </SelectContent>
        </Select>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} placeholder="Points to redeem" className="glass" />
        <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination phone (e.g. 2547…)" className="glass" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Available: <span className="font-mono text-foreground">{balance.toLocaleString()} pts</span></span>
          <span>You'll receive: <span className="font-mono text-foreground">{valueLabel}</span></span>
        </div>
        <Button onClick={() => submit.mutate()} disabled={submit.isPending || points <= 0 || points > balance}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
          {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit withdrawal"}
        </Button>
      </div>
    </div>
  );
}

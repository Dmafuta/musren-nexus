import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, ArrowDownLeft, Loader2 } from "lucide-react";
import { CustomerShell } from "@/components/layouts/CustomerShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customer/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Musren" },
      { name: "description", content: "Top up and manage your Musren wallet." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
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
        eyebrow="Wallet"
        title={<>Your <span className="text-gradient">wallet</span></>}
        description="Top up via M-Pesa and track your balance."
      >
        {/* Balance card */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Cash balance</div>
            <div className="mt-2 font-display text-4xl font-bold font-mono">
              {walletQuery.isLoading
                ? <Skeleton className="h-10 w-32" />
                : `KES ${((w?.balance_cash_cents ?? 0) / 100).toFixed(2)}`}
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Loyalty points</div>
            <div className="mt-2 font-display text-4xl font-bold font-mono">
              {walletQuery.isLoading
                ? <Skeleton className="h-10 w-24" />
                : (w?.balance_points ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top-up form */}
          <TopUpCard userId={userId} />

          {/* Withdrawal history */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ArrowDownLeft className="size-4 text-primary" /> Withdrawal history
            </h3>
            {withdrawalsQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (withdrawalsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
            ) : (
              <ul className="space-y-3 divide-y divide-border/40">
                {withdrawalsQuery.data?.map((wr) => (
                  <li key={wr.id} className="flex items-center justify-between gap-3 pt-3 first:pt-0 text-sm">
                    <div>
                      <div className="font-medium capitalize">{wr.method}</div>
                      <div className="text-xs text-muted-foreground">
                        {wr.amount_points.toLocaleString()} pts ·{" "}
                        {wr.method !== "data"
                          ? `KES ${(wr.amount_value / 100).toFixed(2)}`
                          : `${wr.amount_value} MB`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(wr.created_at).toLocaleString()}
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

function TopUpCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const topup = useMutation({
    mutationFn: async () => {
      if (!phone.match(/^2547\d{8}$/) && !phone.match(/^07\d{8}$/)) {
        throw new Error("Enter a valid Kenyan phone number (07XXXXXXXX or 2547XXXXXXXX)");
      }
      const amountKes = parseInt(amount, 10);
      if (!amountKes || amountKes < 10) throw new Error("Minimum top-up is KES 10");

      const token = getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/payments/topup", {
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
      setPhone("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["customer-wallet", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wallet className="size-4 text-primary" /> Top up via M-Pesa
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Phone number</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            className="glass mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Amount (KES)</label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={10}
            placeholder="e.g. 500"
            className="glass mt-1"
          />
        </div>
        <Button
          onClick={() => topup.mutate()}
          disabled={topup.isPending || !phone || !amount}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
        >
          {topup.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Pay via M-Pesa
        </Button>
        <p className="text-xs text-muted-foreground">
          You'll receive an M-Pesa STK Push prompt on your phone. Minimum KES 10.
        </p>
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

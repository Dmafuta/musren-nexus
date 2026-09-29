import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Clock, Loader2 } from "lucide-react";
import { AffiliateShell } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliates/withdrawals")({
  head: () => ({
    meta: [
      { title: "Withdrawals — Musren Affiliate" },
      { name: "description", content: "Redeem your points to M-Pesa, airtime or data." },
    ],
  }),
  component: WithdrawalsPage,
});

function WithdrawalsPage() {
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

  const rates = useQuery({
    queryKey: ["aff-rates"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/rates");
      return res.data ?? [];
    },
  });

  const withdrawals = useQuery({
    queryKey: ["aff-withdrawals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/withdrawals");
      return res.data ?? [];
    },
  });

  const balance = wallet.data?.balance_points ?? 0;
  const pending = wallet.data?.pending_points ?? 0;

  return (
    <AffiliateShell>
      <Section
        eyebrow="Withdrawals"
        title={<>Redeem your <span className="text-gradient">points</span></>}
        description="Convert earned points to M-Pesa cash, airtime or data bundles."
      >
        {/* Balance summary */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Available to redeem</div>
            <div className="mt-2 font-display text-3xl font-bold font-mono">
              {wallet.isLoading ? <Skeleton className="h-8 w-24" /> : balance.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">pts</span>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending payout</div>
            <div className="mt-2 font-display text-3xl font-bold font-mono text-amber-400">
              {wallet.isLoading ? <Skeleton className="h-8 w-24" /> : pending.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">pts</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Redeem form */}
          {!wallet.isLoading && !rates.isLoading && (
            <RedeemCard userId={userId} balance={balance} rates={rates.data ?? []} />
          )}

          {/* Withdrawal history */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Withdrawal history
            </h3>
            {withdrawals.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (withdrawals.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawals yet. Redeem your first points now.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {withdrawals.data?.map((wr: any) => (
                  <li key={wr.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium capitalize">{wr.method}</div>
                      <div className="text-xs text-muted-foreground">
                        {wr.amount_points.toLocaleString()} pts ·{" "}
                        {wr.method === "data"
                          ? `${wr.amount_value} MB`
                          : `KES ${(wr.amount_value / 100).toFixed(2)}`}
                      </div>
                      {wr.destination && (
                        <div className="text-xs text-muted-foreground font-mono">{wr.destination}</div>
                      )}
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
    </AffiliateShell>
  );
}

function RedeemCard({ userId, balance, rates }: { userId: string; balance: number; rates: any[] }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<"mpesa" | "airtime" | "data">("mpesa");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");

  const rateKind = method === "mpesa" ? "cash" : method;
  const rate = rates.find((r: any) => r.kind === rateKind);
  const points = parseInt(amount || "0", 10) || 0;
  const projected = rate && points > 0 ? Math.floor((points / rate.points) * rate.value_amount) : 0;
  const valueLabel = method === "data" ? `${projected} MB` : `KES ${(projected / 100).toFixed(2)}`;

  const submit = useMutation({
    mutationFn: async () => {
      if (points <= 0) throw new Error("Enter a points amount");
      if (points > balance) throw new Error("Insufficient points balance");
      await api.post("/api/affiliate/withdraw", {
        method, amount_points: points, destination: destination || null,
      });
    },
    onSuccess: () => {
      toast.success("Withdrawal submitted — you'll be notified when processed");
      setAmount("");
      setDestination("");
      qc.invalidateQueries({ queryKey: ["aff-wallet", userId] });
      qc.invalidateQueries({ queryKey: ["aff-withdrawals", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Send className="size-4 text-primary" /> Redeem points
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Redemption method</label>
          <Select value={method} onValueChange={(v) => setMethod(v as any)}>
            <SelectTrigger className="glass mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mpesa">M-Pesa cash</SelectItem>
              <SelectItem value="airtime">Airtime</SelectItem>
              <SelectItem value="data">Data bundle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Points to redeem</label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={1}
            placeholder="e.g. 500"
            className="glass mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">
            Destination phone <span className="opacity-60">(optional — defaults to your number)</span>
          </label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="glass mt-1"
          />
        </div>
        {rate && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground">
              Rate: <span className="font-mono text-foreground">{rate.points} pts = {method === "data" ? `${rate.value_amount} MB` : `KES ${(rate.value_amount / 100).toFixed(2)}`}</span>
            </span>
            <span className="text-muted-foreground">
              You'll get: <span className="font-mono text-emerald-400 font-semibold">{valueLabel}</span>
            </span>
          </div>
        )}
        <Button
          onClick={() => submit.mutate()}
          disabled={submit.isPending || points <= 0 || points > balance}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
        >
          {submit.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Submit withdrawal
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid"     ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "approved" ? "bg-primary/15 text-primary border-primary/30" :
    status === "pending"  ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    "bg-red-500/15 text-red-400 border-red-500/30";
  return <Badge variant="outline" className={`capitalize shrink-0 ${cls}`}>{status}</Badge>;
}

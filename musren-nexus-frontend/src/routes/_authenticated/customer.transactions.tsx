import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { CustomerShell } from "@/components/layouts/CustomerShell";
import { Section } from "@/components/site/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/customer/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Musren" },
      { name: "description", content: "Your full transaction ledger." },
    ],
  }),
  component: TransactionsPage,
});

interface LedgerEntry {
  id: string;
  amount_cents: number;
  kind: string;
  description: string | null;
  created_at: string;
}

function TransactionsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const ledgerQuery = useQuery({
    queryKey: ["customer-ledger", userId],
    enabled: !!userId,
    queryFn: () => api.get<LedgerEntry[]>("/api/customer/ledger"),
  });

  const total = (ledgerQuery.data ?? []).reduce((sum, t) => sum + t.amount_cents, 0);

  return (
    <CustomerShell>
      <Section
        eyebrow="Transactions"
        title={<>Transaction <span className="text-gradient">history</span></>}
        description="A full record of credits and debits on your account."
      >
        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total transactions</div>
            <div className="mt-2 font-display text-3xl font-bold">
              {ledgerQuery.isLoading ? <Skeleton className="h-8 w-12" /> : (ledgerQuery.data?.length ?? 0)}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total credits</div>
            <div className="mt-2 font-display text-3xl font-bold font-mono text-emerald-400">
              {ledgerQuery.isLoading
                ? <Skeleton className="h-8 w-28" />
                : `KES ${((ledgerQuery.data ?? []).filter(t => t.amount_cents > 0).reduce((s, t) => s + t.amount_cents, 0) / 100).toFixed(2)}`}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Net balance</div>
            <div className={`mt-2 font-display text-3xl font-bold font-mono ${total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {ledgerQuery.isLoading
                ? <Skeleton className="h-8 w-28" />
                : `KES ${(total / 100).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Ledger table */}
        <div className="glass rounded-2xl overflow-hidden">
          {ledgerQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (ledgerQuery.data?.length ?? 0) === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="size-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Top up your wallet to get started.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {ledgerQuery.data?.map((tx) => {
                  const isCredit = tx.amount_cents > 0;
                  return (
                    <tr key={tx.id} className="border-t border-border/30 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isCredit
                            ? <ArrowDownLeft className="size-4 text-emerald-400 shrink-0" />
                            : <ArrowUpRight className="size-4 text-red-400 shrink-0" />}
                          <span className="capitalize font-medium">
                            {tx.kind?.replace(/_/g, " ") ?? "transaction"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {tx.description ?? "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                        {isCredit ? "+" : ""}KES {(tx.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </CustomerShell>
  );
}

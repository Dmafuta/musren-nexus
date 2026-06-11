import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Loader2 } from "lucide-react";
import { MerchantShell } from "@/components/layouts/MerchantShell";
import { Section } from "@/components/site/Section";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { RolesBadges } from "@/components/site/RolesBadges";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/merchant/reward-config")({
  head: () => ({
    meta: [
      { title: "Reward configuration — Musren" },
      { name: "description", content: "Manage reward rules for your products." },
    ],
  }),
  component: RewardConfigPage,
});

interface RewardRule {
  id: string;
  product_slug: string;
  click_points: number;
  signup_points: number;
  purchase_points: number;
  revenue_share_bps: number;
  max_daily_points: number | null;
  active: boolean;
  created_at: string;
}

interface EditForm {
  click_points: number;
  signup_points: number;
  purchase_points: number;
  revenue_share_bps: number;
  max_daily_points: number | null;
}

function RewardConfigPage() {
  const { hasAnyRole } = useAuth();
  const allowed = hasAnyRole(["merchant", "admin", "superadmin"]);

  if (!allowed) {
    return (
      <MerchantShell>
        <Section
          eyebrow="Merchant"
          title="Merchant access required"
          description="You need merchant, admin or superadmin access to view reward configuration."
        >
          <div className="space-y-5">
            <RolesBadges highlightMissing="merchant" />
            <Link to="/contact">
              <Button variant="outline" className="glass">Contact support</Button>
            </Link>
          </div>
        </Section>
      </MerchantShell>
    );
  }

  return (
    <MerchantShell>
      <Section
        eyebrow="Merchant"
        title="Reward configuration"
        description="Set per-product reward rules for clicks, signups and purchases."
      >
        <div className="mb-6">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Merchant account</Badge>
        </div>
        <RewardRulesTable />
      </Section>
    </MerchantShell>
  );
}

function RewardRulesTable() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<RewardRule | null>(null);
  const [form, setForm] = useState<EditForm>({
    click_points: 0,
    signup_points: 0,
    purchase_points: 0,
    revenue_share_bps: 0,
    max_daily_points: null,
  });

  const rulesQuery = useQuery<RewardRule[]>({
    queryKey: ["merchant-reward-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_reward_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EditForm }) => {
      const { error } = await (supabase as any)
        .from("affiliate_reward_rules")
        .update({
          click_points: values.click_points,
          signup_points: values.signup_points,
          purchase_points: values.purchase_points,
          revenue_share_bps: values.revenue_share_bps,
          max_daily_points: values.max_daily_points,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward rule updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["merchant-reward-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (rule: RewardRule) => {
    setEditing(rule);
    setForm({
      click_points: rule.click_points,
      signup_points: rule.signup_points,
      purchase_points: rule.purchase_points,
      revenue_share_bps: rule.revenue_share_bps,
      max_daily_points: rule.max_daily_points,
    });
  };

  const formatBps = (bps: number) => `${bps} bps (${(bps / 100).toFixed(2)}%)`;

  return (
    <div className="glass rounded-2xl p-6">
      {rulesQuery.isLoading ? (
        <div className="h-32 rounded-lg bg-muted/30 animate-pulse" />
      ) : rulesQuery.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reward rules configured yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product slug</TableHead>
              <TableHead>Click pts</TableHead>
              <TableHead>Signup pts</TableHead>
              <TableHead>Purchase pts</TableHead>
              <TableHead>Rev share</TableHead>
              <TableHead>Max daily pts</TableHead>
              <TableHead>Active</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rulesQuery.data?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-mono text-xs">{rule.product_slug}</TableCell>
                <TableCell>{rule.click_points}</TableCell>
                <TableCell>{rule.signup_points}</TableCell>
                <TableCell>{rule.purchase_points}</TableCell>
                <TableCell className="text-xs">{formatBps(rule.revenue_share_bps)}</TableCell>
                <TableCell>{rule.max_daily_points ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={rule.active
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground"}>
                    {rule.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit reward rule — {editing?.product_slug}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <NumField label="Click points" value={form.click_points}
              onChange={(v) => setForm((f) => ({ ...f, click_points: v }))} />
            <NumField label="Signup points" value={form.signup_points}
              onChange={(v) => setForm((f) => ({ ...f, signup_points: v }))} />
            <NumField label="Purchase points" value={form.purchase_points}
              onChange={(v) => setForm((f) => ({ ...f, purchase_points: v }))} />
            <NumField label="Revenue share (bps)" value={form.revenue_share_bps}
              onChange={(v) => setForm((f) => ({ ...f, revenue_share_bps: v }))} />
            <div className="col-span-2">
              <Label>Max daily points (blank = unlimited)</Label>
              <Input
                type="number"
                min={0}
                value={form.max_daily_points ?? ""}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  max_daily_points: e.target.value === "" ? null : Number(e.target.value),
                }))}
                className="mt-1.5 glass"
                placeholder="Unlimited"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => editing && updateMutation.mutate({ id: editing.id, values: form })}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 glass"
      />
    </div>
  );
}

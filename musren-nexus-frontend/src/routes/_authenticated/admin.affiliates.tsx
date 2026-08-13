import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Settings2, Sparkles, Coins, Trophy, Wallet, Plus, Save, CheckCircle2, XCircle, Loader2,
  ImageIcon, Megaphone, Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { products } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/affiliates")({
  head: () => ({ meta: [{ title: "Affiliate admin — Musren" }] }),
  component: AffiliateAdminPage,
});

function AffiliateAdminPage() {
  const { hasAnyRole, hasRole, loading } = useAuth();
  if (loading) return <SiteLayout><Section title="Loading…" /></SiteLayout>;
  if (!hasAnyRole(["admin", "staff", "superadmin"])) {
    return (
      <SiteLayout>
        <Section eyebrow="Admin" title="Staff access required" description="You need admin or staff role to manage affiliates.">
          <Link to="/"><Button variant="outline" className="glass">Back home</Button></Link>
        </Section>
      </SiteLayout>
    );
  }
  return (
    <SiteLayout>
      <Section eyebrow="Admin" title="Affiliate engine" description="Configure rewards, promotions, exchange rates, withdrawals and view rankings.">
        <div className="mb-6">
          <Link to="/admin/role-requests" className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to admin
          </Link>
        </div>
        <Tabs defaultValue="rules">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
            <TabsTrigger value="rules"><Settings2 className="size-4 mr-1.5" />Rules</TabsTrigger>
            <TabsTrigger value="assets"><ImageIcon className="size-4 mr-1.5" />Assets</TabsTrigger>
            <TabsTrigger value="templates"><Megaphone className="size-4 mr-1.5" />Templates</TabsTrigger>
            <TabsTrigger value="promos"><Sparkles className="size-4 mr-1.5" />Promotions</TabsTrigger>
            <TabsTrigger value="rates"><Coins className="size-4 mr-1.5" />Exchange</TabsTrigger>
            <TabsTrigger value="withdrawals"><Wallet className="size-4 mr-1.5" />Payouts</TabsTrigger>
            <TabsTrigger value="board"><Trophy className="size-4 mr-1.5" />Leaderboard</TabsTrigger>
          </TabsList>
          <TabsContent value="rules" className="mt-6"><RulesTab canEdit={hasRole("admin")} /></TabsContent>
          <TabsContent value="assets" className="mt-6"><AssetsTab canEdit={hasRole("admin")} /></TabsContent>
          <TabsContent value="templates" className="mt-6"><TemplatesTab canEdit={hasRole("admin")} /></TabsContent>
          <TabsContent value="promos" className="mt-6"><PromotionsTab canEdit={hasRole("admin")} /></TabsContent>
          <TabsContent value="rates" className="mt-6"><RatesTab canEdit={hasRole("admin")} /></TabsContent>
          <TabsContent value="withdrawals" className="mt-6"><WithdrawalsTab /></TabsContent>
          <TabsContent value="board" className="mt-6"><LeaderboardTab /></TabsContent>
        </Tabs>
      </Section>
    </SiteLayout>
  );
}

/* ============ Reward Rules ============ */
function RulesTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["aff-admin-rules"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/admin/affiliate-reward-rules");
      return res.data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      await api.post("/api/admin/affiliate-reward-rules", row);
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["aff-admin-rules"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const existingSlugs = new Set(rules.map((r: any) => r.product_slug));
  const allRows = [
    ...rules,
    ...products.filter((p) => !existingSlugs.has(p.slug)).map((p) => ({
      product_slug: p.slug, click_points: 0, signup_points: 0, purchase_points: 0,
      revenue_share_bps: 0, max_daily_points: null, active: true,
    })),
  ].sort((a: any, b: any) => a.product_slug.localeCompare(b.product_slug));

  if (isLoading) return <Sk />;
  return (
    <div className="space-y-3">
      {allRows.map((r: any) => <RuleRow key={r.product_slug} row={r} canEdit={canEdit} onSave={(x) => upsert.mutate(x)} busy={upsert.isPending} />)}
    </div>
  );
}

function RuleRow({ row, canEdit, onSave, busy }: { row: any; canEdit: boolean; onSave: (r: any) => void; busy: boolean }) {
  const [r, setR] = useState(row);
  const product = products.find((p) => p.slug === r.product_slug);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div className="font-semibold">{product?.name ?? r.product_slug}</div>
          <div className="text-xs text-muted-foreground font-mono">{r.product_slug}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Active</span>
            <Switch checked={r.active} onCheckedChange={(v) => setR({ ...r, active: v })} disabled={!canEdit} />
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => onSave(r)} disabled={busy}><Save className="size-3.5 mr-1.5" />Save</Button>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="Click pts" value={r.click_points} onChange={(v) => setR({ ...r, click_points: +v })} disabled={!canEdit} />
        <Field label="Signup pts" value={r.signup_points} onChange={(v) => setR({ ...r, signup_points: +v })} disabled={!canEdit} />
        <Field label="Purchase pts" value={r.purchase_points} onChange={(v) => setR({ ...r, purchase_points: +v })} disabled={!canEdit} />
        <Field label="Revenue share (bps)" value={r.revenue_share_bps} onChange={(v) => setR({ ...r, revenue_share_bps: +v })} disabled={!canEdit} />
        <Field label="Max daily pts" value={r.max_daily_points ?? ""} onChange={(v) => setR({ ...r, max_daily_points: v ? +v : null })} disabled={!canEdit} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: any; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="glass" />
    </label>
  );
}

/* ============ Promotions ============ */
function PromotionsTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: promos = [] } = useQuery({
    queryKey: ["aff-admin-promos"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/admin/affiliate-promotions");
      return res.data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.patch(`/api/admin/affiliate-promotions/${id}`, { active });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aff-admin-promos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <Button onClick={() => setOpen(!open)} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> {open ? "Cancel" : "New promotion"}
        </Button>
      )}
      {open && <NewPromotionForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["aff-admin-promos"] }); }} />}
      {promos.length === 0 ? <Empty msg="No promotions yet." /> : promos.map((p: any) => (
        <div key={p.id} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">{p.name}
                <Badge className="bg-primary/15 text-primary border-primary/30">{Number(p.multiplier).toFixed(2)}×</Badge>
                {p.public_visible && <Badge variant="outline" className="text-xs">visible</Badge>}
              </div>
              {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
              <div className="text-xs text-muted-foreground mt-2">
                {p.starts_at ? new Date(p.starts_at).toLocaleString() : "—"} → {p.ends_at ? new Date(p.ends_at).toLocaleString() : "no end"}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 text-xs">Active
                <Switch checked={p.active} onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewPromotionForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", multiplier: "2",
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: "", public_visible: true,
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      await api.post("/api/admin/affiliate-promotions", {
        name: form.name, description: form.description || null,
        multiplier: parseFloat(form.multiplier),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        public_visible: form.public_visible, active: true,
      });
    },
    onSuccess: () => { toast.success("Promotion created"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Promotion name" className="glass" />
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="glass" />
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Multiplier</span>
          <Input type="number" step="0.5" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} className="glass" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Starts</span>
          <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="glass" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Ends (optional)</span>
          <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="glass" /></label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">Public visible <Switch checked={form.public_visible} onCheckedChange={(v) => setForm({ ...form, public_visible: v })} /></label>
      </div>
      <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create promotion"}
      </Button>
    </div>
  );
}

/* ============ Exchange Rates ============ */
function RatesTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: rates = [] } = useQuery({
    queryKey: ["aff-admin-rates"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/admin/affiliate-rates");
      return res.data ?? [];
    },
  });
  const [form, setForm] = useState({ kind: "cash", points: "100", value_amount: "1000", label: "" });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/api/admin/affiliate-rates", {
        kind: form.kind, points: +form.points, value_amount: +form.value_amount,
        label: form.label || null, active: true,
      });
    },
    onSuccess: () => { toast.success("Rate added"); qc.invalidateQueries({ queryKey: ["aff-admin-rates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.patch(`/api/admin/affiliate-rates/${id}`, { active });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aff-admin-rates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="glass rounded-2xl p-5 grid sm:grid-cols-5 gap-3 items-end">
          <label className="space-y-1"><span className="text-xs text-muted-foreground">Kind</span>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash (cents)</SelectItem>
                <SelectItem value="airtime">Airtime (cents)</SelectItem>
                <SelectItem value="data">Data (MB)</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Field label="Points" value={form.points} onChange={(v) => setForm({ ...form, points: v })} />
          <Field label="Value amount" value={form.value_amount} onChange={(v) => setForm({ ...form, value_amount: v })} />
          <label className="space-y-1 sm:col-span-2"><span className="text-xs text-muted-foreground">Label</span>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="glass" placeholder="e.g. Weekend boost: 2× cash" />
          </label>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-to-r from-primary to-accent text-primary-foreground sm:col-span-5">
            <Plus className="size-4 mr-1.5" /> Add rate
          </Button>
        </div>
      )}
      {rates.map((r: any) => (
        <div key={r.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium capitalize">{r.kind}: {r.points} pts → {r.value_amount} {r.kind === "data" ? "MB" : "cents"}</div>
            {r.label && <div className="text-xs text-muted-foreground">{r.label}</div>}
            <div className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
          </div>
          {canEdit && <Switch checked={r.active} onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })} />}
        </div>
      ))}
    </div>
  );
}

/* ============ Withdrawals queue ============ */
function WithdrawalsTab() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "processing" | "rejected">("pending");
  const { data: list = [] } = useQuery({
    queryKey: ["aff-admin-withdrawals", tab],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>(`/api/admin/affiliate-withdrawals?status=${tab}`);
      return res.data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/affiliate-withdrawals/${id}/approve`, {}),
    onSuccess: () => { toast.success("Marked as processing"); qc.invalidateQueries({ queryKey: ["aff-admin-withdrawals"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/api/admin/affiliate-withdrawals/${id}/reject`, { reason }),
    onSuccess: () => { toast.success("Rejected — points refunded"); qc.invalidateQueries({ queryKey: ["aff-admin-withdrawals"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList className="grid grid-cols-3 max-w-md">
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="processing">Processing</TabsTrigger>
        <TabsTrigger value="rejected">Rejected</TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-4 space-y-3">
        {list.length === 0 ? <Empty msg={`No ${tab} withdrawals.`} /> : list.map((w: any) => (
          <WithdrawalRow
            key={w.id}
            w={w}
            onApprove={() => approve.mutate(w.id)}
            onReject={(r) => reject.mutate({ id: w.id, reason: r })}
            busy={approve.isPending || reject.isPending}
            canAct={tab === "pending"}
          />
        ))}
      </TabsContent>
    </Tabs>
  );
}

function WithdrawalRow({ w, onApprove, onReject, busy, canAct }: { w: any; onApprove: () => void; onReject: (reason: string) => void; busy: boolean; canAct: boolean }) {
  const [reason, setReason] = useState("");
  const valueLabel = w.method === "data" ? `${w.amount_value} MB` : `KES ${(w.amount_value / 100).toFixed(2)}`;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="font-semibold capitalize">{w.method} • {w.amount_points} pts → {valueLabel}</div>
          <div className="text-xs text-muted-foreground font-mono break-all">user: {w.user_id}</div>
          {w.phone && <div className="text-xs text-muted-foreground">to: {w.phone}</div>}
          <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
        </div>
        <Badge variant="outline" className="capitalize">{w.status}</Badge>
      </div>
      {canAct && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Button size="sm" disabled={busy} onClick={onApprove} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {busy ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Mark as processing
            </Button>
          </div>
          <div className="space-y-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" className="glass" />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject(reason)} className="glass">
              <XCircle className="size-4 mr-1.5" /> Reject & refund
            </Button>
          </div>
        </div>
      )}
      {w.payout_ref && <div className="mt-2 text-xs text-muted-foreground">ref: <span className="font-mono">{w.payout_ref}</span></div>}
      {w.notes && <div className="mt-2 text-xs text-muted-foreground">notes: {w.notes}</div>}
    </div>
  );
}

/* ============ Leaderboard ============ */
function LeaderboardTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["aff-admin-board"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/admin/affiliate-leaderboard");
      return res.data ?? [];
    },
  });
  if (isLoading) return <Sk />;
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-semibold flex items-center gap-2"><Trophy className="size-4 text-primary" /> Top affiliates — last 7 days</h3>
        <p className="text-xs text-muted-foreground mt-1">Admin/staff only. Affiliates do not see this view.</p>
      </div>
      {rows.length === 0 ? <Empty msg="No activity in the last 7 days." /> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr><th className="px-4 py-2 text-left">#</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-right">Clicks</th><th className="px-4 py-2 text-right">Signups</th><th className="px-4 py-2 text-right">Purchases</th><th className="px-4 py-2 text-right">Points</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.user_id} className="border-t border-border/30">
                <td className="px-4 py-2">{i + 1}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.user_id}</td>
                <td className="px-4 py-2 text-right">{r.clicks}</td>
                <td className="px-4 py-2 text-right">{r.signups}</td>
                <td className="px-4 py-2 text-right">{r.purchases}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ============ helpers ============ */
function Sk() { return <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />; }
function Empty({ msg }: { msg: string }) { return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">{msg}</div>; }

/* ============ Assets ============ */
const ASSET_KINDS = ["poster","logo","video","sms_template","whatsapp_template","email_copy","social_caption","script","other"] as const;

function AssetsTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [productSlug, setProductSlug] = useState<string>(products[0].slug);
  const [form, setForm] = useState<{ kind: string; title: string; body_text: string; notes: string; file_url: string }>({
    kind: "poster", title: "", body_text: "", notes: "", file_url: "",
  });

  const list = useQuery({
    queryKey: ["admin-assets", productSlug],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>(`/api/admin/affiliate-assets?product_slug=${productSlug}`);
      return res.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      await api.post("/api/admin/affiliate-assets", {
        product_slug: productSlug, kind: form.kind, title: form.title,
        body_text: form.body_text || null, notes: form.notes || null,
        file_url: form.file_url || null, active: true,
      });
    },
    onSuccess: () => {
      toast.success("Asset added");
      setForm({ kind: "poster", title: "", body_text: "", notes: "", file_url: "" });
      qc.invalidateQueries({ queryKey: ["admin-assets", productSlug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/admin/affiliate-assets/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-assets", productSlug] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/affiliate-assets/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-assets", productSlug] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Product</span>
        <Select value={productSlug} onValueChange={setProductSlug}>
          <SelectTrigger className="glass max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {products.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {canEdit && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">Add asset</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Kind</span>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_KINDS.map((k) => <SelectItem key={k} value={k}>{k.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Title</span>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="glass" placeholder="Hero poster v1" />
            </label>
          </div>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">Body text (for SMS / captions / scripts)</span>
            <Textarea value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} className="glass" rows={3} />
          </label>
          <label className="space-y-1 block"><span className="text-xs text-muted-foreground">File URL (public link to image/video/PDF)</span>
            <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} className="glass" placeholder="https://…" />
          </label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="glass" placeholder="Usage notes (optional)" />
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add asset"}
          </Button>
        </div>
      )}

      {list.isLoading ? <Sk /> : (list.data ?? []).length === 0 ? <Empty msg="No assets for this product yet." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.data!.map((a: any) => (
            <div key={a.id} className="glass rounded-xl overflow-hidden border border-border/50">
              {(a.kind === "poster" || a.kind === "logo") && a.file_url && (
                <img src={a.file_url} alt={a.title} className="w-full h-32 object-cover" loading="lazy" />
              )}
              {a.kind === "video" && a.file_url && (
                <video src={a.file_url} className="w-full h-32 object-cover" />
              )}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{a.title}</div>
                    <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{String(a.kind).replace("_", " ")}</Badge>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Switch checked={a.active} onCheckedChange={(v) => toggleActive.mutate({ id: a.id, active: v })} />
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete asset?")) del.mutate(a.id); }}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                {a.body_text && <div className="text-xs bg-background/60 rounded p-2 max-h-20 overflow-y-auto whitespace-pre-wrap">{a.body_text}</div>}
                {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Share Templates ============ */
const SHARE_CHANNELS = ["whatsapp","sms","email","facebook","instagram","tiktok","x","telegram"] as const;

function TemplatesTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [productSlug, setProductSlug] = useState<string>(products[0].slug);

  const list = useQuery({
    queryKey: ["admin-templates", productSlug],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>(`/api/admin/affiliate-templates?product_slug=${productSlug}`);
      return (res.data ?? []) as Array<{ id?: string; channel: string; body: string; cta: string | null; active: boolean }>;
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: { channel: string; body: string; cta: string; active: boolean }) => {
      await api.put("/api/admin/affiliate-templates", {
        product_slug: productSlug, channel: row.channel, body: row.body,
        cta: row.cta || null, active: row.active,
      });
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-templates", productSlug] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const byChannel = new Map(list.data?.map((t) => [t.channel, t]) ?? []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Product</span>
        <Select value={productSlug} onValueChange={setProductSlug}>
          <SelectTrigger className="glass max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {products.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {SHARE_CHANNELS.map((ch) => (
          <TemplateRow
            key={ch}
            channel={ch}
            current={byChannel.get(ch)}
            canEdit={canEdit}
            onSave={(row) => upsert.mutate(row)}
            busy={upsert.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateRow({ channel, current, canEdit, onSave, busy }: {
  channel: string; current?: { body: string; cta: string | null; active: boolean };
  canEdit: boolean; onSave: (r: { channel: string; body: string; cta: string; active: boolean }) => void; busy: boolean;
}) {
  const [body, setBody] = useState(current?.body ?? "");
  const [cta, setCta] = useState(current?.cta ?? "");
  const [active, setActive] = useState(current?.active ?? true);
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold capitalize">{channel}</div>
        <div className="flex items-center gap-2 text-xs">Active <Switch checked={active} onCheckedChange={setActive} disabled={!canEdit} /></div>
      </div>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="glass" rows={3} placeholder="Default share message" disabled={!canEdit} />
      <Input value={cta} onChange={(e) => setCta(e.target.value)} className="glass" placeholder="CTA (e.g. Try it free)" disabled={!canEdit} />
      {canEdit && (
        <Button size="sm" onClick={() => onSave({ channel, body, cta, active })} disabled={busy || !body.trim()}>
          <Save className="size-3.5 mr-1.5" /> Save
        </Button>
      )}
    </div>
  );
}

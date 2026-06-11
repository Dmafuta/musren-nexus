import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/consent")({
  head: () => ({ meta: [
    { title: "Consent management — Musren admin" },
    { name: "description", content: "Manage privacy policies, consent defaults and re-prompt rules." },
  ] }),
  component: ConsentAdminPage,
});

type PolicyKind = "privacy" | "terms" | "cookies";
interface Policy {
  id: string; kind: PolicyKind; version: string; summary: string | null;
  content_url: string | null; effective_at: string; active: boolean; created_at: string;
}
interface Settings {
  active_policy_version: string;
  default_analytics: boolean;
  default_marketing: boolean;
  default_personalization: boolean;
  reprompt_on_version_change: boolean;
}

const versionRegex = /^[0-9]+(\.[0-9]+){0,2}$/;
const policySchema = z.object({
  kind: z.enum(["privacy", "terms", "cookies"]),
  version: z.string().regex(versionRegex, "Use semver-like format e.g. 1.0 or 2.1.0").max(20),
  summary: z.string().max(500).optional(),
  content_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

function ConsentAdminPage() {
  const { hasAnyRole, loading } = useAuth();
  const allowed = hasAnyRole(["admin", "superadmin"]);

  if (loading) return <SiteLayout><Section title="Loading…" description="Checking your access." /></SiteLayout>;
  if (!allowed) {
    return (
      <SiteLayout>
        <Section eyebrow="Admin" title="Admin access required" description="You need admin access to manage consent.">
          <Link to="/"><Button variant="outline" className="glass">Back home</Button></Link>
        </Section>
      </SiteLayout>
    );
  }
  return <ConsentAdminContent />;
}

function ConsentAdminContent() {
  return (
    <SiteLayout>
      <Section
        eyebrow="Admin"
        title="Consent management"
        description="Configure ODPC policy versions, default opt-ins and re-prompt behavior."
      >
        <div className="mb-6">
          <Link to="/admin/corporate-topup" className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to admin
          </Link>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="settings">Settings & defaults</TabsTrigger>
            <TabsTrigger value="policies">Policy versions</TabsTrigger>
          </TabsList>
          <TabsContent value="settings" className="mt-6"><SettingsCard /></TabsContent>
          <TabsContent value="policies" className="mt-6"><PoliciesCard /></TabsContent>
        </Tabs>
      </Section>
    </SiteLayout>
  );
}

function SettingsCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["consent-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consent_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  useEffect(() => { if (data) setDraft(data); }, [data]);

  const { data: versions = [] } = useQuery({
    queryKey: ["consent-policy-versions"],
    queryFn: async () => {
      const { data } = await supabase.from("consent_policies")
        .select("version").eq("active", true).order("created_at", { ascending: false });
      const set = new Set((data ?? []).map((p) => p.version));
      return Array.from(set);
    },
  });

  const save = useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase.from("consent_settings")
        .update({
          active_policy_version: next.active_policy_version,
          default_analytics: next.default_analytics,
          default_marketing: next.default_marketing,
          default_personalization: next.default_personalization,
          reprompt_on_version_change: next.reprompt_on_version_change,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consent settings updated");
      qc.invalidateQueries({ queryKey: ["consent-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !draft) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold">Active policy version</h3>
        <p className="text-sm text-muted-foreground">All consent records are stamped with this version. Changing it triggers re-prompts when "Re-prompt on version change" is on.</p>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <div className="min-w-[200px]">
            <Select
              value={draft.active_policy_version}
              onValueChange={(v) => setDraft({ ...draft, active_policy_version: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[draft.active_policy_version, ...versions.filter((v) => v !== draft.active_policy_version)].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground">
            Manage versions in the "Policy versions" tab.
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-display text-lg font-semibold">Category defaults</h3>
        <p className="text-sm text-muted-foreground">Pre-checked state shown in the banner. Necessary is always on.</p>
        <div className="mt-4 space-y-4">
          {([
            ["default_analytics", "Analytics"],
            ["default_marketing", "Marketing"],
            ["default_personalization", "Personalization"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch checked={draft[key]} onCheckedChange={(v) => setDraft({ ...draft, [key]: v })} />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-display text-lg font-semibold">Re-prompt rules</h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Re-prompt on policy version change</div>
              <p className="text-xs text-muted-foreground">When off, returning users are not prompted again even after a version bump (their previous choices stay active).</p>
            </div>
            <Switch
              checked={draft.reprompt_on_version_change}
              onCheckedChange={(v) => setDraft({ ...draft, reprompt_on_version_change: v })}
            />
          </div>
          <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground flex gap-2">
            <ShieldAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
            Withdrawing consent always re-opens the banner regardless of these settings — this is a non-configurable ODPC requirement.
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>Save settings</Button>
      </div>
    </Card>
  );
}

function PoliciesCard() {
  const qc = useQueryClient();
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["consent-policies-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("consent_policies")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Policy[];
    },
  });

  const [form, setForm] = useState({ kind: "privacy" as PolicyKind, version: "", summary: "", content_url: "" });
  const create = useMutation({
    mutationFn: async () => {
      const parsed = policySchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { error } = await supabase.from("consent_policies").insert({
        kind: parsed.data.kind,
        version: parsed.data.version,
        summary: parsed.data.summary || null,
        content_url: parsed.data.content_url || null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Policy version added");
      setForm({ kind: "privacy", version: "", summary: "", content_url: "" });
      qc.invalidateQueries({ queryKey: ["consent-policies-admin"] });
      qc.invalidateQueries({ queryKey: ["consent-policy-versions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Policy) => {
      const { error } = await supabase.from("consent_policies").update({ active: !p.active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consent-policies-admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consent_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Policy deleted"); qc.invalidateQueries({ queryKey: ["consent-policies-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold">Add a new version</h3>
        <p className="text-sm text-muted-foreground">Publish a new privacy, terms, or cookie policy version.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Kind</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as PolicyKind })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="privacy">Privacy</SelectItem>
                <SelectItem value="terms">Terms</SelectItem>
                <SelectItem value="cookies">Cookies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Version</Label>
            <Input className="mt-1.5" placeholder="e.g. 2.0" value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })} maxLength={20} />
          </div>
          <div className="sm:col-span-2">
            <Label>Summary (optional)</Label>
            <Input className="mt-1.5" placeholder="What changed?" value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })} maxLength={500} />
          </div>
          <div className="sm:col-span-2">
            <Label>Content URL (optional)</Label>
            <Input className="mt-1.5" placeholder="https://…" value={form.content_url}
              onChange={(e) => setForm({ ...form, content_url: e.target.value })} maxLength={500} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={create.isPending || !form.version} onClick={() => create.mutate()}>
            <Plus className="size-4 mr-1.5" /> Add version
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold">Existing policies</h3>
        {isLoading ? (
          <div className="text-muted-foreground mt-4">Loading…</div>
        ) : policies.length === 0 ? (
          <div className="text-muted-foreground mt-4">No policies yet.</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Kind</th><th className="p-3">Version</th>
                  <th className="p-3">Summary</th><th className="p-3">Effective</th>
                  <th className="p-3">Active</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="p-3 capitalize">{p.kind}</td>
                    <td className="p-3 font-mono">{p.version}</td>
                    <td className="p-3 max-w-[320px]">
                      {p.summary ?? <span className="text-muted-foreground">—</span>}
                      {p.content_url && (
                        <div><a href={p.content_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open document</a></div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{new Date(p.effective_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Switch checked={p.active} onCheckedChange={() => toggleActive.mutate(p)} />
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${p.kind} v${p.version}?`)) remove.mutate(p.id); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          The "active policy version" used for re-prompting is set in the Settings tab. Versions here can be active/inactive independently to keep historical references.
        </p>
      </Card>
    </div>
  );
}

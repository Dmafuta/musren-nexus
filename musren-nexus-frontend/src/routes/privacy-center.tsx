import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useConsent, CONSENT_CATEGORIES, POLICY_VERSION, type ConsentCategory } from "@/hooks/use-consent";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Download, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/privacy-center")({
  head: () => ({ meta: [
    { title: "Privacy Center — Musren" },
    { name: "description", content: "Manage your privacy, consent and communication preferences." },
  ] }),
  component: PrivacyCenterPage,
});

const LABELS: Record<ConsentCategory, { title: string; desc: string }> = {
  necessary: { title: "Strictly necessary", desc: "Required for authentication, security and core features. Cannot be disabled." },
  analytics: { title: "Analytics", desc: "Aggregated, anonymized usage data so we can improve the product." },
  marketing: { title: "Marketing", desc: "Promotions, campaigns and partner offers tailored to you." },
  personalization: { title: "Personalization", desc: "Custom recommendations and saved preferences." },
};

function PrivacyCenterPage() {
  const { user } = useAuth();
  const { choices, save, withdraw, policyVersion } = useConsent();
  const [draft, setDraft] = useState(choices);
  const [history, setHistory] = useState<Array<{ id: string; category: string; granted: boolean; policy_version: string; created_at: string; source: string }>>([]);

  useEffect(() => setDraft(choices), [choices]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_consents")
      .select("id, category, granted, policy_version, created_at, source")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setHistory(data ?? []));
  }, [user, choices]);

  const handleSave = async () => {
    await save(draft, "privacy-center");
    toast.success("Preferences updated");
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify({ user: user?.id ?? null, policyVersion, current: choices, history }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `musren-consent-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SiteLayout>
      <div className="container-page section-y max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Shield className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Privacy Center</h1>
            <p className="text-sm text-muted-foreground">Policy version {POLICY_VERSION} · Manage your consent silently honored across Musren.</p>
          </div>
        </div>

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Communication & cookie preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">Changes apply immediately and are stored against your account so you won't be re-prompted.</p>
          <div className="mt-6 space-y-5">
            {CONSENT_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{LABELS[cat].title}</span>
                    {cat === "necessary" && <Badge variant="secondary">Always on</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{LABELS[cat].desc}</p>
                </div>
                <Switch
                  checked={cat === "necessary" ? true : draft[cat]}
                  disabled={cat === "necessary"}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, [cat]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={handleSave}>Save preferences</Button>
            <Button variant="outline" onClick={withdraw}>Withdraw all consent</Button>
            <Button variant="ghost" onClick={handleDownload} className="ml-auto">
              <Download className="size-4 mr-2" /> Download consent record
            </Button>
          </div>
        </Card>

        {!user && (
          <Card className="mt-6 p-5">
            <p className="text-sm text-muted-foreground">
              You're browsing as a guest. <Link to="/login" className="text-primary underline">Sign in</Link> to sync your preferences across devices and access your full consent history.
            </p>
          </Card>
        )}

        {user && (
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">Consent history</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Append-only ODPC audit trail of every choice you've made.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-3">When</th><th className="p-3">Category</th><th className="p-3">Choice</th><th className="p-3">Version</th><th className="p-3">Source</th></tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No history yet.</td></tr>
                  )}
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-border">
                      <td className="p-3 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="p-3 capitalize">{h.category}</td>
                      <td className="p-3">{h.granted ? <Badge>Granted</Badge> : <Badge variant="outline">Denied</Badge>}</td>
                      <td className="p-3">{h.policy_version}</td>
                      <td className="p-3 text-muted-foreground">{h.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}

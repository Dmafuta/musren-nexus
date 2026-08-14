import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Webhook, Code2, BookOpen, Plus, Trash2, Copy, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getToken } from "@/lib/api-client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RequestRoleAccess } from "@/components/site/RequestRoleAccess";
import { RolesBadges } from "@/components/site/RolesBadges";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/developers/dashboard")({
  head: () => ({
    meta: [
      { title: "Developer dashboard — Musren" },
      { name: "description", content: "Manage your API keys, webhooks and sandbox." },
    ],
  }),
  component: DeveloperDashboard,
});

const WEBHOOK_EVENTS = [
  "withdrawal.approved",
  "withdrawal.paid",
  "withdrawal.rejected",
  "api_key.created",
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "sandbox" | "live";
  createdAt: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
}

function getAuthHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function DeveloperDashboard() {
  const { user, hasAnyRole } = useAuth();
  const allowed = hasAnyRole(["developer", "admin", "staff"]);

  if (!allowed) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Developers"
          title="Developer access required"
          description="Your account doesn't have developer access yet. Request access and our team will enable it."
        >
          <div className="space-y-5">
            <RolesBadges highlightMissing="developer" />
            <RequestRoleAccess role="developer" />
            <div className="flex flex-wrap gap-3">
              <Link to="/developers">
                <Button variant="outline" className="glass">Back to overview</Button>
              </Link>
            </div>
          </div>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Section
        eyebrow="Developers"
        title={<>Welcome back, <span className="text-gradient">{user?.email?.split("@")[0]}</span></>}
        description="Your developer workspace — keys, webhooks, SDKs and docs."
      >
        <div className="mb-6"><RolesBadges /></div>

        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="keys"><KeyRound className="size-4 mr-2" />API Keys</TabsTrigger>
            <TabsTrigger value="webhooks"><Webhook className="size-4 mr-2" />Webhooks</TabsTrigger>
          </TabsList>
          <TabsContent value="keys"><ApiKeysTab /></TabsContent>
          <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
        </Tabs>

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <Code2 className="size-6 text-primary shrink-0" />
            <div>
              <div className="font-semibold">SDKs &amp; samples</div>
              <p className="text-sm text-muted-foreground">Node, Python, PHP and Java starters.</p>
            </div>
          </div>
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <BookOpen className="size-6 text-primary shrink-0" />
            <div>
              <div className="font-semibold">Docs &amp; forum</div>
              <p className="text-sm text-muted-foreground">Guides, references and community.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/contact">
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
              Request live access
            </Button>
          </Link>
          <Link to="/developers">
            <Button variant="outline" className="glass">Back to overview</Button>
          </Link>
        </div>
      </Section>
    </SiteLayout>
  );
}

function ApiKeysTab() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState<"sandbox" | "live">("sandbox");

  const keysQuery = useQuery<ApiKey[]>({
    queryKey: ["dev-api-keys"],
    queryFn: async () => {
      const headers = getAuthHeader();
      const res = await fetch(`/api/developer/keys`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const headers = { ...(getAuthHeader()), "Content-Type": "application/json" };
      const res = await fetch(`/api/developer/keys`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newName, environment: newEnv }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ fullKey: string }>;
    },
    onSuccess: (data) => {
      setRevealKey(data.fullKey);
      setCreateOpen(false);
      setNewName("");
      setNewEnv("sandbox");
      qc.invalidateQueries({ queryKey: ["dev-api-keys"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = getAuthHeader();
      const res = await fetch(`/api/developer/keys/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      toast.success("API key deleted");
      qc.invalidateQueries({ queryKey: ["dev-api-keys"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">API Keys</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Plus className="size-4 mr-1" /> Create key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create API key</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input id="key-name" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My integration" className="glass" />
              </div>
              <div className="space-y-1.5">
                <Label>Environment</Label>
                <Select value={newEnv} onValueChange={(v) => setNewEnv(v as "sandbox" | "live")}>
                  <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newName.trim()}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {keysQuery.isLoading ? (
        <div className="h-24 rounded-lg bg-muted/30 animate-pulse" />
      ) : keysQuery.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key prefix</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keysQuery.data?.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell><code className="text-xs font-mono">{k.keyPrefix}…</code></TableCell>
                <TableCell>
                  <Badge variant="outline" className={k.environment === "live"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"}>
                    {k.environment}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(k.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                    onClick={() => deleteMutation.mutate(k.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!revealKey} onOpenChange={(open) => { if (!open) setRevealKey(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Your new API key</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Copy this key now — it will not be shown again.</p>
          <div className="flex items-center gap-2 bg-background/60 rounded-lg p-3 border border-border/50">
            <code className="text-xs font-mono flex-1 break-all">{revealKey}</code>
            <Button size="sm" variant="ghost" onClick={() => {
              if (revealKey) navigator.clipboard.writeText(revealKey);
              toast.success("Copied to clipboard");
            }}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebhooksTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);

  const hooksQuery = useQuery<WebhookEndpoint[]>({
    queryKey: ["dev-webhooks"],
    queryFn: async () => {
      const headers = getAuthHeader();
      const res = await fetch(`/api/developer/webhooks`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const headers = { ...(getAuthHeader()), "Content-Type": "application/json" };
      const res = await fetch(`/api/developer/webhooks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url: newUrl, events: selectedEvents }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Webhook endpoint added");
      setAddOpen(false);
      setNewUrl("");
      setSelectedEvents([]);
      qc.invalidateQueries({ queryKey: ["dev-webhooks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = getAuthHeader();
      const res = await fetch(`/api/developer/webhooks/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      toast.success("Webhook deleted");
      qc.invalidateQueries({ queryKey: ["dev-webhooks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleEvent = (ev: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Webhooks</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Plus className="size-4 mr-1" /> Add endpoint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add webhook endpoint</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="wh-url">Endpoint URL</Label>
                <Input id="wh-url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://your-server.example/webhooks" className="glass" />
              </div>
              <div className="space-y-2">
                <Label>Events to subscribe</Label>
                {WEBHOOK_EVENTS.map((ev) => (
                  <div key={ev} className="flex items-center gap-2">
                    <Checkbox id={`ev-${ev}`} checked={selectedEvents.includes(ev)}
                      onCheckedChange={() => toggleEvent(ev)} />
                    <label htmlFor={`ev-${ev}`} className="text-sm font-mono cursor-pointer">{ev}</label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newUrl.trim() || selectedEvents.length === 0}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add endpoint"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hooksQuery.isLoading ? (
        <div className="h-24 rounded-lg bg-muted/30 animate-pulse" />
      ) : hooksQuery.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hooksQuery.data?.map((wh) => (
              <TableRow key={wh.id}>
                <TableCell><code className="text-xs font-mono break-all">{wh.url}</code></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((ev) => (
                      <Badge key={ev} variant="outline" className="text-xs font-mono">{ev}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={wh.active
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground"}>
                    {wh.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                    onClick={() => deleteMutation.mutate(wh.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, XCircle, MessageSquare, Search, Clock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bulk-sms")({
  head: () => ({
    meta: [
      { title: "Bulk SMS applications — Musren admin" },
      { name: "description", content: "Review and approve Bulk SMS sender ID applications." },
    ],
  }),
  component: BulkSmsAdminPage,
});

type Status = "pending" | "approved" | "rejected";

interface SmsApplication {
  id: string;
  company_name: string;
  box_address: string | null;
  director_names: string;
  sender_id: string;
  purpose: string;
  preferred_shortcode: string | null;
  phone: string;
  email: string;
  status: Status;
  created_at: string;
}

function BulkSmsAdminPage() {
  const { hasAnyRole, loading } = useAuth();
  if (loading) return <SiteLayout><Section title="Loading…" /></SiteLayout>;
  if (!hasAnyRole(["admin", "staff", "superadmin"])) {
    return (
      <SiteLayout>
        <Section eyebrow="Admin" title="Staff access required" description="You need admin or staff role to manage Bulk SMS applications.">
          <Link to="/"><Button variant="outline" className="glass">Back home</Button></Link>
        </Section>
      </SiteLayout>
    );
  }
  return <BulkSmsContent />;
}

function BulkSmsContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("pending");
  const [search, setSearch] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin-bulk-sms", tab],
    queryFn: async () => {
      const res = await api.get<{ data: SmsApplication[] }>(`/api/admin/bulk-sms/applications?status=${tab}`);
      return res.data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      api.patch(`/api/admin/bulk-sms/applications/${id}`, { status }),
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "approved" ? "Application approved" : "Application rejected");
      qc.invalidateQueries({ queryKey: ["admin-bulk-sms"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = applications.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.company_name.toLowerCase().includes(q) ||
      a.sender_id.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.phone.toLowerCase().includes(q)
    );
  });

  return (
    <SiteLayout>
      <Section
        eyebrow="Admin"
        title={<>Bulk SMS <span className="text-gradient">applications</span></>}
        description="Review sender ID applications and approve or reject them."
      >
        <div className="mb-6">
          <Link to="/admin/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to admin
          </Link>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="pending"><Clock className="size-3.5 mr-1.5" />Pending</TabsTrigger>
              <TabsTrigger value="approved"><CheckCircle2 className="size-3.5 mr-1.5" />Approved</TabsTrigger>
              <TabsTrigger value="rejected"><XCircle className="size-3.5 mr-1.5" />Rejected</TabsTrigger>
            </TabsList>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, sender ID, email…"
                className="pl-9 glass"
              />
            </div>
          </div>

          <TabsContent value={tab}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <MessageSquare className="size-8 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No applications match your search." : `No ${tab} applications.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onApprove={() => updateStatus.mutate({ id: app.id, status: "approved" })}
                    onReject={() => updateStatus.mutate({ id: app.id, status: "rejected" })}
                    busy={updateStatus.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Section>
    </SiteLayout>
  );
}

function ApplicationCard({
  app, onApprove, onReject, busy,
}: {
  app: SmsApplication;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{app.company_name}</span>
            <Badge variant="outline" className="font-mono text-xs">{app.sender_id}</Badge>
            <StatusBadge status={app.status} />
          </div>
          {app.director_names && (
            <div className="text-xs text-muted-foreground mt-0.5">Director: {app.director_names}</div>
          )}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(app.created_at).toLocaleString()}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm mb-4">
        <Detail label="Email" value={<a href={`mailto:${app.email}`} className="text-primary hover:underline">{app.email}</a>} />
        <Detail label="Phone" value={<a href={`tel:${app.phone}`} className="text-primary hover:underline">{app.phone}</a>} />
        {app.preferred_shortcode && <Detail label="Shortcode" value={app.preferred_shortcode} />}
        {app.box_address && <Detail label="P.O. Box" value={app.box_address} />}
      </div>

      {app.purpose && (
        <div className="rounded-lg bg-background/40 border border-border/30 px-4 py-3 mb-4">
          <div className="text-xs text-muted-foreground mb-1">Purpose</div>
          <p className="text-sm leading-relaxed">{app.purpose}</p>
        </div>
      )}

      {app.status === "pending" && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={busy}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <CheckCircle2 className="size-4 mr-1.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={busy}
            className="glass text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <XCircle className="size-4 mr-1.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cls =
    status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "rejected" ? "bg-red-500/15 text-red-400 border-red-500/30" :
    "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{status}</Badge>;
}

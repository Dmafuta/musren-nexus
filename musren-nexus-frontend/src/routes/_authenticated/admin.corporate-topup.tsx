import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
  PhoneCall,
  Mail,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/corporate-topup")({
  head: () => ({
    meta: [
      { title: "Corporate Topup leads — Musren admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCorporateTopup,
});

type Status = "new" | "contacted" | "qualified" | "rejected";
type Inquiry = {
  id: string;
  company: string;
  industry: string | null;
  contact_name: string;
  email: string;
  phone: string;
  role: string | null;
  network: string;
  estimated_volume: string;
  frequency: string;
  use_cases: string[];
  preferred_contact: "Email" | "Phone call" | "WhatsApp";
  notes: string | null;
  status: Status;
  status_notes: string | null;
  contacted_at: string | null;
  qualified_at: string | null;
  created_at: string;
};

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-accent/15 text-accent border-accent/30" },
  contacted: { label: "Contacted", cls: "bg-primary/15 text-primary border-primary/30" },
  qualified: { label: "Qualified", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const CONTACT_ICON = {
  Email: Mail,
  "Phone call": PhoneCall,
  WhatsApp: MessageCircle,
} as const;

function AdminCorporateTopup() {
  const { hasAnyRole, loading } = useAuth();
  const isAuthorized = hasAnyRole(["admin", "staff", "superadmin"]);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [network, setNetwork] = useState<string>("all");

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["corporate-topup-inquiries"],
    enabled: isAuthorized,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corporate_topup_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inquiry[];
    },
  });

  const networks = useMemo(
    () => Array.from(new Set(inquiries.map((i) => i.network))).sort(),
    [inquiries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (network !== "all" && i.network !== network) return false;
      if (!q) return true;
      return (
        i.company.toLowerCase().includes(q) ||
        i.contact_name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.phone.toLowerCase().includes(q)
      );
    });
  }, [inquiries, search, status, network]);

  const counts = useMemo(() => {
    const base: Record<Status | "all", number> = {
      all: inquiries.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      rejected: 0,
    };
    inquiries.forEach((i) => {
      base[i.status] += 1;
    });
    return base;
  }, [inquiries]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Status }) => {
      const patch: Partial<Inquiry> = { status: next };
      if (next === "contacted") patch.contacted_at = new Date().toISOString();
      if (next === "qualified") patch.qualified_at = new Date().toISOString();
      const { error } = await supabase
        .from("corporate_topup_inquiries")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Marked as ${STATUS_META[vars.next].label.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["corporate-topup-inquiries"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (loading) {
    return (
      <SiteLayout>
        <Section title="Loading admin…" />
      </SiteLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Access denied"
          title="You don't have access to this dashboard"
          description="This area is restricted to Musren admins and staff. If you should have access, contact an administrator to be assigned the staff or admin role."
        >
          <div className="glass rounded-2xl p-6 flex items-start gap-4 max-w-xl">
            <ShieldAlert className="size-6 text-destructive shrink-0" />
            <div className="text-sm text-muted-foreground">
              Signed in users without the admin/staff role cannot view leads. Once an admin grants
              your account a role, refresh this page.
            </div>
          </div>
          <div className="mt-6">
            <Link to="/" className="text-primary text-sm inline-flex items-center gap-1.5">
              <ArrowLeft className="size-4" /> Back to site
            </Link>
          </div>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <Section
        eyebrow="Admin"
        title={
          <span className="inline-flex items-center gap-3">
            <Wallet className="size-7 text-primary" /> Corporate Topup leads
          </span>
        }
        description="Review, filter and progress incoming Corporate Topup inquiries."
      >
        {/* KPI tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {(["all", "new", "contacted", "qualified", "rejected"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatus(k as Status | "all")}
              className={`glass rounded-2xl p-4 text-left transition hover:bg-white/[0.06] ${
                status === k ? "ring-1 ring-primary/60" : ""
              }`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {k === "all" ? "Total" : STATUS_META[k as Status].label}
              </div>
              <div className="font-display text-2xl font-bold mt-1">{counts[k]}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, name, email, phone…"
              className="pl-9 glass"
            />
          </div>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="w-[180px] glass">
              <SelectValue placeholder="Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All networks</SelectItem>
              {networks.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
            <SelectTrigger className="w-[180px] glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-2xl glass-strong overflow-hidden border-gradient">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company / Contact</TableHead>
                <TableHead>Network · Volume</TableHead>
                <TableHead>Use cases</TableHead>
                <TableHead>Preferred</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading inquiries…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Sparkles className="size-5 mx-auto mb-2 text-primary/60" />
                    No inquiries match these filters yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const Icon = CONTACT_ICON[row.preferred_contact];
                  const meta = STATUS_META[row.status];
                  return (
                    <TableRow key={row.id} className="align-top">
                      <TableCell>
                        <div className="font-semibold">{row.company}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {row.contact_name}
                          {row.role ? ` · ${row.role}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <a className="hover:text-foreground" href={`mailto:${row.email}`}>{row.email}</a>
                          {" · "}
                          <a className="hover:text-foreground" href={`tel:${row.phone}`}>{row.phone}</a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.network}</div>
                        <div className="text-xs text-muted-foreground">{row.estimated_volume}</div>
                        <div className="text-xs text-muted-foreground">{row.frequency}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {row.use_cases.map((u) => (
                            <Badge key={u} variant="secondary" className="text-[10px]">
                              {u}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="size-3.5" /> {row.preferred_contact}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(row.created_at), "d MMM yyyy")}
                        <div>{format(new Date(row.created_at), "HH:mm")}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap gap-1.5 justify-end">
                          {row.status !== "contacted" && row.status !== "qualified" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="glass"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: row.id, next: "contacted" })
                              }
                            >
                              <PhoneCall className="size-3.5 mr-1" /> Contacted
                            </Button>
                          )}
                          {row.status !== "qualified" && (
                            <Button
                              size="sm"
                              className="bg-emerald-500/90 hover:bg-emerald-500 text-emerald-950"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: row.id, next: "qualified" })
                              }
                            >
                              <CheckCircle2 className="size-3.5 mr-1" /> Qualify
                            </Button>
                          )}
                          {row.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: row.id, next: "rejected" })
                              }
                            >
                              <XCircle className="size-3.5 mr-1" /> Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Section>
    </SiteLayout>
  );
}

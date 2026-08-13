import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, ShieldAlert, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/role-requests")({
  head: () => ({
    meta: [
      { title: "Role requests — Musren admin" },
      { name: "description", content: "Review and approve developer and affiliate role requests." },
    ],
  }),
  component: RoleRequestsPage,
});

type Status = "pending" | "approved" | "rejected";

interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: "developer" | "affiliate";
  status: Status;
  message: string | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function RoleRequestsPage() {
  const { hasAnyRole, loading } = useAuth();
  const allowed = hasAnyRole(["admin", "staff"]);

  if (loading) {
    return (
      <SiteLayout>
        <Section title="Loading…" description="Checking your access." />
      </SiteLayout>
    );
  }
  if (!allowed) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Admin"
          title="Staff access required"
          description="You need admin or staff role to review role requests."
        >
          <Link to="/"><Button variant="outline" className="glass">Back home</Button></Link>
        </Section>
      </SiteLayout>
    );
  }
  return <RoleRequestsContent />;
}

function RoleRequestsContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["role-requests", tab],
    queryFn: async () => {
      const res = await api.get<{ data: RoleRequest[] }>(`/api/admin/role-requests?status=${tab}`);
      return res.data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "rejected"; notes: string }) => {
      await api.patch(`/api/admin/role-requests/${input.id}`, {
        status: input.status,
        reviewer_notes: input.notes || null,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "approved" ? "Request approved and role granted" : "Request rejected");
      qc.invalidateQueries({ queryKey: ["role-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <Section
        eyebrow="Admin"
        title="Role requests"
        description="Approve developer or affiliate access for your users."
      >
        <div className="mb-6">
          <Link to="/admin/corporate-topup" className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to admin
          </Link>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-6">
            {isLoading ? (
              <div className="text-muted-foreground">Loading requests…</div>
            ) : requests.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                No {tab} requests.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    onReview={(status, notes) => review.mutate({ id: r.id, status, notes })}
                    busy={review.isPending}
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

function RequestCard({
  request, onReview, busy,
}: {
  request: RoleRequest;
  onReview: (status: "approved" | "rejected", notes: string) => void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState(request.reviewer_notes ?? "");
  const isPending = request.status === "pending";

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{request.requested_role}</Badge>
            <StatusBadge status={request.status} />
            <span className="text-xs text-muted-foreground">
              {new Date(request.created_at).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
            user: {request.user_id}
          </div>
          {request.message && (
            <p className="mt-3 text-sm text-foreground/90">{request.message}</p>
          )}
        </div>
      </div>

      {isPending ? (
        <div className="mt-4 space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reviewer notes (optional)"
            className="glass"
            rows={2}
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onReview("approved", notes)}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <CheckCircle2 className="size-4 mr-1.5" /> Approve & grant role
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onReview("rejected", notes)}
              className="glass"
            >
              <XCircle className="size-4 mr-1.5" /> Reject
            </Button>
          </div>
        </div>
      ) : request.reviewer_notes ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Notes:</span> {request.reviewer_notes}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "approved") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="size-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/15 text-red-400 border-red-500/30"><XCircle className="size-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30"><Clock className="size-3 mr-1" />Pending</Badge>;
}

void ShieldAlert;

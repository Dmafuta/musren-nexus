import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface RoleRequestData {
  id: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
}

export function RequestRoleAccess({ role }: { role: "developer" | "affiliate" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["my-role-request", user?.id, role],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await api.get<{ data: RoleRequestData | null }>(`/api/roles/my-request?role=${role}`);
      return res.data ?? null;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      await api.post("/api/roles/request", {
        requested_role: role,
        message: message.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Request submitted. We'll be in touch soon.");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my-role-request"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  if (existing?.status === "pending") {
    return (
      <div className="glass rounded-2xl p-5 inline-flex items-center gap-2 text-sm">
        <Clock className="size-4 text-amber-400" />
        Your {role} access request is pending review.
      </div>
    );
  }
  if (existing?.status === "approved") {
    return (
      <div className="glass rounded-2xl p-5 inline-flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4 text-emerald-400" />
        Approved — refresh the page to access your dashboard.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 max-w-xl space-y-3">
      {existing?.status === "rejected" && (
        <div className="text-sm inline-flex items-center gap-2 text-muted-foreground">
          <XCircle className="size-4 text-red-400" />
          Previous request was rejected{existing.reviewer_notes ? `: ${existing.reviewer_notes}` : "."} You can submit a new one.
        </div>
      )}
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Tell us why you need ${role} access (optional).`}
        className="glass"
        rows={3}
        maxLength={500}
      />
      <Button
        onClick={() => submit.mutate()}
        disabled={submit.isPending}
        className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
      >
        <Send className="size-4 mr-1.5" />
        {submit.isPending ? "Sending…" : `Request ${role} access`}
      </Button>
    </div>
  );
}

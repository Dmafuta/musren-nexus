import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Bell } from "lucide-react";
import { AffiliateShell } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliates/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Musren Affiliate" },
      { name: "description", content: "Your affiliate program notifications and updates." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: ["aff-notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/notifications");
      return res.data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/affiliate/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aff-notifications", userId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/api/affiliate/notifications/read-all", {}),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["aff-notifications", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unread = (notifications.data ?? []).filter((n: any) => !n.read_at);

  return (
    <AffiliateShell>
      <Section
        eyebrow="Notifications"
        title={<>Your <span className="text-gradient">notifications</span></>}
        description="Program updates, payout confirmations and promotional announcements."
      >
        <div className="glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <BellRing className="size-4 text-primary" />
              <span className="font-semibold">All notifications</span>
              {unread.length > 0 && (
                <Badge className="bg-primary/15 text-primary border-primary/30">{unread.length} new</Badge>
              )}
            </div>
            {unread.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs"
              >
                <Check className="size-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          {/* Body */}
          {notifications.isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (notifications.data?.length ?? 0) === 0 ? (
            <div className="py-16 text-center">
              <Bell className="size-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">You're all caught up — no notifications.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {notifications.data?.map((n: any) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-6 py-4 transition ${!n.read_at ? "bg-primary/[0.03]" : ""}`}
                >
                  <div className={`mt-0.5 size-2 rounded-full shrink-0 ${!n.read_at ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`text-sm font-medium ${!n.read_at ? "" : "text-muted-foreground"}`}>{n.title}</div>
                        {n.body && (
                          <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>
                        )}
                        {n.created_at && (
                          <div className="text-xs text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {!n.read_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markRead.mutate(n.id)}
                          className="shrink-0 text-xs"
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </AffiliateShell>
  );
}

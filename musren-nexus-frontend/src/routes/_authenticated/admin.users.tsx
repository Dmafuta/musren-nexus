import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert, Crown, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [
    { title: "Users & roles — Musren admin" },
    { name: "description", content: "Super admin: manage admin and super-admin roles." },
  ] }),
  component: UsersPage,
});

interface UserRow { user_id: string; email: string | null; name: string | null; roles: AppRole[] }

function UsersPage() {
  const { hasRole, hasAnyRole, user, loading, refreshRoles } = useAuth();
  const isSuper = hasRole("superadmin");
  const isAdmin = hasAnyRole(["admin", "superadmin"]);

  const claim = useMutation({
    mutationFn: () => api.post<{ claimed: boolean; message: string }>("/api/auth/bootstrap/claim-superadmin"),
    onSuccess: async (res) => {
      if (res.claimed) { toast.success(res.message); await refreshRoles(); }
      else toast.info(res.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <SiteLayout><Section title="Loading…" description="Checking your access." /></SiteLayout>;

  if (!isAdmin) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Admin"
          title="Admin access required"
          description="Sign in with an admin account, or claim the first super admin if none exists yet."
        >
          <div className="flex gap-2 flex-wrap">
            {user && (
              <Button onClick={() => claim.mutate()} disabled={claim.isPending}>
                Claim first Super Admin
              </Button>
            )}
            <Link to="/"><Button variant="outline" className="glass">Back home</Button></Link>
          </div>
        </Section>
      </SiteLayout>
    );
  }

  return <UsersContent isSuper={isSuper} />;
}

function UsersContent({ isSuper }: { isSuper: boolean }) {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const res = await api.get<{ data: UserRow[] }>("/api/admin/users");
      return res.data ?? [];
    },
  });

  const grant = useMutation({
    mutationFn: (v: { userId: string; role: AppRole }) =>
      api.post(`/api/admin/users/${v.userId}/roles`, { role: v.role }),
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries({ queryKey: ["users-with-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (v: { userId: string; role: AppRole }) =>
      api.delete(`/api/admin/users/${v.userId}/roles/${v.role}`),
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["users-with-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (u: UserRow, role: AppRole, next: boolean) => {
    if (next) grant.mutate({ userId: u.user_id, role });
    else revoke.mutate({ userId: u.user_id, role });
  };

  return (
    <SiteLayout>
      <Section
        eyebrow={isSuper ? "Super Admin" : "Admin"}
        title="Users & roles"
        description={
          isSuper
            ? "Toggle Admin and Super Admin access for any user."
            : "Read-only view. Only Super Admins can grant or revoke Admin and Super Admin roles."
        }
      >
        <div className="mb-6">
          <Link to="/admin/corporate-topup" className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to admin
          </Link>
        </div>

        {!isSuper && (
          <div className="mb-6 flex items-start gap-3 glass rounded-2xl p-4">
            <ShieldAlert className="size-4 text-amber-400 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              You're an Admin but not a Super Admin. Ask a Super Admin to promote you, or use the bootstrap claim if no Super Admin exists.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-muted-foreground">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No users yet.</div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const isAdminRow = u.roles.includes("admin");
              const isSuperRow = u.roles.includes("superadmin");
              return (
                <div key={u.user_id} className="glass rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.email ?? "(no email)"}</div>
                    {u.name && <div className="text-xs text-muted-foreground">{u.name}</div>}
                    <div className="text-xs text-muted-foreground font-mono break-all">{u.user_id}</div>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="capitalize">{r}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Admin</span>
                      <Switch
                        checked={isAdminRow}
                        disabled={!isSuper || grant.isPending || revoke.isPending}
                        onCheckedChange={(v) => toggle(u, "admin", v)}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Crown className="size-4 text-fuchsia-400" />
                      <span>Super Admin</span>
                      <Switch
                        checked={isSuperRow}
                        disabled={!isSuper || grant.isPending || revoke.isPending}
                        onCheckedChange={(v) => toggle(u, "superadmin", v)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </SiteLayout>
  );
}

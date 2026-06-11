import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, ShieldCheck, Users, Megaphone, FileCheck2, Receipt,
  Loader2, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { useAuth } from "@/hooks/use-auth";

const API_URL = import.meta.env.VITE_API_URL as string;

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Musren" },
      { name: "description", content: "Administer users, roles, affiliates and consent." },
    ],
  }),
  component: AdminDashboardPage,
});

const navCards = [
  { href: "/admin/users",          title: "Users & roles",       description: "Grant or revoke access for any team member.",    icon: Users },
  { href: "/admin/role-requests",  title: "Role requests",        description: "Review and approve role change requests.",       icon: FileCheck2 },
  { href: "/admin/affiliates",     title: "Affiliates",           description: "Manage codes, assets, templates and payouts.",   icon: Megaphone },
  { href: "/admin/corporate-topup",title: "Corporate top-ups",    description: "Process bulk top-up requests.",                  icon: Receipt },
  { href: "/admin/consent",        title: "Consent log",          description: "Audit user consent records.",                    icon: ShieldCheck },
] as const;

function AdminDashboardPage() {
  const { user, roles, hasAnyRole, loading } = useAuth();

  // Defense-in-depth: layout route already guards, but block render if somehow bypassed
  if (loading) return <SiteLayout><KpiSkeleton /></SiteLayout>;
  if (!hasAnyRole(["admin", "superadmin", "staff"])) return null;

  return (
    <SiteLayout>
      <Section
        eyebrow="Admin"
        title={<>Welcome back, <span className="text-gradient">{user?.email?.split("@")[0]}</span></>}
        description={`Signed in as ${roles.join(", ") || "admin"}.`}
      >
        <KpiCards />

        <div className="grid gap-4 md:grid-cols-3 mt-8">
          {navCards.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} to={href} className="glass rounded-2xl p-6 transition hover:bg-secondary/70">
              <Icon className="size-7 text-primary" />
              <h2 className="mt-5 font-display text-xl font-bold">{title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </SiteLayout>
  );
}

/* ─── KPI Cards ─────────────────────────────────────────────────────────── */

function KpiCards() {
  const { data: userCount, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-kpi-users"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return count as number | null;
    },
  });

  const { data: pendingWithdrawals, isLoading: wLoading } = useQuery({
    queryKey: ["admin-kpi-withdrawals"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count as number | null;
    },
  });

  const { data: pendingBulkSms, isLoading: smsLoading } = useQuery({
    queryKey: ["admin-kpi-bulk-sms"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return null;
      const res = await fetch(
        `${API_URL}/api/bulk-sms/applications?status=pending&size=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.totalElements as number) ?? null;
    },
  });

  const { data: activeAffiliates, isLoading: affLoading } = useQuery({
    queryKey: ["admin-kpi-affiliates"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("affiliate_wallets")
        .select("user_id", { count: "exact", head: true });
      return count as number | null;
    },
  });

  const kpis = [
    { label: "Total users",         value: userCount,           loading: usersLoading, href: "/admin/users" },
    { label: "Pending withdrawals",  value: pendingWithdrawals,  loading: wLoading,     href: "/admin/affiliates" },
    { label: "Pending SMS apps",     value: pendingBulkSms,      loading: smsLoading,   href: null },
    { label: "Active affiliates",    value: activeAffiliates,    loading: affLoading,   href: "/admin/affiliates" },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, loading, href }) => {
        const inner = (
          <div key={label} className={`glass rounded-2xl p-5 ${href ? "hover:bg-secondary/60 transition cursor-pointer" : ""}`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 font-display text-3xl font-bold">
              {loading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : value == null ? (
                <AlertCircle className="size-6 text-muted-foreground" />
              ) : (
                value.toLocaleString()
              )}
            </div>
          </div>
        );
        return href ? <Link key={label} to={href}>{inner}</Link> : <div key={label}>{inner}</div>;
      })}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <Section title="Loading…" description="Checking your access.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    </Section>
  );
}

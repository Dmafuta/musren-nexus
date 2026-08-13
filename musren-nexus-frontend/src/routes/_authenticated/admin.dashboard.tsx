import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, ShieldCheck, Users, Megaphone, FileCheck2, Receipt,
  Loader2, AlertCircle,
} from "lucide-react";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

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
  { href: "/admin/users",           title: "Users & roles",      description: "Grant or revoke access for any team member.",  icon: Users },
  { href: "/admin/role-requests",   title: "Role requests",       description: "Review and approve role change requests.",     icon: FileCheck2 },
  { href: "/admin/affiliates",      title: "Affiliates",          description: "Manage codes, assets, templates and payouts.", icon: Megaphone },
  { href: "/admin/corporate-topup", title: "Corporate top-ups",   description: "Process bulk top-up requests.",                icon: Receipt },
  { href: "/admin/consent",         title: "Consent log",         description: "Audit user consent records.",                  icon: ShieldCheck },
] as const;

function AdminDashboardPage() {
  const { user, roles, hasAnyRole, loading } = useAuth();

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

interface AdminStats {
  total_users: number;
  pending_withdrawals: number;
  pending_bulk_sms: number;
  active_affiliates: number;
}

function KpiCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStats>("/api/admin/stats"),
  });

  const kpis = [
    { label: "Total users",         value: data?.total_users,         href: "/admin/users" as const },
    { label: "Pending withdrawals",  value: data?.pending_withdrawals,  href: "/admin/affiliates" as const },
    { label: "Pending SMS apps",     value: data?.pending_bulk_sms,     href: null },
    { label: "Active affiliates",    value: data?.active_affiliates,    href: "/admin/affiliates" as const },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, href }) => {
        const inner = (
          <div key={label} className={`glass rounded-2xl p-5 ${href ? "hover:bg-secondary/60 transition cursor-pointer" : ""}`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 font-display text-3xl font-bold">
              {isLoading ? (
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

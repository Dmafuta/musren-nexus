import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AdminShell as SiteLayout } from "@/components/layouts/AdminShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

/**
 * Layout-level guard for all /admin/* routes.
 * Any authenticated user who doesn't have admin/superadmin/staff is shown an
 * access-denied screen — they never see child route content.
 */
function AdminGate() {
  const { hasAnyRole, loading } = useAuth();

  if (loading) {
    return (
      <SiteLayout>
        <Section title="Loading…" description="Checking your access." />
      </SiteLayout>
    );
  }

  if (!hasAnyRole(["admin", "superadmin", "staff"])) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Access denied"
          title="Admin access required"
          description="This area is restricted to Musren admins and staff. Contact a super admin to be assigned the required role."
        >
          <div className="flex gap-3 flex-wrap">
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                Back to dashboard
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="outline" className="glass">
                Claim first super admin
              </Button>
            </Link>
          </div>
        </Section>
      </SiteLayout>
    );
  }

  return <Outlet />;
}

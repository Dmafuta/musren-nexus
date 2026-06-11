import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, HandCoins, Loader2, ShieldCheck, ShoppingBag, UsersRound } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dashboardForAccess, fetchUserProfile, isOnboardingComplete, roleLabels, type UserProfile } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Musren" },
      { name: "description", content: "Your Musren account dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [canClaimSuperadmin, setCanClaimSuperadmin] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any).rpc("has_superadmin").then(({ data }: { data: boolean | null }) => {
      setCanClaimSuperadmin(data === false);
    });
  }, [user]);

  const claimSuperadmin = async () => {
    setClaiming(true);
    try {
      const { data, error } = await (supabase as any).rpc("claim_first_superadmin");
      if (error) throw error;
      if (data) {
        toast.success("You are now Super Admin.");
        await refreshRoles();
        navigate({ to: "/admin/users", replace: true });
      } else {
        toast.info("A Super Admin already exists.");
        setCanClaimSuperadmin(false);
      }
    } catch (err) {
      console.error("[auth] claim superadmin error:", err);
      toast.error("Could not claim Super Admin.");
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (loading || !user) return;
      const nextProfile = await fetchUserProfile(user.id);
      if (!mounted) return;
      if (!isOnboardingComplete(nextProfile)) {
        navigate({ to: "/select-role", replace: true });
        return;
      }
      const target = dashboardForAccess(nextProfile, roles);
      navigate({ to: target as "/customer/dashboard", replace: true });
      return;
      setProfile(nextProfile);
      setChecking(false);
    };
    run().catch((err) => {
      console.error("[auth] dashboard profile check error:", err);
      if (mounted) setChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, [loading, navigate, roles, user]);

  if (loading || checking) {
    return (
      <SiteLayout>
        <Section title="Opening your dashboard…" description="Session restored, redirecting…">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
        </Section>
      </SiteLayout>
    );
  }

  const displayRole = profile?.role ? roleLabels[profile.role] : "Customer";

  return (
    <SiteLayout>
      <Section
        eyebrow="Dashboard"
        title={<>Welcome to Musren, <span className="text-gradient">{user?.email?.split("@")[0]}</span></>}
        description="Your account is verified and onboarding is complete. Choose a workspace to continue."
      >
        <div className="mx-auto mb-8 flex max-w-3xl flex-col items-center gap-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 capitalize">
            {displayRole} account
          </Badge>
        </div>
        {canClaimSuperadmin && (
          <div className="mx-auto mb-10 max-w-5xl rounded-3xl border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 p-8 sm:p-12 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.5)] ring-4 ring-primary/20 animate-pulse-slow">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="rounded-full bg-primary/20 p-5 ring-8 ring-primary/10">
                <ShieldCheck className="size-14 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
                  Claim <span className="text-gradient">Super Admin</span>
                </h2>
                <p className="text-base sm:text-xl text-muted-foreground max-w-2xl">
                  No Super Admin exists yet. Claim this role now to manage all users, roles, and admin settings across Musren.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={claiming} size="lg" className="h-14 px-10 text-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shadow-xl hover:scale-105 transition-transform">
                    {claiming ? <Loader2 className="size-5 animate-spin" /> : <><ShieldCheck className="size-5" /> Claim Super Admin</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Claim Super Admin role?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This grants your account ({user?.email}) full control over all users, roles, and admin settings. Only the first user can claim this — it cannot be undone from here.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={claiming}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={claimSuperadmin} disabled={claiming}>
                      {claiming ? <Loader2 className="size-4 animate-spin" /> : "Yes, claim it"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <WorkspaceCard icon={UsersRound} title="Customer tools" description="Explore Musren solutions and request product access." href="/solutions" />
          <WorkspaceCard icon={HandCoins} title="Affiliate workspace" description="Share referrals and track your rewards." href="/affiliates/dashboard" />
          <WorkspaceCard icon={BriefcaseBusiness} title="Developer workspace" description="Manage API readiness and integration tools." href="/developers/dashboard" />
        </div>
      </Section>
    </SiteLayout>
  );
}

function WorkspaceCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof ShoppingBag;
  title: string;
  description: string;
  href: "/solutions" | "/affiliates/dashboard" | "/developers/dashboard";
}) {
  return (
    <Link to={href} className="glass rounded-2xl p-6 transition hover:bg-secondary/70">
      <Icon className="size-7 text-primary" />
      <h2 className="mt-5 font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button variant="ghost" className="mt-5 px-0 text-primary hover:bg-transparent">
        Open <ArrowRight className="size-4" />
      </Button>
    </Link>
  );
}
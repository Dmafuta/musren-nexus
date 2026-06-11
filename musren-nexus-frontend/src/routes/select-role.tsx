import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, Code2, HandCoins, Loader2, ShoppingBag, UsersRound, Zap } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  completeUserOnboarding,
  dashboardForAccess,
  fetchUserProfile,
  isOnboardingComplete,
  type ProfileRole,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/select-role")({
  head: () => ({
    meta: [
      { title: "Choose your role — Musren" },
      { name: "description", content: "Choose your Musren workspace role to complete onboarding." },
    ],
  }),
  component: SelectRolePage,
});

const roles: Array<{
  value: ProfileRole;
  label: string;
  description: string;
  icon: typeof UsersRound;
}> = [
  { value: "customer", label: "Customer", description: "Buy airtime, data and engagement services.", icon: UsersRound },
  { value: "affiliate", label: "Affiliate", description: "Earn rewards by referring Musren products.", icon: HandCoins },
  { value: "merchant", label: "Merchant", description: "Manage business payments and customer campaigns.", icon: ShoppingBag },
  { value: "developer", label: "Developer", description: "Build with APIs, webhooks and sandbox tools.", icon: Code2 },
];

function SelectRolePage() {
  const { user, roles: accessRoles, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProfileRole | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Checking your onboarding status…");

  useEffect(() => {
    let mounted = true;

    const checkProfile = async () => {
      if (loading) return;
      if (!user) {
        navigate({ to: "/login", search: { redirect: "/select-role" }, replace: true });
        return;
      }

      try {
        const profile = await fetchUserProfile(user.id);
        if (!mounted) return;

        if (isOnboardingComplete(profile)) {
          setMessage("Role already set. Opening your dashboard…");
          navigate({ to: dashboardForAccess(profile, accessRoles) as "/dashboard", replace: true });
          return;
        }

        setChecking(false);
      } catch (err) {
        console.error("[auth] role check error:", err);
        if (mounted) {
          setMessage("We could not confirm your profile yet. Refresh or try again in a moment.");
          setChecking(false);
        }
      }
    };

    checkProfile();
    return () => {
      mounted = false;
    };
  }, [accessRoles, loading, navigate, user]);

  const saveRole = async () => {
    if (!user || !selected) return;
    setSaving(true);
    try {
      const profile = await completeUserOnboarding(user, selected);
      await refreshRoles();
      toast.success("Role saved. Opening your dashboard.");
      navigate({ to: dashboardForAccess(profile, [...accessRoles, selected]) as "/dashboard", replace: true });
    } catch (err) {
      console.error("[auth] role save error:", err);
      toast.error("Could not save your role. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout>
      <section className="container-page section-y">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
                <Zap className="size-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-xl font-bold">Musren</span>
            </Link>
            <Badge variant="outline" className="mt-6 bg-primary/10 text-primary border-primary/30">
              Account verified
            </Badge>
            <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight">Choose your workspace</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
              Pick the role that best matches how you'll use Musren. This is saved once and keeps future logins direct.
            </p>
          </div>

          <div className="rounded-2xl glass-strong border-gradient p-4 sm:p-6">
            {checking ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto size-7 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">{message}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    const active = selected === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelected(role.value)}
                        className={cn(
                          "group min-h-48 rounded-xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-primary bg-primary/12 shadow-[var(--shadow-glow)]"
                            : "border-border bg-background/35 hover:bg-secondary/70",
                        )}
                      >
                        <div className={cn(
                          "grid size-12 place-items-center rounded-xl border transition",
                          active ? "border-primary/40 bg-primary text-primary-foreground" : "border-border bg-secondary text-foreground",
                        )}>
                          <Icon className="size-6" />
                        </div>
                        <div className="mt-5 font-display text-xl font-bold">{role.label}</div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Already set? You'll be skipped automatically on future sign-ins.
                  </p>
                  <Button
                    onClick={saveRole}
                    disabled={!selected || saving}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <BriefcaseBusiness className="size-4" />}
                    Continue to dashboard
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
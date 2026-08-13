import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Zap } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Redirecting — Musren" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // OAuth via Supabase has been removed. Redirect to login.
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-4 section-y text-center">
        <Link to="/" className="inline-flex items-center gap-2 justify-center mb-8">
          <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
            <Zap className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold">Musren</span>
        </Link>
        <p className="text-sm text-muted-foreground">Redirecting…</p>
        <Button asChild variant="outline" className="mt-4 glass">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </section>
    </SiteLayout>
  );
}

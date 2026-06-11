import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Zap } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthRedirect } from "@/lib/onboarding";

const callbackSearchSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s) => callbackSearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Verifying account — Musren" },
      { name: "description", content: "Securely verifying your Musren session." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [status, setStatus] = useState("Verification successful. Restoring your session…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const finish = async () => {
      if (search.error) {
        setError(search.error_description || "Link expired or invalid. Please request a new email.");
        return;
      }

      try {
        if (search.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(search.code);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = data.session?.user;
        if (!user) {
          setError("Session could not be restored. Please sign in again or request a fresh email link.");
          return;
        }

        setStatus("Session restored. Preparing your workspace…");
        const { target } = await resolvePostAuthRedirect(user);
        console.info("[auth] redirect target", target);
        navigate({ to: target as "/dashboard", replace: true });
      } catch (err) {
        console.error("[auth] callback error:", err);
        const msg = (err as Error).message?.toLowerCase() ?? "";
        if (msg.includes("expired") || msg.includes("invalid") || msg.includes("code")) {
          setError("Link expired, resend email and try again.");
        } else {
          setError("We could not finish verification. Please try signing in again.");
        }
      }
    };

    finish();
  }, [navigate, search.code, search.error, search.error_description]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-4 section-y">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Zap className="size-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold">Musren</span>
          </Link>
        </div>

        <div className="rounded-2xl glass-strong p-6 border-gradient text-center">
          {error ? (
            <div className="space-y-4">
              <RotateCcw className="mx-auto size-10 text-destructive" />
              <h1 className="text-2xl font-bold tracking-tight">Link expired</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="grid gap-2">
                <Button asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
                  <Link to="/forgot-password">Resend email</Link>
                </Button>
                <Button asChild variant="outline" className="glass">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="size-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Verification successful</h1>
              <p className="text-sm text-muted-foreground">{status}</p>
              <Loader2 className="mx-auto size-5 animate-spin text-primary" />
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Musren" },
      { name: "description", content: "Reset your Musren account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Invalid email").max(255) });

function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent. Check your inbox.");
    } catch (err) {
      console.error("[auth] reset request error:", err);
      // Always show generic success-style message to avoid email enumeration
      setSent(true);
      toast.success("If an account exists, a reset link has been sent.");
    } finally {
      setBusy(false);
    }
  };

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
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Forgot password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="rounded-2xl glass-strong p-6 border-gradient">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm">
                If an account exists for that email, a password reset link is on its way.
                The link expires shortly — check your inbox (and spam folder).
              </p>
              <Button asChild variant="outline" className="w-full glass">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required maxLength={255} className="mt-1.5 glass" />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
              >
                {busy ? "Sending…" : "Send reset link"}
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="underline hover:text-foreground">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

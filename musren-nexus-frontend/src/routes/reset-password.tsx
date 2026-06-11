import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Musren" },
      { name: "description", content: "Set a new password for your Musren account." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  confirmPassword: z.string().min(8).max(72),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits
    // PASSWORD_RECOVERY when ready. We allow the page if a session exists
    // (recovery already exchanged) or wait briefly for the event.
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/login" });
    } catch (err) {
      console.error("[auth] password update error:", err);
      const msg = (err as Error).message?.toLowerCase() ?? "";
      if (msg.includes("session") || msg.includes("expired") || msg.includes("invalid")) {
        toast.error("Reset link expired or invalid. Please request a new one.");
      } else {
        toast.error("Could not update password. Please try again.");
      }
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
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password you haven't used before.
          </p>
        </div>

        <div className="rounded-2xl glass-strong p-6 border-gradient">
          {!ready ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Validating your reset link…
              </p>
              <p className="text-xs text-muted-foreground">
                If nothing happens, the link may have expired.{" "}
                <Link to="/forgot-password" className="underline hover:text-foreground">
                  Request a new one
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <div className="relative mt-1.5">
                  <Input id="password" name="password" type={showPwd ? "text" : "password"} required minLength={8} maxLength={72} className="glass pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative mt-1.5">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required minLength={8} maxLength={72} className="glass pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
              >
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

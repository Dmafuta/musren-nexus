import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: any) => ({
    token: typeof s.token === "string" ? s.token : "",
    email: typeof s.email === "string" ? s.email : "",
  }),
  head: () => ({
    meta: [
      { title: "Reset password — Musren" },
      { name: "description", content: "Set a new password for your Musren account." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token, email } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const ready = !!(token && email);

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
      await api.post("/api/auth/reset-password", { email, token, password, password_confirmation: password });
      toast.success("Password updated. Please sign in.");
      navigate({ to: "/login" });
    } catch (err) {
      const msg = (err as Error).message?.toLowerCase() ?? "";
      if (msg.includes("expired") || msg.includes("invalid")) {
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
                Invalid or missing reset link.
              </p>
              <Button asChild variant="outline" className="w-full glass">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={72}
                    className="glass pr-10"
                  />
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
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={72}
                    className="glass pr-10"
                  />
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

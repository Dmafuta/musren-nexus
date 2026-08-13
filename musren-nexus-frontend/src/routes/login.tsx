import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { dashboardForAccess } from "@/lib/onboarding";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Musren" },
      { name: "description", content: "Sign in to your Musren dashboard." },
    ],
  }),
  component: LoginPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const signupSchema = credSchema.extend({
  confirmPassword: z.string().min(8).max(72),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function LoginPage() {
  const { isAuthenticated, loading, roles, login, register } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showSigninPwd, setShowSigninPwd] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const PwdToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md"
      aria-label={show ? "Hide password" : "Show password"}
      tabIndex={-1}
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const target = dashboardForAccess(null, roles);
      const safeRedirect =
        search.redirect && !search.redirect.startsWith("/admin") && search.redirect !== "/select-role"
          ? search.redirect
          : undefined;
      navigate({ to: (safeRedirect ?? target) as "/dashboard", replace: true });
    }
  }, [loading, isAuthenticated, navigate, search.redirect, roles]);

  const handle = async (e: React.FormEvent<HTMLFormElement>, mode: "signin" | "signup") => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    if (mode === "signup") {
      const parsed = signupSchema.safeParse({
        email,
        password,
        confirmPassword: String(fd.get("confirmPassword") ?? ""),
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please check your input.");
        return;
      }
    } else {
      const parsed = credSchema.safeParse({ email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please check your input.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        await login(email, password);
        toast.success("Signed in successfully");
      } else {
        await register(email, password);
        toast.success("Account created. Welcome to Musren!");
      }
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const m = msg.toLowerCase();
      if (m.includes("invalid credentials") || m.includes("invalid login")) {
        toast.error("Incorrect email or password. Please try again.");
      } else if (m.includes("unique") || m.includes("already")) {
        toast.error("An account with this email already exists. Try signing in instead.");
      } else if (m.includes("rate limit") || m.includes("too many")) {
        toast.error("Too many attempts. Please wait a moment and try again.");
      } else {
        toast.error(msg || (mode === "signin" ? "Could not sign you in." : "Could not create your account."));
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
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your dashboard or create an account.
          </p>
        </div>

        <div className="rounded-2xl glass-strong p-6 border-gradient">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={(e) => handle(e, "signin")} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} className="mt-1.5 glass" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      name="password"
                      type={showSigninPwd ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={72}
                      className="glass pr-10"
                    />
                    <PwdToggle show={showSigninPwd} onToggle={() => setShowSigninPwd((v) => !v)} />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={(e) => handle(e, "signup")} className="space-y-4">
                <div>
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" name="email" type="email" required maxLength={255} className="mt-1.5 glass" />
                </div>
                <div>
                  <Label htmlFor="password2">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password2"
                      name="password"
                      type={showSignupPwd ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={72}
                      className="glass pr-10"
                    />
                    <PwdToggle show={showSignupPwd} onToggle={() => setShowSignupPwd((v) => !v)} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPwd ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={72}
                      className="glass pr-10"
                    />
                    <PwdToggle show={showConfirmPwd} onToggle={() => setShowConfirmPwd((v) => !v)} />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SiteLayout>
  );
}

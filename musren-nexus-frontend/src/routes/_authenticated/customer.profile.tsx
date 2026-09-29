import { createFileRoute } from "@tanstack/react-router";
import { UserRound, Mail, Phone, ShieldCheck } from "lucide-react";
import { CustomerShell } from "@/components/layouts/CustomerShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/customer/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Musren" },
      { name: "description", content: "Your Musren account profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, roles } = useAuth();

  const initials = (user?.name ?? user?.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <CustomerShell>
      <Section
        eyebrow="Profile"
        title={<>Your <span className="text-gradient">account</span></>}
        description="Your Musren Connect account details."
      >
        <div className="max-w-lg space-y-4">
          {/* Avatar + name */}
          <div className="glass rounded-2xl p-6 flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold text-xl shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-display text-xl font-bold">{user?.name ?? "—"}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{user?.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <Badge key={r} variant="outline" className="capitalize bg-primary/10 text-primary border-primary/30 text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="glass rounded-2xl divide-y divide-border/40">
            <DetailRow icon={<Mail className="size-4 text-muted-foreground" />} label="Email" value={user?.email ?? "—"} />
            <DetailRow icon={<Phone className="size-4 text-muted-foreground" />} label="Phone" value={"—"} />
            <DetailRow icon={<UserRound className="size-4 text-muted-foreground" />} label="User ID" value={user?.id ?? "—"} mono />
            <DetailRow
              icon={<ShieldCheck className="size-4 text-muted-foreground" />}
              label="Roles"
              value={roles.join(", ") || "—"}
            />
          </div>

          <p className="text-xs text-muted-foreground px-1">
            To update your name, phone or email, contact{" "}
            <a href="mailto:support@musren.co.ke" className="text-primary hover:underline">
              support@musren.co.ke
            </a>
          </p>
        </div>
      </Section>
    </CustomerShell>
  );
}

function DetailRow({
  icon, label, value, mono,
}: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm mt-0.5 truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
      </div>
    </div>
  );
}

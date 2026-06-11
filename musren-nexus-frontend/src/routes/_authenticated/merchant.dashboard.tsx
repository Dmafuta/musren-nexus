import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Users, TrendingUp, BarChart3, Settings2, Upload, LayoutTemplate } from "lucide-react";
import { MerchantShell as SiteLayout } from "@/components/layouts/MerchantShell";
import { Section } from "@/components/site/Section";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RolesBadges } from "@/components/site/RolesBadges";

export const Route = createFileRoute("/_authenticated/merchant/dashboard")({
  head: () => ({
    meta: [
      { title: "Merchant dashboard — Musren" },
      { name: "description", content: "Your merchant workspace — campaigns, affiliates, conversions and analytics." },
    ],
  }),
  component: MerchantDashboard,
});

const cards = [
  { icon: Megaphone, title: "Campaigns", desc: "Create and manage marketing campaigns." },
  { icon: Users, title: "Affiliates", desc: "Onboard partners promoting your products." },
  { icon: TrendingUp, title: "Conversions", desc: "Track signups and purchases." },
  { icon: BarChart3, title: "Sales analytics", desc: "Revenue, channel and cohort reports." },
  { icon: Settings2, title: "Reward configuration", desc: "Set per-product reward rules." },
  { icon: Upload, title: "Uploads", desc: "Posters, logos and creative assets." },
  { icon: LayoutTemplate, title: "Landing pages", desc: "Branded campaign landing pages." },
];

function MerchantDashboard() {
  const { user, hasAnyRole } = useAuth();
  const allowed = hasAnyRole(["merchant", "admin", "superadmin", "staff"]);
  if (!allowed) {
    return (
      <SiteLayout>
        <Section
          eyebrow="Merchant"
          title="Merchant access required"
          description="Your account doesn't have merchant access yet."
        >
          <div className="space-y-5">
            <RolesBadges highlightMissing="merchant" />
            <p className="text-sm text-muted-foreground max-w-md">
              Contact a Musren admin to enable merchant access for your account.
            </p>
            <Link to="/contact"><Button variant="outline" className="glass">Contact support</Button></Link>
          </div>
        </Section>
      </SiteLayout>
    );
  }
  return (
    <SiteLayout>
      <Section
        eyebrow="Merchant"
        title={<>Welcome, <span className="text-gradient">{user?.email?.split("@")[0]}</span></>}
        description="Run campaigns, manage affiliates and track conversions."
      >
        <div className="mb-6"><Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Merchant account</Badge></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c) => (
            <div key={c.title} className="glass rounded-2xl p-6">
              <c.icon className="size-6 text-primary mb-3" />
              <div className="font-semibold mb-1">{c.title}</div>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </SiteLayout>
  );
}

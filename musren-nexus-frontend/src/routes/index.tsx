import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Check, Code2, Globe2, Shield, Sparkles, Users, Zap, BarChart3 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";
import { useAuth } from "@/hooks/use-auth";
import { dashboardForAccess } from "@/lib/onboarding";
import heroImg from "@/assets/hero-network.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Musren — Telecom & Customer Engagement Technology" },
      { name: "description", content: "Trusted telecom and customer engagement partner. Bulk SMS, USSD, Shortcodes, WhatsApp APIs and enterprise messaging infrastructure for Africa." },
      { property: "og:title", content: "Musren — Telecom & Customer Engagement Technology" },
      { property: "og:description", content: "Bulk SMS, USSD, Shortcodes, WhatsApp APIs and enterprise messaging infrastructure for Africa." },
    ],
  }),
  component: Home,
});

function Home() {
  const { isAuthenticated, loading, roles } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const target = dashboardForAccess(null, roles);
      navigate({ to: target as "/customer/dashboard", replace: true });
    }
  }, [loading, isAuthenticated, roles, navigate]);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/85 to-background" aria-hidden />
        <div className="absolute inset-0 -z-10 grid-bg opacity-30" aria-hidden />

        <div className="container-wide section-y-lg">
          <div className="mx-auto text-center max-w-5xl">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-semibold text-primary border border-primary/30 shadow-[0_0_30px_-8px_var(--primary)]">
              <Sparkles className="size-4" /> Trusted for 6+ years powering African enterprises
            </span>
            <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.02] tracking-tight">
              Technology and{" "}
              <span className="text-gradient">Customer Experience</span>{" "}
              Converge with Musren
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Trusted telecom and customer engagement technology partner delivering Bulk
              SMS, USSD, Shortcodes, WhatsApp solutions, APIs, and enterprise messaging
              infrastructure.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              <Link to="/contact">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow hover:opacity-90">
                  Talk to sales <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
              <Link to="/solutions">
                <Button size="lg" variant="outline" className="glass border-white/10 hover:bg-white/5">
                  Explore solutions
                </Button>
              </Link>
            </div>

            <div className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 max-w-4xl mx-auto">
              {[
                ["6+", "Years experience"],
                ["10M+", "Messages / month"],
                ["99.9%", "Uptime SLA"],
                ["50+", "Enterprise clients"],
              ].map(([k, v]) => (
                <div key={v} className="text-center">
                  <div className="font-display text-4xl sm:text-5xl font-bold text-gradient">{k}</div>
                  <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* SOLUTIONS */}
      <Section
        eyebrow="Solutions"
        title={<>One platform.<br /><span className="text-gradient">Every channel.</span></>}
        description="Build, send, and measure customer engagement across SMS, USSD, voice and WhatsApp from a single API and dashboard."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </Section>

      {/* INDUSTRIES */}
      <Section
        eyebrow="Industries"
        title="Built for the businesses that move Africa"
        description="From fintech and SACCOs to retail, agriculture, healthcare and government."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Fintech & SACCOs", "OTP, account alerts, USSD self-service and disbursement notifications."],
            ["Retail & E-commerce", "Promotions, loyalty programs, order tracking and customer surveys."],
            ["Healthcare", "Appointment reminders, lab results, campaigns and patient engagement."],
            ["Education", "Fees reminders, exam results, parent updates and admissions."],
            ["Agriculture", "Market prices, weather alerts, training and farmer engagement."],
            ["Government & NGO", "Citizen messaging, emergency broadcasts and feedback collection."],
          ].map(([t, d]) => (
            <div key={t} className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition">
              <h3 className="font-display font-semibold text-lg">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* DEVELOPERS + AFFILIATES split */}
      <Section eyebrow="Ecosystem" title="Build, refer, and earn">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative rounded-3xl glass-strong p-8 sm:p-10 overflow-hidden border-gradient">
            <div className="absolute -top-24 -right-24 size-72 bg-accent/15 blur-3xl rounded-full" />
            <Code2 className="size-8 text-accent" />
            <h3 className="mt-5 font-display text-3xl font-bold">Developer Platform</h3>
            <p className="mt-3 text-muted-foreground max-w-md">
              Clean REST APIs, webhooks, SDKs and a free sandbox. Ship messaging in minutes.
            </p>
            <pre className="mt-6 rounded-xl bg-black/40 border border-white/10 p-4 text-xs font-mono overflow-x-auto">
{`POST https://api.musren.com/v1/sms
{
  "to": "+2547XXXXXXXX",
  "from": "MUSREN",
  "message": "Welcome to the future."
}`}
            </pre>
            <div className="mt-6 flex gap-3">
              <Link to="/developers"><Button variant="outline" className="glass">Read docs</Button></Link>
              <Link to="/login"><Button className="bg-accent text-accent-foreground hover:opacity-90">Get API keys</Button></Link>
            </div>
          </div>

          <div className="relative rounded-3xl glass-strong p-8 sm:p-10 overflow-hidden border-gradient">
            <div className="absolute -bottom-24 -left-24 size-72 bg-primary/15 blur-3xl rounded-full" />
            <Users className="size-8 text-primary" />
            <h3 className="mt-5 font-display text-3xl font-bold">Affiliate Program</h3>
            <p className="mt-3 text-muted-foreground max-w-md">
              Refer Musren products and earn rewards — airtime, data, or M-Pesa cash. Modern dashboards, leaderboards and campaigns.
            </p>
            <ul className="mt-6 space-y-2.5">
              {["Track clicks, signups, conversions", "Redeem to airtime, data or M-Pesa", "Compete on anonymous leaderboards"].map((i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="size-4 text-primary mt-0.5 shrink-0" /> {i}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3">
              <Link to="/affiliates"><Button variant="outline" className="glass">Learn more</Button></Link>
              <Link to="/login"><Button className="bg-primary text-primary-foreground hover:opacity-90">Become an affiliate</Button></Link>
            </div>
          </div>
        </div>
      </Section>

      {/* WHY MUSREN */}
      <Section eyebrow="Why Musren" title="Enterprise-grade by design">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            [Shield, "Compliance ready", "Direct MNO routes, audit trails and regulator-friendly logs."],
            [Zap, "Lightning fast", "Sub-second OTP delivery on tier-1 routes."],
            [Globe2, "Pan-African reach", "Aggregated coverage across major African markets."],
            [BarChart3, "Real analytics", "Delivery, engagement and ROI dashboards out of the box."],
          ].map(([Icon, t, d]) => (
            <div key={t as string} className="glass rounded-2xl p-6">
              <Icon className="size-6 text-primary" />
              <h4 className="mt-4 font-display font-semibold">{t as string}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{d as string}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="relative rounded-3xl glass-strong overflow-hidden border-gradient p-10 sm:p-16 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/15" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-5xl font-bold">
              Ready to engage your customers <span className="text-gradient">at scale?</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Talk to our team about your messaging, USSD or WhatsApp project. We'll have you live in days, not months.
            </p>
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              <Link to="/contact">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow">
                  Get in touch <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
              <Link to="/solutions">
                <Button size="lg" variant="outline" className="glass">View solutions</Button>
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}

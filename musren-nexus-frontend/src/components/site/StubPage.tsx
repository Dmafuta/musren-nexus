import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "./SiteLayout";
import { Section } from "./Section";
import { Button } from "@/components/ui/button";

export function StubPage({
  eyebrow,
  title,
  description,
  bullets,
  ctaHref = "/contact",
  ctaLabel = "Talk to sales",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  bullets?: string[];
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
}) {
  return (
    <SiteLayout>
      <Section eyebrow={eyebrow} title={title} description={description}>
        {bullets && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bullets.map((b) => (
              <div key={b} className="glass rounded-2xl p-6 text-foreground/90">{b}</div>
            ))}
          </div>
        )}
        {children}
        <div className="mt-12 flex gap-3 flex-wrap">
          <Link to={ctaHref}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow">
              {ctaLabel} <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
          <Link to="/solutions">
            <Button size="lg" variant="outline" className="glass">View solutions</Button>
          </Link>
        </div>
      </Section>
    </SiteLayout>
  );
}

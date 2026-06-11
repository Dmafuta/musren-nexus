import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { getProduct, products } from "@/lib/products";
import { BulkSmsForm } from "@/components/site/BulkSmsForm";
import { CorporateTopupForm } from "@/components/site/CorporateTopupForm";

export const Route = createFileRoute("/solutions/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    const p = loaderData ? getProduct(loaderData.slug) : undefined;
    return {
      meta: p
        ? [
            { title: `${p.name} — Musren` },
            { name: "description", content: p.description },
            { property: "og:title", content: `${p.name} — Musren` },
            { property: "og:description", content: p.description },
          ]
        : [{ title: "Solution — Musren" }],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <Section title="Solution not found">
        <Link to="/solutions" className="text-primary">Back to solutions</Link>
      </Section>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <Section title="Something went wrong">
        <p className="text-muted-foreground">{error.message}</p>
      </Section>
    </SiteLayout>
  ),
  component: SolutionDetail,
});

function SolutionDetail() {
  const { slug } = Route.useLoaderData();
  const product = getProduct(slug);

  if (!product) {
    throw notFound();
  }

  const Icon = product.icon;
  const others = products.filter((p) => p.slug !== product.slug).slice(0, 3);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 grid-bg opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container-page section-y">
          <Link to="/solutions" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            ← All solutions
          </Link>
          <div className="mt-6 flex items-start gap-5">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center glow shrink-0">
              <Icon className="size-7 text-primary" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-primary">{product.tagline}</span>
              <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">{product.name}</h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl">{product.description}</p>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <a href="#inquiry">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow">
                Request onboarding <ArrowRight className="ml-1 size-4" />
              </Button>
            </a>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="glass">Talk to sales</Button>
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            ["Features", product.features],
            ["Use cases", product.useCases],
            ["Benefits", product.benefits],
          ].map(([title, items]) => (
            <div key={title as string} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-display font-semibold">{title as string}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {(items as readonly string[]).map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="size-4 text-primary mt-0.5 shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Get started"
        title={
          product.slug === "bulk-sms"
            ? "Apply for a Sender ID"
            : product.slug === "corporate-topup"
              ? "Request a Corporate Topup account"
              : `Inquire about ${product.name}`
        }
        description="Send us your details and our team will reach out within one business day."
        className="!pt-0"
      >
        <div id="inquiry" className="rounded-3xl glass-strong p-6 sm:p-10 border-gradient">
          {product.slug === "corporate-topup" ? (
            <CorporateTopupForm />
          ) : (
            <BulkSmsForm productName={product.name} />
          )}
        </div>
      </Section>

      <Section eyebrow="Explore" title="Other solutions">
        <div className="grid sm:grid-cols-3 gap-5">
          {others.map((p) => {
            const I = p.icon;
            return (
              <Link key={p.slug} to="/solutions/$slug" params={{ slug: p.slug }}
                className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition group">
                <I className="size-5 text-primary" />
                <h4 className="mt-3 font-display font-semibold">{p.name}</h4>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{p.description}</p>
                <div className="mt-4 text-sm text-primary inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                  Read more <ArrowRight className="size-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </Section>
    </SiteLayout>
  );
}

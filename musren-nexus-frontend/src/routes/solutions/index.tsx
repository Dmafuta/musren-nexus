import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { ProductCard } from "@/components/site/ProductCard";
import { products } from "@/lib/products";

export const Route = createFileRoute("/solutions/")({
  head: () => ({
    meta: [
      { title: "Solutions — Musren" },
      { name: "description", content: "Bulk SMS, USSD, Shortcodes, WhatsApp APIs, surveys, loyalty and enterprise messaging." },
      { property: "og:title", content: "Solutions — Musren" },
      { property: "og:description", content: "Every customer engagement channel, one platform." },
    ],
  }),
  component: SolutionsIndex,
});

function SolutionsIndex() {
  return (
    <SiteLayout>
      <Section
        eyebrow="Solutions"
        title={<>Engagement built for <span className="text-gradient">every channel</span></>}
        description="Pick a product to learn more, see use cases, or request onboarding."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </Section>
    </SiteLayout>
  );
}

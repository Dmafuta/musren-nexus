import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Copy, ExternalLink, Share2 } from "lucide-react";
import { AffiliateShell } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliates/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Musren Affiliate" },
      { name: "description", content: "Marketing assets and share templates for every Musren product." },
    ],
  }),
  component: MarketingPage,
});

const channels = [
  { label: "WhatsApp", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { label: "Twitter/X", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  { label: "Facebook", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { label: "LinkedIn", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
];

const templates: Record<string, string[]> = {
  "bulk-sms": [
    "Tired of low SMS delivery rates? Try Musren Bulk SMS — instant delivery, competitive pricing. Sign up here: {link}",
    "Reach thousands of customers instantly with Musren Bulk SMS. Get started: {link}",
  ],
  "ussd": [
    "Build your own USSD menu in minutes with Musren USSD. No tech skills needed. Try it: {link}",
    "Give your customers 24/7 self-service with a custom USSD menu. Start here: {link}",
  ],
  "shortcodes": [
    "Get a premium shortcode for your business and collect feedback or run campaigns. Learn more: {link}",
  ],
  "whatsapp-api": [
    "Automate your customer support on WhatsApp with Musren's API. Free trial available: {link}",
  ],
  "surveys": [
    "Collect customer feedback at scale with Musren Surveys — SMS, USSD or WhatsApp. Try it: {link}",
  ],
  "loyalty-rewards": [
    "Reward your customers and boost retention with Musren Loyalty & Rewards. Get started: {link}",
  ],
  "engagement-apis": [
    "Power your app with Musren Engagement APIs — SMS, push, email in one SDK. Docs here: {link}",
  ],
  "corporate-topup": [
    "Top up your team's airtime and data in bulk with Musren Corporate Topup. Sign up: {link}",
  ],
  "enterprise-messaging": [
    "Enterprise-grade messaging for large-scale campaigns. Musren has you covered: {link}",
  ],
};

function MarketingPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://musren.co.ke";

  return (
    <AffiliateShell>
      <Section
        eyebrow="Marketing"
        title={<>Marketing <span className="text-gradient">assets</span></>}
        description="Ready-made copy templates and deep links for every product. Pick a product, grab a template, share and earn."
      >
        {/* Channel legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-muted-foreground self-center">Share on:</span>
          {channels.map((ch) => (
            <Badge key={ch.label} variant="outline" className={ch.color}>{ch.label}</Badge>
          ))}
        </div>

        <div className="space-y-4">
          {products.map((p) => {
            const Icon = p.icon;
            const productTemplates = templates[p.slug] ?? [
              `Check out ${p.name} by Musren — ${p.tagline}. Learn more: {link}`,
            ];
            const shareLink = `${origin}/solutions/${p.slug}`;

            return (
              <div key={p.slug} className="glass rounded-2xl overflow-hidden">
                {/* Product header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center shrink-0">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.tagline}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="glass text-xs"
                      onClick={() => { navigator.clipboard.writeText(shareLink); toast.success("Link copied"); }}
                    >
                      <Copy className="size-3.5 mr-1" /> Copy link
                    </Button>
                    <Link to="/affiliates/promote/$slug" params={{ slug: p.slug }}>
                      <Button size="sm" variant="outline" className="glass text-xs">
                        <Share2 className="size-3.5 mr-1" /> Promote
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Templates */}
                <div className="p-4 space-y-2">
                  {productTemplates.map((tpl, i) => {
                    const text = tpl.replace("{link}", shareLink);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-background/30 rounded-xl px-4 py-3 border border-border/30 group"
                      >
                        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{text}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition"
                          onClick={() => { navigator.clipboard.writeText(text); toast.success("Template copied"); }}
                          title="Copy template"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(productTemplates[0].replace("{link}", shareLink))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" /> Share on WhatsApp
                    </a>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(productTemplates[0].replace("{link}", shareLink))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" /> Post on X
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </AffiliateShell>
  );
}

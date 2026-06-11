import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/site/StubPage";

export const Route = createFileRoute("/affiliates")({
  head: () => ({
    meta: [
      { title: "Affiliates — Musren" },
      { name: "description", content: "Refer Musren products and earn rewards — airtime, data or M-Pesa cash." },
      { property: "og:title", content: "Affiliates — Musren" },
      { property: "og:description", content: "Earn by referring Musren products." },
    ],
  }),
  component: () => (
    <StubPage
      eyebrow="Affiliates"
      title={<>Earn by referring <span className="text-gradient">Musren products</span></>}
      description="A modern affiliate ecosystem with referral links, leaderboards, campaigns and instant rewards."
      bullets={[
        "Personal referral links and QR codes.",
        "Track clicks, signups, conversions and revenue.",
        "Compete on anonymous leaderboards.",
        "Redeem to airtime, data bundles or M-Pesa.",
        "Join campaigns and brand challenges.",
        "Trainings, forums and partner events.",
      ]}
      ctaHref="/affiliates/dashboard"
      ctaLabel="Open affiliate dashboard"
    />
  ),
});

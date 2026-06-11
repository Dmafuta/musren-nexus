import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/site/StubPage";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "Developers — Musren" },
      { name: "description", content: "APIs, SDKs, webhooks and a free sandbox for building messaging and engagement workflows." },
      { property: "og:title", content: "Developers — Musren" },
      { property: "og:description", content: "Build messaging in minutes." },
    ],
  }),
  component: () => (
    <StubPage
      eyebrow="Developers"
      title={<>Ship messaging <span className="text-gradient">in minutes</span></>}
      description="Clean REST APIs, webhooks, SDKs and a free sandbox. Sign in to access keys, docs and the developer forum."
      bullets={[
        "REST APIs for SMS, USSD, WhatsApp and OTP.",
        "Webhooks with retries and signed payloads.",
        "Sandbox keys and sample apps.",
        "SDKs for Node, Python, PHP and Java.",
        "Technical forums and developer events.",
        "Status page and SLAs you can trust.",
      ]}
      ctaHref="/developers/dashboard"
      ctaLabel="Open developer dashboard"
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/site/StubPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Musren" },
      { name: "description", content: "Musren is an African telecom and customer engagement technology company with 6+ years of experience." },
      { property: "og:title", content: "About — Musren" },
      { property: "og:description", content: "Building the engagement layer for African enterprises." },
    ],
  }),
  component: () => (
    <StubPage
      eyebrow="About"
      title={<>Building the engagement layer for <span className="text-gradient">African enterprises</span></>}
      description="Six years of building telecom and customer engagement infrastructure that businesses across Africa rely on every day."
      bullets={[
        "Founded with a mission to simplify customer engagement.",
        "Direct relationships with major MNOs.",
        "Trusted by SACCOs, fintechs, retailers and governments.",
        "A modern platform built by African engineers.",
        "Scaling messaging to millions, reliably.",
        "Customer-obsessed and operator-friendly.",
      ]}
    />
  ),
});

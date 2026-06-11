import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/site/StubPage";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — Musren" },
      { name: "description", content: "Telecom and engagement solutions for fintech, retail, healthcare, education, agriculture and government." },
      { property: "og:title", content: "Industries — Musren" },
      { property: "og:description", content: "Built for the businesses that move Africa." },
    ],
  }),
  component: () => (
    <StubPage
      eyebrow="Industries"
      title={<>Built for the businesses that <span className="text-gradient">move Africa</span></>}
      description="From regulated fintech rails to retail engagement and citizen services — Musren powers messaging across every sector."
      bullets={[
        "Fintech & SACCOs — OTP, alerts, USSD self-service.",
        "Retail & E-commerce — promos, loyalty, order tracking.",
        "Healthcare — reminders, results, patient engagement.",
        "Education — fees, results, parent updates.",
        "Agriculture — prices, weather, training.",
        "Government & NGO — citizen messaging and broadcasts.",
      ]}
    />
  ),
});

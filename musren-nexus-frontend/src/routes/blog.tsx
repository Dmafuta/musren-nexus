import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/site/StubPage";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog & News — Musren" },
      { name: "description", content: "Telecom news, product updates, tutorials and success stories from Musren." },
      { property: "og:title", content: "Blog & News — Musren" },
      { property: "og:description", content: "Insights from Africa's customer engagement frontier." },
    ],
  }),
  component: () => (
    <StubPage
      eyebrow="Blog & News"
      title={<>Insights from the <span className="text-gradient">engagement frontier</span></>}
      description="Product updates, engineering deep-dives, success stories and African telecom news."
      bullets={[
        "Product launches and changelogs.",
        "Engineering and API deep-dives.",
        "Customer success stories.",
        "Industry research and reports.",
        "Tutorials and best practices.",
        "Founder essays.",
      ]}
      ctaLabel="Subscribe"
    />
  ),
});

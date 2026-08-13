import { createFileRoute } from "@tanstack/react-router";

// Public referral redirect: /api/public/r/:code?p=bulk-sms&ch=whatsapp
// Delegates tracking to Laravel GET /api/referral/{code} which awards points,
// then 302-redirects to the destination product page (or /).
export const Route = createFileRoute("/api/public/r/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const product = url.searchParams.get("p");
        const channel = url.searchParams.get("ch");
        const dest = product ? `/solutions/${product}` : "/";

        try {
          const backendUrl = process.env.VITE_API_URL || "http://127.0.0.1:8000";
          const qs = new URLSearchParams();
          if (product) qs.set("p", product);
          if (channel) qs.set("ch", channel);
          // Fire-and-forget — Laravel handles tracking + redirect internally,
          // but we only need the tracking side-effect here.
          await fetch(`${backendUrl}/api/referral/${params.code}?${qs}`, {
            method: "GET",
            redirect: "manual", // don't follow Laravel's redirect
          });
        } catch (e) {
          // never block the redirect on tracking failure
          console.error("referral tracking failed:", e);
        }

        return new Response(null, { status: 302, headers: { Location: dest } });
      },
    },
  },
});

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
          // Use the request's own origin so this works in dev (Vite proxy) and production
          // (Cloudflare Worker passes /api/* to VPS origin automatically).
          const origin = new URL(request.url).origin;
          const qs = new URLSearchParams();
          if (product) qs.set("p", product);
          if (channel) qs.set("ch", channel);
          await fetch(`${origin}/api/referral/${params.code}?${qs}`, {
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

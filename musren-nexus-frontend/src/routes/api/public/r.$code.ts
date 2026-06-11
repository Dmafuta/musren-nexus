import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// Public referral redirect: /api/public/r/:code?p=bulk-sms
// - records a `click` event server-side (with hashed IP + UA for dedupe)
// - then 302-redirects to the destination product page (or /)
export const Route = createFileRoute("/api/public/r/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
          const product = url.searchParams.get("p");
          const channel = url.searchParams.get("ch");
          const dest = product ? `/solutions/${product}` : "/";

        try {
          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "";
          const ua = request.headers.get("user-agent") || "";
          const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
          const uaHash = ua ? createHash("sha256").update(ua).digest("hex") : null;

          await sb.rpc("affiliate_track_event", {
            _code: params.code,
            _kind: "click",
            _product_slug: product,
            _ip_hash: ipHash,
            _ua_hash: uaHash,
            _revenue_cents: 0,
            _channel: channel,
          } as any);
        } catch (e) {
          // never block the redirect on tracking failure
          console.error("referral tracking failed:", e);
        }

        return new Response(null, { status: 302, headers: { Location: dest } });
      },
    },
  },
});

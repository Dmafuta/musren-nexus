// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Force Nitro to run during `vite build` (outside the Lovable sandbox).
  // The cloudflare-module preset outputs .output/server/{index.mjs,wrangler.json}
  // which the CI deploy step consumes with `wrangler deploy --config`.
  nitro: { preset: "cloudflare-module" },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          // Keep TanStack Start's own /api/public/* routes local
          bypass: (req) => {
            if (req.url?.startsWith("/api/public/")) return req.url;
            return null;
          },
        },
      },
    },
  },
});

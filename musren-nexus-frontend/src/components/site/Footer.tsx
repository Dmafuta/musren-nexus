import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function Footer() {
  const cols = [
    {
      title: "Solutions",
      links: [
        ["Bulk SMS", "/solutions/bulk-sms"],
        ["USSD", "/solutions/ussd"],
        ["Shortcodes", "/solutions/shortcodes"],
        ["WhatsApp API", "/solutions/whatsapp"],
        ["Surveys", "/solutions/surveys"],
      ],
    },
    {
      title: "Platform",
      links: [
        ["Developers", "/developers"],
        ["Affiliates", "/affiliates"],
        ["Industries", "/industries"],
        ["Pricing", "/contact"],
      ],
    },
    {
      title: "Company",
      links: [
        ["About", "/about"],
        ["Blog & News", "/blog"],
        ["Contact", "/contact"],
        ["Privacy Center", "/privacy-center"],
      ],
    },
  ] as const;

  return (
    <footer className="mt-32 border-t border-border">
      <div className="container-page section-y">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
                <Zap className="size-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold">Musren</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              Trusted telecom and customer engagement technology — Bulk SMS, USSD,
              Shortcodes, WhatsApp, APIs and enterprise messaging infrastructure.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-semibold mb-4">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} className="text-sm text-muted-foreground hover:text-foreground transition">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Musren. All rights reserved.</p>
          <p>Built for African telecom innovation.</p>
        </div>
      </div>
    </footer>
  );
}

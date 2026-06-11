import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConsent, ACCEPT_ALL, type ConsentMap } from "@/hooks/use-consent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Cookie } from "lucide-react";

export function ConsentBanner() {
  const { ready, needsPrompt, choices, save } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<ConsentMap>(choices);

  if (!ready || !needsPrompt) return null;

  const acceptAll = () => save(ACCEPT_ALL, "banner-accept-all");
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false, personalization: false }, "banner-reject");
  const saveCustom = () => save(draft, "banner-custom");

  return (
    <div
      role="dialog"
      aria-label="Cookie and privacy preferences"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-semibold">Your privacy matters</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We use essential cookies to run Musren and optional ones for analytics, marketing
              and personalization. You can change your choices anytime in the{" "}
              <Link to="/privacy-center" className="underline underline-offset-2">Privacy Center</Link>.
            </p>

            {expanded && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/60 p-3">
                {(["necessary","analytics","marketing","personalization"] as const).map((cat) => (
                  <div key={cat} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium capitalize">{cat}</div>
                      <div className="text-xs text-muted-foreground">{labels[cat]}</div>
                    </div>
                    <Switch
                      checked={cat === "necessary" ? true : draft[cat]}
                      disabled={cat === "necessary"}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, [cat]: v }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!expanded ? (
                <>
                  <Button size="sm" onClick={acceptAll}>Accept all</Button>
                  <Button size="sm" variant="outline" onClick={rejectAll}>Only essential</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(choices); setExpanded(true); }}>Customize</Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={saveCustom}>Save preferences</Button>
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Back</Button>
                </>
              )}
              <Link to="/privacy-center" className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                Privacy Center →
              </Link>
            </div>
          </div>
          <button
            aria-label="Dismiss with essential only"
            onClick={rejectAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const labels: Record<string, string> = {
  necessary: "Required for login, security and core platform features.",
  analytics: "Helps us measure usage so we can improve performance.",
  marketing: "Lets us show you relevant offers and campaigns.",
  personalization: "Tailors content and recommendations to you.",
};

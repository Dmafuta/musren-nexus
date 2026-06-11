import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const CONSENT_CATEGORIES = ["necessary", "analytics", "marketing", "personalization"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];
export type ConsentMap = Record<ConsentCategory, boolean>;

const STORAGE_KEY = "musren_consent_v1";
const FALLBACK_VERSION = "1.0";

type StoredConsent = { version: string; choices: ConsentMap; ts: number };

interface ConsentSettings {
  active_policy_version: string;
  default_analytics: boolean;
  default_marketing: boolean;
  default_personalization: boolean;
  reprompt_on_version_change: boolean;
}

const FALLBACK_SETTINGS: ConsentSettings = {
  active_policy_version: FALLBACK_VERSION,
  default_analytics: false,
  default_marketing: false,
  default_personalization: false,
  reprompt_on_version_change: true,
};

function buildDefault(s: ConsentSettings): ConsentMap {
  return {
    necessary: true,
    analytics: s.default_analytics,
    marketing: s.default_marketing,
    personalization: s.default_personalization,
  };
}

export const ACCEPT_ALL: ConsentMap = {
  necessary: true,
  analytics: true,
  marketing: true,
  personalization: true,
};

function readLocal(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConsent;
  } catch { return null; }
}

function writeLocal(version: string, choices: ConsentMap) {
  if (typeof window === "undefined") return;
  const payload: StoredConsent = { version, choices, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

interface ConsentContextValue {
  ready: boolean;
  needsPrompt: boolean;
  choices: ConsentMap;
  policyVersion: string;
  save: (choices: ConsentMap, source?: string) => Promise<void>;
  withdraw: () => Promise<void>;
  reopenBanner: () => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ConsentSettings>(FALLBACK_SETTINGS);
  const [choices, setChoices] = useState<ConsentMap>(buildDefault(FALLBACK_SETTINGS));
  const [needsPrompt, setNeedsPrompt] = useState(false);
  const [ready, setReady] = useState(false);

  // Load admin settings, then hydrate from local storage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("consent_settings")
        .select("active_policy_version, default_analytics, default_marketing, default_personalization, reprompt_on_version_change")
        .eq("id", 1).maybeSingle();
      if (cancelled) return;
      const s: ConsentSettings = data ?? FALLBACK_SETTINGS;
      setSettings(s);
      const local = readLocal();
      const versionMatches = local && local.version === s.active_policy_version;
      const versionAcceptable = local && (versionMatches || !s.reprompt_on_version_change);
      if (local && versionAcceptable) {
        setChoices({ ...buildDefault(s), ...local.choices, necessary: true });
        setNeedsPrompt(false);
      } else {
        setChoices(buildDefault(s));
        setNeedsPrompt(true);
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next: ConsentMap, source: string) => {
    if (!user) return;
    const items = CONSENT_CATEGORIES.map((c) => ({ category: c, granted: next[c] }));
    await supabase.rpc("record_user_consents", {
      _items: items,
      _policy_version: settings.active_policy_version,
      _source: source,
    });
  }, [user, settings.active_policy_version]);

  // Sync DB when authenticated
  useEffect(() => {
    if (!ready || authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("current_user_consents")
        .select("category, granted, policy_version")
        .eq("user_id", user.id);
      if (cancelled) return;
      const targetVersion = settings.active_policy_version;
      if (data && data.length > 0) {
        const versionsOk = !settings.reprompt_on_version_change
          || data.every((r) => r.policy_version === targetVersion);
        if (versionsOk) {
          const merged: ConsentMap = { ...buildDefault(settings) };
          for (const r of data) merged[r.category as ConsentCategory] = !!r.granted;
          merged.necessary = true;
          setChoices(merged);
          writeLocal(targetVersion, merged);
          setNeedsPrompt(false);
          return;
        }
      }
      const local = readLocal();
      if (local && local.version === targetVersion) {
        await persist(local.choices, "sync");
        setNeedsPrompt(false);
      } else {
        setNeedsPrompt(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, ready, settings, persist]);

  const save = useCallback(async (next: ConsentMap, source = "banner") => {
    const sanitized: ConsentMap = { ...next, necessary: true };
    setChoices(sanitized);
    writeLocal(settings.active_policy_version, sanitized);
    setNeedsPrompt(false);
    if (user) await persist(sanitized, source);
  }, [user, persist, settings.active_policy_version]);

  const withdraw = useCallback(async () => {
    const next: ConsentMap = buildDefault(settings);
    await save(next, "withdraw");
    setNeedsPrompt(true);
  }, [save, settings]);

  const reopenBanner = useCallback(() => setNeedsPrompt(true), []);

  return (
    <ConsentContext.Provider value={{ ready, needsPrompt, choices, policyVersion: settings.active_policy_version, save, withdraw, reopenBanner }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}

// Back-compat export: callers prefer useConsent().policyVersion
export const POLICY_VERSION = FALLBACK_VERSION;

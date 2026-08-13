import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export const CONSENT_CATEGORIES = ["necessary", "analytics", "marketing", "personalization"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];
export type ConsentMap = Record<ConsentCategory, boolean>;

const STORAGE_KEY = "musren_consent_v1";
export const POLICY_VERSION = "1.0";

const FALLBACK_SETTINGS = {
  active_policy_version: POLICY_VERSION,
  default_analytics: false,
  default_marketing: false,
  default_personalization: false,
  reprompt_on_version_change: true,
};

type StoredConsent = { version: string; choices: ConsentMap; ts: number };

function buildDefault(): ConsentMap {
  return { necessary: true, analytics: false, marketing: false, personalization: false };
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
  } catch {
    return null;
  }
}

function writeLocal(version: string, choices: ConsentMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, choices, ts: Date.now() }));
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
  const { user } = useAuth();
  const [choices, setChoices] = useState<ConsentMap>(buildDefault());
  const [needsPrompt, setNeedsPrompt] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readLocal();
    if (local && local.version === POLICY_VERSION) {
      setChoices({ ...buildDefault(), ...local.choices, necessary: true });
      setNeedsPrompt(false);
    } else {
      setChoices(buildDefault());
      setNeedsPrompt(true);
    }
    setReady(true);
  }, []);

  const save = useCallback(async (next: ConsentMap, _source = "banner") => {
    const sanitized: ConsentMap = { ...next, necessary: true };
    setChoices(sanitized);
    writeLocal(POLICY_VERSION, sanitized);
    setNeedsPrompt(false);
  }, []);

  const withdraw = useCallback(async () => {
    const next = buildDefault();
    await save(next, "withdraw");
    setNeedsPrompt(true);
  }, [save]);

  const reopenBanner = useCallback(() => setNeedsPrompt(true), []);

  return (
    <ConsentContext.Provider
      value={{ ready, needsPrompt, choices, policyVersion: POLICY_VERSION, save, withdraw, reopenBanner }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}

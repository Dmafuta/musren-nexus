/**
 * Supabase stub — Supabase has been removed from this project.
 * All auth is now handled via JWT (api-client + use-auth).
 * Pages that still reference `supabase.from(...)` get empty data
 * until those pages are migrated to the Laravel API.
 */
import { getToken } from "@/lib/api-client";

// Creates a recursive chainable proxy that resolves to `val` when awaited
function makeChain(val: { data: any; error: null } = { data: [], error: null }): any {
  const fn = () => makeChain(val);
  return new Proxy(fn, {
    get(_: any, k: string) {
      if (k === "then") return (res: any, rej?: any) => Promise.resolve(val).then(res, rej);
      if (k === "count") return null;
      return () => makeChain(val);
    },
    apply: () => makeChain(val),
  });
}

export const supabase = {
  from: (_table: string) => makeChain(),

  rpc: (_fn: string, _args?: any) => makeChain(),

  storage: {
    from: (_bucket: string) => ({
      upload: async () => ({ error: null }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: "" } }),
    }),
  },

  channel: (_name: string) => {
    const ch: any = { on: () => ch, subscribe: () => ({}) };
    return ch;
  },

  removeChannel: () => {},

  auth: {
    getSession: async () => ({
      data: { session: getToken() ? { access_token: getToken() } : null },
      error: null,
    }),

    onAuthStateChange: (_cb: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),

    signOut: async () => ({ error: null }),

    signInWithPassword: async (_creds: any) => ({
      data: null,
      error: new Error("Supabase auth removed — use the login form."),
    }),

    signUp: async (_creds: any) => ({
      data: null,
      error: new Error("Supabase auth removed — use the register form."),
    }),

    resetPasswordForEmail: async (_email: string, _opts?: any) => ({ error: null }),
    updateUser: async (_attrs: any) => ({ data: null, error: null }),
    exchangeCodeForSession: async (_code: string) => ({ data: null, error: null }),
    setSession: async (_tokens: any) => ({ data: null, error: null }),
  },
} as const;

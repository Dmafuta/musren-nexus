// OAuth via Lovable / Supabase has been removed.
// Social sign-in is not currently supported — use email/password.

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: any) => ({
      error: new Error("Social sign-in is not available. Please use email and password."),
      redirected: false,
      tokens: null,
    }),
  },
};

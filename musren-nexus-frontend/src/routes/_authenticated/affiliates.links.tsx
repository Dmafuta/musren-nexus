import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Copy, Loader2, ExternalLink } from "lucide-react";
import { AffiliateShell } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { products } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliates/links")({
  head: () => ({
    meta: [
      { title: "Referral Links — Musren Affiliate" },
      { name: "description", content: "Create and manage your affiliate referral links." },
    ],
  }),
  component: LinksPage,
});

function LinksPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [productSlug, setProductSlug] = useState("");

  const codes = useQuery({
    queryKey: ["aff-codes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/affiliate/codes");
      return res.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const c = code.trim();
      if (!c.match(/^[a-zA-Z0-9_-]{3,32}$/))
        throw new Error("Code must be 3–32 characters: letters, numbers, _ or -");
      await api.post("/api/affiliate/codes", { code: c, product_slug: productSlug || null });
    },
    onSuccess: () => {
      toast.success("Referral code created");
      setCode("");
      setProductSlug("");
      qc.invalidateQueries({ queryKey: ["aff-codes", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AffiliateShell>
      <Section
        eyebrow="Referral Links"
        title={<>Your referral <span className="text-gradient">links</span></>}
        description="Create unique referral codes and share them to earn points on every conversion."
      >
        {/* Create form */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="size-4 text-primary" /> Create a new referral code
          </h3>
          <div className="grid sm:grid-cols-[1fr,220px,auto] gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Code slug</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. james-bulk-sms"
                className="glass mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Product (optional)</label>
              <Select value={productSlug} onValueChange={setProductSlug}>
                <SelectTrigger className="glass mt-1">
                  <SelectValue placeholder="Any product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any product</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !code.trim()}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
              >
                {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1" /> Create</>}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Codes must be 3–32 characters using letters, numbers, underscores or hyphens.
            Link to any product or leave unset for a generic referral link.
          </p>
        </div>

        {/* Codes list */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Link2 className="size-4 text-primary" /> Your referral links
            {!codes.isLoading && (
              <Badge variant="outline" className="ml-auto">{codes.data?.length ?? 0}</Badge>
            )}
          </h3>

          {codes.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (codes.data?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <Link2 className="size-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No referral codes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first code above to start earning.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {codes.data?.map((c: any) => {
                const link = `${origin}/api/public/r/${c.code}${c.product_slug ? `?p=${c.product_slug}` : ""}`;
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 bg-background/40 rounded-xl p-3 border border-border/50 group"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                      <Link2 className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{c.code}</span>
                        {c.product_slug && (
                          <Badge variant="outline" className="text-xs">{c.product_slug}</Badge>
                        )}
                        {c.clicks != null && (
                          <span className="text-xs text-muted-foreground">{c.clicks} clicks</span>
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground truncate block">{link}</code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}
                        title="Copy link"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(link, "_blank")}
                        title="Open link"
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>
    </AffiliateShell>
  );
}

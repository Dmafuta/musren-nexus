import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Copy, Download, Link2, MessageCircle, Mail, Facebook,
  Send, Share2, ImageIcon, Video, FileText, Twitter,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { AffiliateShell as SiteLayout } from "@/components/layouts/AffiliateShell";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { products, getProduct } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/affiliates/promote/$slug")({
  head: () => ({ meta: [{ title: "Promote — Musren" }] }),
  component: PromotePage,
});

type Channel = "whatsapp" | "sms" | "email" | "facebook" | "x" | "telegram" | "tiktok" | "instagram" | "copy";

const CHANNEL_META: Record<Channel, { label: string; icon: any; color: string }> = {
  whatsapp:  { label: "WhatsApp",  icon: MessageCircle, color: "text-emerald-400" },
  sms:       { label: "SMS",       icon: Send,          color: "text-sky-400" },
  email:     { label: "Email",     icon: Mail,          color: "text-amber-400" },
  facebook:  { label: "Facebook",  icon: Facebook,      color: "text-blue-400" },
  x:         { label: "X",         icon: Twitter,       color: "text-foreground" },
  telegram:  { label: "Telegram",  icon: Send,          color: "text-cyan-400" },
  tiktok:    { label: "TikTok",    icon: Share2,        color: "text-pink-400" },
  instagram: { label: "Instagram", icon: Share2,        color: "text-fuchsia-400" },
  copy:      { label: "Copy link", icon: Copy,          color: "text-muted-foreground" },
};

function PromotePage() {
  const { slug } = useParams({ from: "/_authenticated/affiliates/promote/$slug" });
  const { user, hasAnyRole } = useAuth();
  const product = getProduct(slug);
  const allowed = hasAnyRole(["affiliate", "admin", "staff"]);

  if (!product) {
    return (
      <SiteLayout>
        <Section title="Product not found">
          <Link to="/affiliates/dashboard"><Button variant="outline" className="glass">Back</Button></Link>
        </Section>
      </SiteLayout>
    );
  }
  if (!allowed || !user) {
    return (
      <SiteLayout>
        <Section title="Affiliate access required">
          <Link to="/affiliates/dashboard"><Button variant="outline" className="glass">Back</Button></Link>
        </Section>
      </SiteLayout>
    );
  }

  return <PromoteContent userId={user.id} product={product} />;
}

function PromoteContent({ userId, product }: { userId: string; product: ReturnType<typeof getProduct> & {} }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const codes = useQuery({
    queryKey: ["promote-codes", userId, product.slug],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ code: string; product_slug: string | null }> }>("/api/affiliate/codes");
      return res.data ?? [];
    },
  });

  const code = useMemo(() => {
    const list = codes.data ?? [];
    return list.find((c) => c.product_slug === product.slug)?.code
      ?? list.find((c) => !c.product_slug)?.code
      ?? list[0]?.code
      ?? "";
  }, [codes.data, product.slug]);

  const buildLink = (channel?: Channel) =>
    code
      ? `${origin}/api/public/r/${code}?p=${product.slug}${channel ? `&ch=${channel}` : ""}`
      : "";

  const assets = useQuery({
    queryKey: ["promote-assets", product.slug],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>(`/api/affiliate/assets?product_slug=${product.slug}`);
      return res.data ?? [];
    },
  });

  const templates = useQuery({
    queryKey: ["promote-templates", product.slug],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ channel: Channel; body: string; cta: string | null }> }>(`/api/affiliate/templates?product_slug=${product.slug}`);
      return res.data ?? [];
    },
  });

  const channelStats = useQuery({
    queryKey: ["promote-stats", userId, product.slug],
    queryFn: async () => {
      const data = await api.get<Record<string, { clicks: number; signups: number }>>(`/api/affiliate/channel-stats?product_slug=${product.slug}`);
      return data;
    },
  });

  const tplFor = (ch: Channel): { body: string; cta: string } => {
    const t = templates.data?.find((x) => x.channel === ch);
    if (t) return { body: t.body, cta: t.cta ?? "" };
    return {
      body: `Check out ${product.name} from Musren — ${product.tagline}.`,
      cta: "Get started",
    };
  };

  const composeMessage = (ch: Channel) => {
    const { body, cta } = tplFor(ch);
    const link = buildLink(ch);
    return `${body}\n\n${cta ? cta + ": " : ""}${link}`.trim();
  };

  const logShare = async (channel: Channel) => {
    if (!code) return;
    try {
      await api.post("/api/affiliate/shares", { code, product_slug: product.slug, channel });
    } catch {
      // Non-critical: don't block the share action
    }
  };

  const onShare = async (ch: Channel) => {
    if (!code) {
      toast.error("Create a referral code first");
      return;
    }
    const msg = composeMessage(ch);
    const link = buildLink(ch);
    let url = "";
    switch (ch) {
      case "whatsapp": url = `https://wa.me/?text=${encodeURIComponent(msg)}`; break;
      case "sms":      url = `sms:?&body=${encodeURIComponent(msg)}`; break;
      case "email":    url = `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(msg)}`; break;
      case "facebook": url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(tplFor("facebook").body)}`; break;
      case "x":        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`; break;
      case "telegram": url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(tplFor("telegram").body)}`; break;
      case "tiktok":
      case "instagram":
        await navigator.clipboard.writeText(msg);
        toast.success(`Copied — paste into ${CHANNEL_META[ch].label}`);
        await logShare(ch);
        return;
      case "copy":
        await navigator.clipboard.writeText(link);
        toast.success("Link copied");
        await logShare(ch);
        return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    await logShare(ch);
  };

  const channels: Channel[] = ["whatsapp","sms","email","facebook","x","telegram","tiktok","instagram","copy"];

  if (codes.isLoading) {
    return <SiteLayout><Section title="Loading…" /></SiteLayout>;
  }

  return (
    <SiteLayout>
      <Section
        eyebrow="Promote"
        title={<>Promote <span className="text-gradient">{product.name}</span></>}
        description={product.description}
      >
        <div className="mb-6">
          <Link to="/affiliates/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </div>

        {!code && (
          <div className="glass rounded-2xl p-5 mb-6 border border-amber-500/30">
            <p className="text-sm">You need a referral code first.</p>
            <Link to="/affiliates/dashboard" className="text-sm text-primary underline">Create one in your dashboard</Link>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Link2 className="size-4 text-primary" /> Your referral link</h3>
            <div className="flex items-center gap-2 bg-background/40 rounded-lg p-2 border border-border/50 mb-3">
              <code className="text-xs flex-1 truncate font-mono">{buildLink() || "—"}</code>
              <Button size="sm" variant="ghost" onClick={() => onShare("copy")}><Copy className="size-3.5" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Each share button auto-tags the channel for analytics.</p>
          </div>

          <div className="glass rounded-2xl p-6 grid place-items-center">
            {code ? (
              <>
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG value={buildLink() || origin} size={140} />
                </div>
                <p className="text-xs text-muted-foreground mt-3">Scan to share</p>
              </>
            ) : <p className="text-xs text-muted-foreground">QR appears once you have a code.</p>}
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">One-click share</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {channels.map((ch) => {
              const meta = CHANNEL_META[ch];
              const Icon = meta.icon;
              const stat = channelStats.data?.[ch];
              return (
                <button
                  key={ch}
                  onClick={() => onShare(ch)}
                  disabled={!code}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 hover:bg-white/5 hover:border-primary/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon className={`size-5 ${meta.color}`} />
                  <span className="text-xs font-medium">{meta.label}</span>
                  {stat && (
                    <span className="text-[10px] text-muted-foreground font-mono">{stat.clicks}c · {stat.signups}s</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><ImageIcon className="size-4 text-primary" /> Brand assets</h3>
          {assets.isLoading ? (
            <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />
          ) : (assets.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet — admin will add posters, templates and videos here.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assets.data!.map((a: any) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          )}
        </div>
      </Section>
    </SiteLayout>
  );
}

function AssetCard({ asset }: { asset: any }) {
  const Icon = asset.kind === "video" ? Video : asset.kind === "poster" || asset.kind === "logo" ? ImageIcon : FileText;
  const isImage = asset.kind === "poster" || asset.kind === "logo";
  const isVideo = asset.kind === "video";
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 overflow-hidden">
      {isImage && asset.file_url && (
        <img src={asset.file_url} alt={asset.title} className="w-full h-32 object-cover" loading="lazy" />
      )}
      {isVideo && asset.file_url && (
        <video src={asset.file_url} className="w-full h-32 object-cover" controls />
      )}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <Icon className="size-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{asset.title}</div>
            <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{String(asset.kind).replace("_", " ")}</Badge>
          </div>
        </div>
        {asset.body_text && (
          <div className="mt-2 text-xs bg-background/60 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">{asset.body_text}</div>
        )}
        {asset.notes && <p className="text-xs text-muted-foreground mt-2">{asset.notes}</p>}
        <div className="flex gap-2 mt-3">
          {asset.file_url && (
            <a href={asset.file_url} target="_blank" rel="noopener noreferrer" download>
              <Button size="sm" variant="outline" className="glass"><Download className="size-3.5 mr-1" /> Download</Button>
            </a>
          )}
          {asset.body_text && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(asset.body_text); toast.success("Copied"); }}>
              <Copy className="size-3.5 mr-1" /> Copy text
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

void products;

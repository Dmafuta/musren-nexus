import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Check, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Musren" },
      { name: "description", content: "Talk to Musren about messaging, USSD, WhatsApp or enterprise engagement projects." },
      { property: "og:title", content: "Contact — Musren" },
      { property: "og:description", content: "Talk to our team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSubmitted(true);
    toast.success("Message sent. We'll be in touch shortly.");
  };

  return (
    <SiteLayout>
      <Section
        eyebrow="Contact"
        title={<>Let's <span className="text-gradient">build together</span></>}
        description="Tell us about your project. Our team typically responds within one business day."
      >
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {([
              [Mail, "Email", "info@musre.co.ke", "mailto:info@musre.co.ke"],
              [Phone, "Phone", "0729 111 000", "tel:+254729111000"],
              [MessageCircle, "WhatsApp", "+254 721 657 224", "https://wa.me/254721657224"],
              [MapPin, "HQ", "Nairobi, Kenya", null],
            ] as const).map(([Icon, label, value, href]) => (
              <a
                key={label}
                href={href ?? undefined}
                target={href && href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`glass rounded-2xl p-5 flex items-start gap-4 ${href ? "hover:border-primary/40 transition" : "pointer-events-none"}`}
              >
                <div className="size-10 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className="font-medium mt-0.5">{value}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-3xl glass-strong p-6 sm:p-10 border-gradient">
            {submitted ? (
              <div className="text-center py-10">
                <div className="size-14 rounded-full bg-primary/15 grid place-items-center mx-auto glow">
                  <Check className="size-7 text-primary" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold">Thanks — message received</h3>
                <p className="mt-2 text-muted-foreground">We'll reach out within one business day.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-5">
                <div><Label htmlFor="name">Full name</Label><Input id="name" name="name" required className="mt-1.5 glass" /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required className="mt-1.5 glass" /></div>
                <div><Label htmlFor="company">Company</Label><Input id="company" name="company" className="mt-1.5 glass" /></div>
                <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" className="mt-1.5 glass" /></div>
                <div className="sm:col-span-2">
                  <Label htmlFor="message">How can we help?</Label>
                  <Textarea id="message" name="message" required rows={5} className="mt-1.5 glass" />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" size="lg" disabled={loading}
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow">
                    {loading ? "Sending…" : "Send message"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}

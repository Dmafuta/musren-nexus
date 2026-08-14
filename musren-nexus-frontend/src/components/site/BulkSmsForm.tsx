import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check } from "lucide-react";

export function BulkSmsForm({ productName }: { productName: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      company: (form.elements.namedItem("company") as HTMLInputElement).value,
      box: (form.elements.namedItem("box") as HTMLInputElement).value,
      director: (form.elements.namedItem("director") as HTMLInputElement).value,
      senderId: (form.elements.namedItem("senderId") as HTMLInputElement).value,
      purpose: (form.elements.namedItem("purpose") as HTMLTextAreaElement).value,
      shortcode: (form.elements.namedItem("shortcode") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
    };
    try {
      const res = await fetch(`/api/bulk-sms/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Submission failed");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      setSubmitted(true);
      toast.success("Application received — our team will contact you shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="size-14 rounded-full bg-primary/15 grid place-items-center mx-auto glow">
          <Check className="size-7 text-primary" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold">Application received</h3>
        <p className="mt-2 text-muted-foreground">Our team will reach out within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-5">
      <Field label="Company name" name="company" required />
      <Field label="Box address" name="box" />
      <Field label="Director name(s)" name="director" required />
      <Field label="Sender ID name (max 11 chars)" name="senderId" maxLength={11} required />
      <div className="sm:col-span-2">
        <Label htmlFor="purpose">Purpose of Sender ID</Label>
        <Textarea id="purpose" name="purpose" required className="mt-1.5 glass" rows={3}
          placeholder={`How will you use ${productName}?`} />
      </div>
      <Field label="Preferred shortcode" name="shortcode" />
      <Field label="Phone number" name="phone" type="tel" required />
      <div className="sm:col-span-2">
        <Field label="Email address" name="email" type="email" required />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" size="lg" disabled={loading}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow">
          {loading ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...rest } = props;
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} className="mt-1.5 glass" />
    </div>
  );
}

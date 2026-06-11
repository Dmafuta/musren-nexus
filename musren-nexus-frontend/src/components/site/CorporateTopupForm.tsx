import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Check, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const useCases = [
  "Staff airtime allowances",
  "Agent commissions",
  "Customer rewards & loyalty",
  "Field team enablement",
  "Promotional giveaways",
  "Disbursements / payouts",
] as const;

const networks = ["Safaricom", "Airtel", "Telkom", "All networks"] as const;
const volumes = [
  "Under KES 100,000",
  "KES 100,000 – 500,000",
  "KES 500,000 – 2,000,000",
  "KES 2,000,000 – 10,000,000",
  "Over KES 10,000,000",
] as const;
const frequencies = ["One-off", "Weekly", "Monthly", "On-demand via API"] as const;

const schema = z.object({
  company: z.string().trim().min(2, "Company name is required").max(120),
  industry: z.string().trim().max(80).optional(),
  contactName: z.string().trim().min(2, "Contact name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number is required")
    .max(20)
    .regex(/^[+0-9\s-]+$/, "Invalid phone number"),
  role: z.string().trim().max(80).optional(),
  network: z.enum(networks),
  volume: z.enum(volumes),
  frequency: z.enum(frequencies),
  useCases: z.array(z.string()).min(1, "Select at least one use case"),
  preferredContact: z.enum(["Email", "Phone call", "WhatsApp"]),
  notes: z.string().trim().max(1000).optional(),
});

export function CorporateTopupForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [network, setNetwork] = useState<(typeof networks)[number]>("All networks");
  const [volume, setVolume] = useState<(typeof volumes)[number]>("KES 100,000 – 500,000");
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]>("Monthly");
  const [preferredContact, setPreferredContact] =
    useState<"Email" | "Phone call" | "WhatsApp">("Email");

  const toggleUseCase = (uc: string, checked: boolean) => {
    setSelectedUseCases((prev) =>
      checked ? [...prev, uc] : prev.filter((x) => x !== uc),
    );
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      company: String(fd.get("company") ?? ""),
      industry: String(fd.get("industry") ?? "") || undefined,
      contactName: String(fd.get("contactName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      role: String(fd.get("role") ?? "") || undefined,
      network,
      volume,
      frequency,
      useCases: selectedUseCases,
      preferredContact,
      notes: String(fd.get("notes") ?? "") || undefined,
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("corporate_topup_inquiries").insert({
      company: parsed.data.company,
      industry: parsed.data.industry ?? null,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: parsed.data.role ?? null,
      network: parsed.data.network,
      estimated_volume: parsed.data.volume,
      frequency: parsed.data.frequency,
      use_cases: parsed.data.useCases,
      preferred_contact: parsed.data.preferredContact,
      notes: parsed.data.notes ?? null,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
    toast.success("Inquiry received — our corporate desk will be in touch.");
  };

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="size-14 rounded-full bg-primary/15 grid place-items-center mx-auto glow">
          <Check className="size-7 text-primary" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold">Inquiry received</h3>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Our corporate topup desk will reach out via your preferred channel within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/15 grid place-items-center">
          <Wallet className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Corporate Topup inquiry</h3>
          <p className="text-sm text-muted-foreground">Tell us about your topup needs.</p>
        </div>
      </div>

      {/* Company */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-widest text-primary">Company</legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Company name" name="company" required maxLength={120} />
          <Field label="Industry" name="industry" placeholder="e.g. Fintech, Retail" maxLength={80} />
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-widest text-primary">Primary contact</legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Full name" name="contactName" required maxLength={100} />
          <Field label="Role / title" name="role" placeholder="e.g. Finance Manager" maxLength={80} />
          <Field label="Work email" name="email" type="email" required maxLength={255} />
          <Field label="Phone number" name="phone" type="tel" required maxLength={20} placeholder="+254…" />
        </div>
      </fieldset>

      {/* Volumes */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-widest text-primary">Estimated volumes</legend>
        <div className="grid sm:grid-cols-3 gap-5">
          <SelectField label="Networks" value={network} onChange={(v) => setNetwork(v as typeof network)} options={networks as readonly string[]} />
          <SelectField label="Monthly spend" value={volume} onChange={(v) => setVolume(v as typeof volume)} options={volumes as readonly string[]} />
          <SelectField label="Frequency" value={frequency} onChange={(v) => setFrequency(v as typeof frequency)} options={frequencies as readonly string[]} />
        </div>
      </fieldset>

      {/* Use cases */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-widest text-primary">Use case</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {useCases.map((uc) => {
            const id = `uc-${uc}`;
            const checked = selectedUseCases.includes(uc);
            return (
              <label
                key={uc}
                htmlFor={id}
                className={`flex items-center gap-3 glass rounded-xl px-4 py-3 cursor-pointer transition ${
                  checked ? "border-primary/60 bg-primary/5" : "hover:bg-white/[0.04]"
                }`}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(v) => toggleUseCase(uc, v === true)}
                />
                <span className="text-sm">{uc}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Preferred contact */}
      <fieldset className="space-y-4">
        <legend className="text-xs uppercase tracking-widest text-primary">Preferred contact method</legend>
        <RadioGroup
          value={preferredContact}
          onValueChange={(v) => setPreferredContact(v as typeof preferredContact)}
          className="grid sm:grid-cols-3 gap-3"
        >
          {(["Email", "Phone call", "WhatsApp"] as const).map((opt) => (
            <label
              key={opt}
              htmlFor={`pc-${opt}`}
              className={`flex items-center gap-3 glass rounded-xl px-4 py-3 cursor-pointer transition ${
                preferredContact === opt ? "border-primary/60 bg-primary/5" : "hover:bg-white/[0.04]"
              }`}
            >
              <RadioGroupItem id={`pc-${opt}`} value={opt} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <div>
        <Label htmlFor="notes">Anything else we should know?</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={1000}
          className="mt-1.5 glass"
          placeholder="Integration needs, approval workflows, timelines…"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold glow"
        >
          {loading ? "Submitting…" : "Submit inquiry"}
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 glass">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

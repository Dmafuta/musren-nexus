import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

const roleStyles: Record<AppRole, string> = {
  superadmin: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  admin: "bg-primary/15 text-primary border-primary/30",
  staff: "bg-accent/15 text-accent border-accent/30",
  developer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  affiliate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  customer: "bg-primary/10 text-primary border-primary/25",
  merchant: "bg-cyan/15 text-cyan border-cyan/30",
  user: "bg-muted text-muted-foreground border-border",
};

export function RolesBadges({
  highlightMissing,
  className = "",
}: {
  highlightMissing?: AppRole;
  className?: string;
}) {
  const { roles, user, loading } = useAuth();
  if (loading || !user) return null;

  const display: AppRole[] = roles.length ? roles : ["user"];

  return (
    <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Your roles:
      </span>
      {display.map((r) => (
        <Badge key={r} variant="outline" className={`capitalize ${roleStyles[r]}`}>
          {r}
        </Badge>
      ))}
      {highlightMissing && !roles.includes(highlightMissing) && (
        <Badge variant="outline" className="capitalize border-dashed text-muted-foreground">
          missing: {highlightMissing}
        </Badge>
      )}
    </div>
  );
}

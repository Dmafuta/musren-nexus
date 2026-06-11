import type { ReactNode } from "react";
import { LayoutDashboard, Megaphone, Package } from "lucide-react";
import { RoleShell, type NavItem } from "./RoleShell";

const items: NavItem[] = [
  { title: "Dashboard", url: "/affiliates/dashboard", icon: LayoutDashboard },
  { title: "Promote", url: "/solutions", icon: Package },
  { title: "Marketing", url: "/affiliates", icon: Megaphone },
];

export function AffiliateShell({ children }: { children: ReactNode }) {
  return <RoleShell role="affiliate" brand="Musren Affiliate" items={items}>{children}</RoleShell>;
}

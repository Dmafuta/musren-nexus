import type { ReactNode } from "react";
import { LayoutDashboard, Megaphone, Users, TrendingUp, BarChart3, Settings2 } from "lucide-react";
import { RoleShell, type NavItem } from "./RoleShell";

const items: NavItem[] = [
  { title: "Dashboard", url: "/merchant/dashboard", icon: LayoutDashboard },
  { title: "Campaigns", url: "/merchant/dashboard", icon: Megaphone },
  { title: "Affiliates", url: "/merchant/dashboard", icon: Users },
  { title: "Conversions", url: "/merchant/dashboard", icon: TrendingUp },
  { title: "Analytics", url: "/merchant/dashboard", icon: BarChart3 },
  { title: "Settings", url: "/merchant/dashboard", icon: Settings2 },
];

export function MerchantShell({ children }: { children: ReactNode }) {
  return <RoleShell role="merchant" brand="Musren Merchant" items={items}>{children}</RoleShell>;
}

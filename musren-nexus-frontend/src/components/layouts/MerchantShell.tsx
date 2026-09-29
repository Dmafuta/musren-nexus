import type { ReactNode } from "react";
import { LayoutDashboard, Users, TrendingUp, BarChart3, Settings2 } from "lucide-react";
import { RoleShell, type NavItem } from "./RoleShell";

const items: NavItem[] = [
  { title: "Dashboard",    url: "/merchant/dashboard",     icon: LayoutDashboard },
  { title: "Analytics",   url: "/merchant/analytics",     icon: BarChart3 },
  { title: "Conversions", url: "/merchant/conversions",   icon: TrendingUp },
  { title: "Affiliates",  url: "/merchant/affiliates",    icon: Users },
  { title: "Reward rules", url: "/merchant/reward-config", icon: Settings2 },
];

export function MerchantShell({ children }: { children: ReactNode }) {
  return <RoleShell role="merchant" brand="Musren Merchant" items={items}>{children}</RoleShell>;
}

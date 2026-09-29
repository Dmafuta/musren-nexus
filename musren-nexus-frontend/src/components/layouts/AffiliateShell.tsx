import type { ReactNode } from "react";
import { LayoutDashboard, TrendingUp, Link2, Send, Megaphone, BellRing, UserRound } from "lucide-react";
import { RoleShell, type NavItem } from "./RoleShell";

const items: NavItem[] = [
  { title: "Dashboard",     url: "/affiliates/dashboard",     icon: LayoutDashboard },
  { title: "Earnings",      url: "/affiliates/earnings",      icon: TrendingUp },
  { title: "Withdrawals",   url: "/affiliates/withdrawals",   icon: Send },
  { title: "Links",         url: "/affiliates/links",         icon: Link2 },
  { title: "Marketing",     url: "/affiliates/marketing",     icon: Megaphone },
  { title: "Notifications", url: "/affiliates/notifications", icon: BellRing },
  { title: "Profile",       url: "/customer/profile",         icon: UserRound },
];

export function AffiliateShell({ children }: { children: ReactNode }) {
  return <RoleShell role="affiliate" brand="Musren Affiliate" items={items}>{children}</RoleShell>;
}

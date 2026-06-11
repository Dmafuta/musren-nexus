import type { ReactNode } from "react";
import { LayoutDashboard, Gift, Wallet, Receipt, UserRound, Package } from "lucide-react";
import { RoleShell, type NavItem } from "./RoleShell";

const items: NavItem[] = [
  { title: "Dashboard", url: "/customer/dashboard", icon: LayoutDashboard },
  { title: "Solutions", url: "/solutions", icon: Package },
  { title: "Rewards", url: "/customer/dashboard", icon: Gift },
  { title: "Wallet", url: "/customer/dashboard", icon: Wallet },
  { title: "Transactions", url: "/customer/dashboard", icon: Receipt },
  { title: "Profile", url: "/customer/dashboard", icon: UserRound },
];

export function CustomerShell({ children }: { children: ReactNode }) {
  return <RoleShell role="customer" brand="Musren" items={items}>{children}</RoleShell>;
}

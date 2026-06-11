import type { ReactNode } from "react";
import { LayoutDashboard, Users, FileCheck2, Megaphone, Receipt, ShieldCheck } from "lucide-react";
import { RoleShell, type NavItem } from "./RoleShell";

const items: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users & roles", url: "/admin/users", icon: Users },
  { title: "Role requests", url: "/admin/role-requests", icon: FileCheck2 },
  { title: "Affiliates", url: "/admin/affiliates", icon: Megaphone },
  { title: "Corporate top-ups", url: "/admin/corporate-topup", icon: Receipt },
  { title: "Consent log", url: "/admin/consent", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return <RoleShell role="admin" brand="Musren Admin" items={items}>{children}</RoleShell>;
}

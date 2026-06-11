import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

export interface NavItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
}

export interface RoleShellProps {
  role: "admin" | "affiliate" | "customer" | "merchant";
  brand: string;
  items: NavItem[];
  cookieKey?: string;
  children: ReactNode;
}

const roleStyles: Record<RoleShellProps["role"], string> = {
  admin: "from-primary/15 via-accent/10 to-background",
  affiliate: "from-emerald-500/10 via-primary/10 to-background",
  customer: "from-sky-500/10 via-primary/5 to-background",
  merchant: "from-amber-500/10 via-primary/10 to-background",
};

export function RoleShell({ role, brand, items, cookieKey, children }: RoleShellProps) {
  const storageKey = `sidebar:open:${cookieKey ?? role}`;
  const [open, setOpen] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setOpen(stored === "1");
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
      document.cookie = `${storageKey}=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch { /* ignore */ }
  };

  if (!hydrated) return null;

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <div className={`min-h-screen flex w-full bg-gradient-to-br ${roleStyles[role]}`}>
        <RoleSidebar role={role} brand={brand} items={items} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/70 backdrop-blur px-3 sm:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <span className="font-semibold truncate">{brand}</span>
              <Badge variant="outline" className="ml-2 capitalize bg-primary/10 text-primary border-primary/30 hidden sm:inline-flex">
                {role}
              </Badge>
            </div>
            <RoleHeaderUser />
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <WhatsAppButton />
      </div>
    </SidebarProvider>
  );
}

function RoleSidebar({ role, brand, items }: Pick<RoleShellProps, "role" | "brand" | "items">) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold">
            {brand[0]}
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm">{brand}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{role}</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url as never} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarSignOut collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarSignOut({ collapsed }: { collapsed: boolean }) {
  const { signOut } = useAuth();
  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      onClick={() => { void signOut(); }}
      className="w-full justify-start gap-2"
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
      {!collapsed && <span>Sign out</span>}
    </Button>
  );
}

function RoleHeaderUser() {
  const { user } = useAuth();
  if (!user?.email) return null;
  return (
    <div className="text-xs text-muted-foreground truncate max-w-[40vw]">{user.email}</div>
  );
}

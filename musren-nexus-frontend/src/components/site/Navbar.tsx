import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Menu, X, Zap, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { to: "/", label: "Home" },
  { to: "/solutions", label: "Solutions" },
  { to: "/industries", label: "Industries" },
  { to: "/developers", label: "Developers" },
  { to: "/affiliates", label: "Affiliates" },
  { to: "/blog", label: "Blogs & News" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, hasAnyRole, signOut } = useAuth();
  const canAdmin = hasAnyRole(["admin", "staff", "superadmin"]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="container-page">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all ${
            scrolled ? "glass-strong shadow-elegant" : "glass"
          }`}
        >
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/40 blur-md rounded-full group-hover:bg-primary/60 transition" />
              <div className="relative size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
                <Zap className="size-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Musren</span>
          </Link>

          <nav className="hidden xl:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
                activeProps={{ className: "text-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {canAdmin && (
              <>
                <Link to="/admin/corporate-topup" className="hidden md:block">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="size-4 mr-1.5" /> Admin
                  </Button>
                </Link>
                <Link to="/admin/role-requests" className="hidden lg:block">
                  <Button variant="ghost" size="sm">Role requests</Button>
                </Link>
                <Link to="/admin/affiliates" className="hidden lg:block">
                  <Button variant="ghost" size="sm">Affiliates</Button>
                </Link>
                <Link to="/admin/users" className="hidden lg:block">
                  <Button variant="ghost" size="sm">Users</Button>
                </Link>
                <Link to="/admin/consent" className="hidden lg:block">
                  <Button variant="ghost" size="sm">Consent</Button>
                </Link>
              </>
            )}
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="hidden sm:inline-flex">
                <LogOut className="size-4 mr-1.5" /> Sign out
              </Button>
            ) : (
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
            )}
            <Link to="/contact">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 font-medium">
                Get started
              </Button>
            </Link>
            <button
              className="xl:hidden ml-1 p-2 rounded-md hover:bg-white/5"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="xl:hidden mt-2 glass-strong rounded-2xl p-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition"
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => { setOpen(false); signOut(); }}
                className="text-left px-3 py-2.5 text-sm border-t border-border mt-2 pt-3 inline-flex items-center gap-2"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm border-t border-border mt-2 pt-3">
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

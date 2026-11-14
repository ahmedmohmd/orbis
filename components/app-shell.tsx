"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, FileText, Globe, Inbox, LayoutDashboard, LayoutTemplate, LogOut, Menu, Moon, Settings, Sun, UserCircle, Users, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export interface ShellUser { name: string; username: string; role: "admin" | "user"; avatar: string }

type Item = { href: string; label: string; icon: typeof FileText; admin?: boolean; badge?: number };

export function AppShell({ user, unread, children }: { user: ShellUser; unread: number; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => { try { setCollapsed(localStorage.getItem("sidebar") === "1"); } catch {} }, []);
  useEffect(() => { setMobile(false); setMenu(false); }, [path]);
  const toggleCollapsed = () => setCollapsed((c) => { try { localStorage.setItem("sidebar", c ? "0" : "1"); } catch {} return !c; });

  const groups: { title: string; items: Item[] }[] = [
    { title: "Workspace", items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/reports", label: "Reports", icon: FileText },
    ] },
    { title: "Administration", items: [
      { href: "/templates", label: "Templates", icon: LayoutTemplate, admin: true },
      { href: "/settings", label: "Settings", icon: Settings, admin: true },
      { href: "/users", label: "Users", icon: Users, admin: true },
      { href: "/inbox", label: "Inbox", icon: Inbox, admin: true, badge: unread },
    ] },
  ];
  const isActive = (h: string) => path === h || path.startsWith(h + "/");
  const admin = user.role === "admin";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (compact: boolean) => (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {groups.map((g) => {
        const items = g.items.filter((i) => !i.admin || admin);
        if (!items.length) return null;
        return (
          <div key={g.title} className="mb-5">
            {!compact && <div className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{g.title}</div>}
            {compact && <div className="mx-auto mb-2 h-px w-6 bg-border" />}
            <ul className="grid gap-1">
              {items.map((i) => {
                const on = isActive(i.href);
                return (
                  <li key={i.href}>
                    <Link href={i.href} title={compact ? i.label : undefined} className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", compact && "justify-center px-0", on ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                      {on && <span className="brand-gradient absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full" />}
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors", on ? "brand-gradient text-white shadow-md shadow-blue-500/25" : "bg-muted text-muted-foreground group-hover:text-foreground")}><i.icon className="size-4" /></span>
                      {!compact && <span className="flex-1 truncate">{i.label}</span>}
                      {!compact && !!i.badge && <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{i.badge}</span>}
                      {compact && !!i.badge && <span className="absolute right-2 top-1.5 size-2 rounded-full bg-rose-500" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const userCard = (compact: boolean) => (
    <div className="relative border-t border-sidebar-border p-3">
      {menu && (
        <div className="absolute inset-x-3 bottom-[calc(100%-4px)] z-10 grid gap-0.5 rounded-xl border bg-card p-1.5 shadow-xl">
          <Link href="/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"><UserCircle className="size-4" />My profile</Link>
          <button onClick={toggle} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}{theme === "dark" ? "Light theme" : "Dark theme"}</button>
          <Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"><Globe className="size-4" />Public website</Link>
          <button onClick={logout} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-muted"><LogOut className="size-4" />Sign out</button>
        </div>
      )}
      <button onClick={() => setMenu((m) => !m)} className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted", compact && "justify-center")}>
        <Avatar src={user.avatar} name={user.name} size={36} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight">{user.name}</span>
            <span className="mt-0.5 inline-flex items-center rounded-full bg-accent px-2 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{user.role}</span>
          </span>
        )}
      </button>
    </div>
  );

  const brand = (compact: boolean) => (
    <div className={cn("flex h-16 items-center gap-3 px-4", compact && "justify-center px-0")}>
      <Link href="/dashboard" className="flex items-center gap-3"><Logo size={34} />{!compact && <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-tight">Orbis</span><span className="brand-text block text-[10px] font-semibold uppercase tracking-[0.2em]">Station reports</span></span>}</Link>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar */}
      <aside className={cn("sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex", collapsed ? "w-[76px]" : "w-[268px]")}>
        {brand(collapsed)}
        {nav(collapsed)}
        <button onClick={toggleCollapsed} className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Collapse sidebar">
          <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />{!collapsed && "Collapse"}
        </button>
        {userCard(collapsed)}
      </aside>

      {/* mobile top bar + drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setMobile(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><Menu className="size-5" /></button>
        <Logo size={28} /><span className="text-sm font-bold">Orbis</span>
      </div>
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-sidebar shadow-2xl">
            <div className="flex items-center justify-between pr-3">{brand(false)}<button onClick={() => setMobile(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X className="size-5" /></button></div>
            {nav(false)}
            {userCard(false)}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

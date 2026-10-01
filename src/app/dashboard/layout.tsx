"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui/spinner";
import {
  LayoutDashboard, Table2, UtensilsCrossed, ShoppingBag,
  Receipt, BarChart3, Settings, LogOut, Menu, X, ChevronLeft,
} from "lucide-react";
import { cn } from "@/utils";

const navItems = [
  { href: "/dashboard",          label: "Overview",  icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/tables",   label: "Tables",    icon: Table2,          roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/menu",     label: "Menu",      icon: UtensilsCrossed, roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/orders",   label: "Orders",    icon: ShoppingBag,     roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/billing",  label: "Billing",   icon: Receipt,         roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/reports",  label: "Reports",   icon: BarChart3,       roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/settings", label: "Settings",  icon: Settings,        roles: ["OWNER"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, restaurantUser, loading, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && restaurantUser?.role === "KITCHEN") router.replace("/kitchen");
  }, [loading, user, restaurantUser, router]);

  if (loading || (user && !restaurantUser)) return <LoadingScreen />;
  if (!user || !restaurantUser) return null;

  const filteredNav = navItems.filter((n) => n.roles.includes(restaurantUser.role));
  const currentPage = filteredNav.find((n) => n.href === pathname)?.label ?? "Overview";

  const sidebarW = collapsed ? "w-[68px]" : "w-60";

  return (
    <div className="flex h-screen bg-[#f5f6fa] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out",
        "bg-white border-r border-gray-100 shadow-sm",
        sidebarW,
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Logo row */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-4 border-b border-gray-100 shrink-0",
          collapsed && "justify-center px-0"
        )}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200 shrink-0">
            <UtensilsCrossed className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm tracking-tight leading-none">TableFlow</p>
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">
                {restaurantUser.role}
              </span>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 ml-auto"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-orange-500" />
                )}
                <Icon className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-colors",
                  active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"
                )} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + collapse */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-1 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-white">{restaurantUser.name[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{restaurantUser.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{restaurantUser.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logOut}
            title="Sign out"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Sign Out"}
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "hidden lg:flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all",
              collapsed && "justify-center px-0"
            )}
          >
            <ChevronLeft className={cn("h-4 w-4 shrink-0 transition-transform duration-300", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", collapsed ? "lg:ml-[68px]" : "lg:ml-60")}>

        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm hidden sm:block">TableFlow</span>
            <span className="text-gray-300 hidden sm:block">/</span>
            <h1 className="font-bold text-gray-900 text-sm">{currentPage}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1.5 text-xs font-semibold border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

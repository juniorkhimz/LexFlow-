import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Briefcase, FolderKanban, CheckSquare, AlarmClock,
  CalendarDays, FileText, Receipt, FolderOpen, MessageSquare, BarChart3,
  Settings, ChevronLeft, ChevronRight, Scale, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/clients", label: "Clients", icon: Briefcase },
  { to: "/matters", label: "Matters", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/deadlines", label: "Deadlines", icon: AlarmClock },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/quotes", label: "Quotes", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/trust-accounts", label: "Trust Accounts", icon: Landmark },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-ink-100 bg-nav-bg text-nav-text transition-all md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-nav-border px-4">
        <Scale className="h-5 w-5 shrink-0 text-brass-400" />
        {!collapsed && <span className="font-display text-sm font-semibold tracking-wide text-white">LexFlow</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                active ? "bg-nav-active text-white" : "text-nav-text-muted hover:bg-nav-bg-hover hover:text-white",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-nav-border text-nav-icon-muted hover:text-white"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Collapse</span></>}
      </button>
    </aside>
  );
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-nav-bg/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-64 bg-nav-bg p-3 text-nav-text">
        <div className="mb-3 flex h-11 items-center gap-2 px-2">
          <Scale className="h-5 w-5 text-brass-400" />
          <span className="font-display text-sm font-semibold text-white">LexFlow</span>
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm text-nav-text-muted hover:bg-nav-bg-hover hover:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

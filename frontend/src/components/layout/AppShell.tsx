import { Navigate, NavLink, Outlet } from "react-router-dom";
import { CalendarCheck, Cpu, LayoutDashboard, Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { endSession } from "@/lib/session";
import { useMe } from "@/lib/helpers";
import { USER_TYPE_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationsBell from "@/components/NotificationsBell";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard, id: "dashboard" },
  { to: "/laboratorios", label: "Laboratórios", icon: MonitorSmartphone, id: "labs" },
  { to: "/equipamentos", label: "Equipamentos", icon: Cpu, id: "equipment" },
  { to: "/reservas", label: "Minhas reservas", icon: CalendarCheck, id: "reservations" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap",
    isActive
      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100",
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5" data-testid="app-logo">
      <div className="relative grid size-9 place-items-center overflow-hidden rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/40">
        <Cpu className="size-5 text-emerald-400" />
      </div>
      <div className="leading-tight">
        <div className="font-heading text-lg font-bold tracking-tight text-slate-100">LabHub</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">UFPA · Tucuruí</div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" data-testid="app-loading">
        <Loader2 className="size-6 animate-spin text-emerald-400" />
      </div>
    );
  }
  if (isError || !me) return <Navigate to="/login" replace />;

  const items = me.role === "admin" ? [...NAV, { to: "/admin", label: "Administração", icon: ShieldCheck, id: "admin" }] : NAV;

  return (
    <div className="min-h-screen bg-background bg-micro-grid">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur-md lg:flex">
        <div className="flex items-center justify-between px-5 py-6">
          <Logo />
          <NotificationsBell testId="notifications-bell" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Navegação</div>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={navClass} data-testid={`nav-${n.id}`}>
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="truncate text-sm font-semibold text-slate-100" data-testid="user-name">{me.name}</div>
          <div className="truncate font-mono text-xs text-slate-400" data-testid="user-email">{me.email}</div>
          <div className="mt-2 flex items-center justify-between">
            <Badge
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                me.role === "admin" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300",
              )}
              data-testid="user-role-badge"
            >
              {me.role === "admin" ? "Administrador" : USER_TYPE_LABELS[me.user_type]}
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sair"
              onClick={() => void endSession()}
              data-testid="logout-button"
              className="text-slate-400 hover:text-red-300"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-background/85 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-1">
            <NotificationsBell testId="mobile-notifications-bell" align="end" />
            <Button variant="ghost" size="sm" onClick={() => void endSession()} data-testid="mobile-logout-button">
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={navClass} data-testid={`mobile-nav-${n.id}`}>
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">{eyebrow}</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl" data-testid="page-title">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

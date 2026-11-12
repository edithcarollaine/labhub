import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Cpu, MonitorSmartphone, Server } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { IMAGES, fmtRange, useMe, useMyReservations, useStats } from "@/lib/helpers";
import type { Lab } from "@/lib/types";
import { cn } from "@/lib/utils";

function StatCard({ label, value, hint, icon: Icon, id, accent }: { label: string; value: string; hint: string; icon: typeof Cpu; id: string; accent: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5" data-testid={`stat-${id}`}>
      <div className="flex items-start justify-between">
        <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
        <Icon className={cn("size-5", accent)} />
      </div>
      <div className="mt-4 font-mono text-4xl font-semibold tracking-tight text-slate-100" data-testid={`stat-${id}-value`}>{value}</div>
      <div className="mt-1 text-sm text-slate-400">{hint}</div>
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <div className="h-px w-1/3 animate-scan bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: me } = useMe();
  const stats = useStats();
  const mine = useMyReservations();
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => apiGet<Lab[]>("/labs") });
  const s = stats.isError ? undefined : stats.data;
  const now = s?.now ?? "";
  const upcoming = (mine.data ?? [])
    .filter((r) => r.status === "confirmed" && (!now || r.end > now))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  return (
    <div>
      <PageHeader eyebrow="Painel de controle" title={`Olá, ${me?.name.split(" ")[0] ?? ""}`} subtitle="Visão geral dos laboratórios, computadores e equipamentos do campus." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <StatCard id="labs" label="Laboratórios" value={s ? String(s.total_labs) : "—"} hint={s ? `${s.labs_in_use_now} em uso agora` : "Carregando…"} icon={MonitorSmartphone} accent="text-emerald-400" />
        <StatCard id="computers" label="Computadores" value={s ? String(s.total_computers) : "—"} hint="Total nos laboratórios" icon={Server} accent="text-sky-400" />
        <StatCard id="equipment" label="Equipamentos livres" value={s ? String(s.equipment_available) : "—"} hint={s ? `de ${s.equipment_total} unidades no acervo` : "Carregando…"} icon={Cpu} accent="text-amber-400" />
        <StatCard id="my-reservations" label="Minhas reservas" value={s ? String(s.my_active_reservations) : "—"} hint="Ativas ou futuras" icon={CalendarCheck} accent="text-emerald-400" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md" data-testid="labs-status-panel">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Laboratórios agora</h2>
            <Link to="/laboratorios" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-emerald-300")} data-testid="dashboard-go-labs">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(labs.isError ? [] : labs.data ?? []).map((lab) => (
              <div key={lab.id} className="flex items-center justify-between gap-4 py-3" data-testid={`dashboard-lab-${lab.id}`}>
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-100">{lab.name}</div>
                  <div className="text-xs text-slate-500">{lab.location}</div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold text-slate-100">{lab.computers}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">PCs</div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                    !lab.active ? "bg-red-950/60 text-red-300 ring-red-500/20" : lab.in_use_now ? "bg-amber-950/60 text-amber-300 ring-amber-500/20" : "bg-emerald-950/70 text-emerald-300 ring-emerald-500/30")}>
                    <span className={cn("size-1.5 rounded-full", !lab.active ? "bg-red-400" : lab.in_use_now ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                    {!lab.active ? "Inativo" : lab.in_use_now ? "Em uso" : "Livre"}
                  </span>
                </div>
              </div>
            ))}
            {labs.isLoading && <div className="py-6 text-sm text-slate-500">Carregando laboratórios…</div>}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-xl border border-slate-800">
            <img src={IMAGES.hardware} alt="Hardware" className="h-40 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute bottom-0 p-5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-400">Acervo de hardware</div>
              <Link to="/equipamentos" className="mt-1 inline-flex items-center gap-1 font-heading text-lg font-semibold text-white hover:text-emerald-300" data-testid="dashboard-go-equipment">
                Alugar equipamentos <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md" data-testid="upcoming-panel">
            <h2 className="mb-4 text-xl font-semibold text-slate-100">Próximas reservas</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500" data-testid="upcoming-empty">Você não possui reservas futuras.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex items-start gap-3" data-testid={`upcoming-${r.id}`}>
                    <div className={cn("mt-1.5 size-2 shrink-0 rounded-full", r.kind === "lab" ? "bg-emerald-400" : "bg-sky-400")} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-100">{r.resource_name}{r.quantity > 1 ? ` ×${r.quantity}` : ""}</div>
                      <div className="font-mono text-xs text-slate-400">{fmtRange(r.start, r.end)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

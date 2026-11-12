import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Plus, Server } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import LabBookingDialog from "@/components/LabBookingDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { fmtTime, useMe, useStats } from "@/lib/helpers";
import type { Lab, Reservation } from "@/lib/types";
import { cn } from "@/lib/utils";

const FIRST_HOUR = 7;
const LAST_HOUR = 22; // grid ends at 22:00
const HOUR_PX = 48;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const isoDay = (d: Date) => format(d, "yyyy-MM-dd");

interface Slot {
  date: string;
  start: string;
  end: string;
}

// Clip a reservation to one day and to the visible hour window; null if it isn't visible that day.
function blockFor(r: Reservation, day: string): { top: number; height: number; label: string } | null {
  const dayStart = `${day}T00:00`;
  const dayEnd = `${day}T23:59`;
  if (r.end <= dayStart || r.start > dayEnd) return null;
  const s = r.start < dayStart ? 0 : toMin(r.start.slice(11, 16));
  const e = r.end > dayEnd ? 24 * 60 : toMin(r.end.slice(11, 16));
  const vs = Math.max(s, FIRST_HOUR * 60);
  const ve = Math.min(e, LAST_HOUR * 60);
  if (ve <= vs) return null;
  return {
    top: ((vs - FIRST_HOUR * 60) / 60) * HOUR_PX,
    height: Math.max(((ve - vs) / 60) * HOUR_PX, 20),
    label: `${r.start < dayStart ? "00:00" : fmtTime(r.start)}–${r.end > dayEnd ? "24:00" : fmtTime(r.end)}`,
  };
}

export default function LabAgenda() {
  const { labId = "" } = useParams();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const stats = useStats();
  const now = stats.data?.now ?? "";
  const today = now.slice(0, 10);
  const [offset, setOffset] = useState(0); // weeks relative to the current week
  const [slot, setSlot] = useState<Slot | null>(null);

  const labs = useQuery({ queryKey: ["labs"], queryFn: () => apiGet<Lab[]>("/labs") });
  const lab = labs.data?.find((l) => l.id === labId) ?? null;

  const weekStart = today ? addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), offset * 7) : null;
  const days = weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [];
  const weekKey = weekStart ? isoDay(weekStart) : "";

  const schedule = useQuery({
    queryKey: ["schedule", labId, weekKey, 7],
    queryFn: () => apiGet<Reservation[]>(`/labs/${labId}/schedule?date=${weekKey}&days=7`),
    enabled: !!labId && !!weekKey,
  });
  const bookings = schedule.isError ? [] : schedule.data ?? [];
  const weekHours = bookings.reduce((acc, r) => {
    return acc + days.reduce((a, d) => {
      const b = blockFor(r, isoDay(d));
      return a + (b ? b.height / HOUR_PX : 0);
    }, 0);
  }, 0);
  const capacityHours = 7 * (LAST_HOUR - FIRST_HOUR);

  const openSlot = (date: string, hour: number) => {
    const start = `${pad(hour)}:00`;
    if (`${date}T${start}` < now.slice(0, 13) + ":00") return; // past hour
    setSlot({ date, start, end: `${pad(Math.min(hour + 2, 23))}:00` });
  };

  const nowMin = now ? toMin(now.slice(11, 16)) : -1;
  const nowTop = ((nowMin - FIRST_HOUR * 60) / 60) * HOUR_PX;
  const showNowLine = nowMin >= FIRST_HOUR * 60 && nowMin < LAST_HOUR * 60;

  return (
    <div>
      <Link to="/laboratorios" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors duration-200 hover:text-emerald-300" data-testid="agenda-back-link">
        <ArrowLeft className="size-4" /> Laboratórios
      </Link>
      <PageHeader
        eyebrow="Agenda semanal"
        title={lab?.name ?? "Laboratório"}
        subtitle="Clique em um horário livre para reservar. Blocos ocupados mostram quem reservou."
        action={
          <Select value={labId} onValueChange={(v: string) => navigate(`/laboratorios/${v}/agenda`)}>
            <SelectTrigger className="h-11 w-full bg-slate-900/80 sm:w-72" data-testid="agenda-lab-select">
              <SelectValue>{(v) => labs.data?.find((l) => l.id === v)?.name ?? "Selecionar laboratório"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(labs.data ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Lab facts + week navigation */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {lab && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-300"><MapPin className="size-3.5 text-slate-500" />{lab.location}</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 font-mono text-emerald-300" data-testid="agenda-lab-computers"><Server className="size-3.5" />{lab.computers} PCs</span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 font-mono text-slate-300" data-testid="agenda-week-occupancy">
            Ocupação: <span className="text-amber-300">{Math.round((weekHours / capacityHours) * 100)}%</span>
            <span className="text-slate-500">({weekHours.toFixed(1).replace(".0", "")}h)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => setOffset((o) => o - 1)} data-testid="agenda-prev-week"><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" onClick={() => setOffset(0)} disabled={offset === 0} data-testid="agenda-today-button">Hoje</Button>
          <Button variant="outline" size="icon" aria-label="Próxima semana" onClick={() => setOffset((o) => o + 1)} data-testid="agenda-next-week"><ChevronRight className="size-4" /></Button>
          <div className="ml-2 min-w-44 font-mono text-sm text-slate-300" data-testid="agenda-week-label">
            {weekStart ? `${format(days[0], "dd/MM")} – ${format(days[6], "dd/MM/yyyy")}` : "—"}
          </div>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md" data-testid="agenda-grid">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-800">
            <div />
            {days.map((d) => {
              const iso = isoDay(d);
              const isToday = iso === today;
              return (
                <div key={iso} className={cn("border-l border-slate-800 px-2 py-3 text-center", isToday && "bg-emerald-500/5")} data-testid={`agenda-day-header-${iso}`}>
                  <div className={cn("font-mono text-[10px] uppercase tracking-wider", isToday ? "text-emerald-400" : "text-slate-500")}>
                    {format(d, "EEE", { locale: ptBR })}
                  </div>
                  <div className={cn("mt-0.5 font-heading text-lg font-semibold", isToday ? "text-emerald-300" : "text-slate-200")}>{format(d, "dd")}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[56px_repeat(7,1fr)]">
            {/* Hour labels */}
            <div>
              {HOURS.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative pr-2 text-right font-mono text-[11px] text-slate-500">
                  <span className="relative -top-2">{pad(h)}:00</span>
                </div>
              ))}
            </div>

            {days.map((d) => {
              const iso = isoDay(d);
              const isToday = iso === today;
              const dayBookings = bookings.map((r) => ({ r, b: blockFor(r, iso) })).filter((x) => x.b !== null);
              return (
                <div key={iso} className={cn("relative border-l border-slate-800", isToday && "bg-emerald-500/[0.03]")} style={{ height: HOURS.length * HOUR_PX }} data-testid={`agenda-day-${iso}`}>
                  {HOURS.map((h) => {
                    const past = `${iso}T${pad(h)}:00` < now.slice(0, 13) + ":00";
                    const disabled = past || !lab?.active;
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={disabled}
                        onClick={() => openSlot(iso, h)}
                        style={{ height: HOUR_PX }}
                        aria-label={`Reservar ${format(d, "dd/MM")} às ${pad(h)}:00`}
                        className={cn(
                          "group block w-full border-b border-slate-800/70 transition-colors duration-150",
                          past ? "cursor-not-allowed bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(148,163,184,0.04)_6px,rgba(148,163,184,0.04)_12px)]" : "hover:bg-emerald-500/10",
                        )}
                        data-testid={`agenda-slot-${iso}-${pad(h)}`}
                      >
                        {!disabled && <Plus className="mx-auto size-4 text-emerald-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />}
                      </button>
                    );
                  })}

                  {dayBookings.map(({ r, b }) => {
                    const mine = r.user_id === me?.id;
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left ring-1 animate-fade-up",
                          mine
                            ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                            : "bg-amber-500/15 text-amber-100 ring-amber-400/40",
                        )}
                        style={{ top: b!.top + 1, height: b!.height - 2 }}
                        title={`${r.user_name}${r.purpose ? ` · ${r.purpose}` : ""}`}
                        data-testid={`agenda-booking-${r.id}`}
                      >
                        <div className="font-mono text-[10px] opacity-80">{b!.label}</div>
                        <div className="truncate text-xs font-semibold">{mine ? "Sua reserva" : r.user_name.split(" ")[0]}</div>
                        {r.purpose && b!.height > 56 && <div className="truncate text-[11px] opacity-70">{r.purpose}</div>}
                      </div>
                    );
                  })}

                  {isToday && showNowLine && (
                    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }} data-testid="agenda-now-line">
                      <div className="h-px bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                      <div className="absolute -left-1 -top-1 size-2 rounded-full bg-red-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400" data-testid="agenda-legend">
        <span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-400/50" />Sua reserva</span>
        <span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm bg-amber-500/20 ring-1 ring-amber-400/40" />Ocupado</span>
        <span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm border border-slate-700" />Livre (clique para reservar)</span>
        <span className="inline-flex items-center gap-2"><span className="h-px w-4 bg-red-400" />Agora</span>
      </div>

      {slot && lab && (
        <LabBookingDialog
          key={`${slot.date}-${slot.start}`}
          lab={lab}
          today={today}
          initialDate={slot.date}
          initialStart={slot.start}
          initialEnd={slot.end}
          onClose={() => setSlot(null)}
        />
      )}
      {!lab && !labs.isLoading && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
          Laboratório não encontrado. <Link to="/laboratorios" className={cn(buttonVariants({ variant: "link" }))}>Voltar</Link>
        </div>
      )}
    </div>
  );
}

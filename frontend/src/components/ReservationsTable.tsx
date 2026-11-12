import { Cpu, Loader2, MonitorSmartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmtRange } from "@/lib/helpers";
import type { Reservation } from "@/lib/types";

export function reservationState(r: Reservation, now: string): { label: string; cls: string } {
  if (r.status === "cancelled") return { label: "Cancelada", cls: "bg-red-950/60 text-red-300 ring-red-500/20" };
  if (now && r.end <= now) return { label: "Concluída", cls: "bg-slate-800 text-slate-300 ring-slate-600/30" };
  if (now && r.start <= now) return { label: "Em andamento", cls: "bg-sky-950/60 text-sky-300 ring-sky-500/30" };
  return { label: "Confirmada", cls: "bg-emerald-950/70 text-emerald-300 ring-emerald-500/30 shadow-[0_0_14px_rgba(16,185,129,0.15)]" };
}

interface Props {
  reservations: Reservation[];
  now: string;
  showUser?: boolean;
  onCancel?: (id: string) => void;
  cancellingId?: string | null;
  emptyText?: string;
  testId?: string;
}

export default function ReservationsTable({ reservations, now, showUser, onCancel, cancellingId, emptyText = "Nenhuma reserva.", testId = "reservations-table" }: Props) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center text-slate-400" data-testid={`${testId}-empty`}>
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md" data-testid={testId}>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Recurso</TableHead>
            {showUser && <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Usuário</TableHead>}
            <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Período</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Qtd.</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Status</TableHead>
            <TableHead className="text-right font-mono text-[11px] uppercase tracking-wider text-slate-500">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => {
            const st = reservationState(r, now);
            const canCancel = r.status === "confirmed" && (!now || r.end > now) && !!onCancel;
            return (
              <TableRow key={r.id} className="border-slate-800 transition-colors duration-200 hover:bg-slate-800/40" data-testid={`reservation-row-${r.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-800 ring-1 ring-slate-700">
                      {r.kind === "lab" ? <MonitorSmartphone className="size-4 text-emerald-400" /> : <Cpu className="size-4 text-sky-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100" data-testid="reservation-resource-name">{r.resource_name}</div>
                      <div className="truncate text-xs text-slate-500">
                        {r.kind === "lab" ? "Laboratório" : "Equipamento"}
                        {r.purpose ? ` · ${r.purpose}` : ""}
                      </div>
                    </div>
                  </div>
                </TableCell>
                {showUser && (
                  <TableCell>
                    <div className="text-sm text-slate-200">{r.user_name}</div>
                    <div className="font-mono text-xs text-slate-500">{r.user_email}</div>
                  </TableCell>
                )}
                <TableCell className="font-mono text-sm text-slate-300" data-testid="reservation-period">{fmtRange(r.start, r.end)}</TableCell>
                <TableCell className="font-mono text-sm text-slate-300">{r.quantity}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1", st.cls)} data-testid="reservation-status">
                    {st.label}
                  </span>
                  {r.status === "cancelled" && r.cancel_reason && (
                    <div className="mt-1.5 max-w-56 text-xs text-slate-400" data-testid="reservation-cancel-reason">
                      <span className="text-slate-500">{r.cancelled_by === "admin" ? "Motivo (admin): " : "Motivo: "}</span>
                      {r.cancel_reason}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-300 hover:bg-red-950/50 hover:text-red-200"
                      disabled={cancellingId === r.id}
                      onClick={() => onCancel?.(r.id)}
                      data-testid={`cancel-reservation-${r.id}`}
                    >
                      {cancellingId === r.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

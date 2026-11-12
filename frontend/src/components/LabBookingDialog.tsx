import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Loader2, MonitorSmartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { RESERVATION_KEYS, errMsg, fmtTime } from "@/lib/helpers";
import type { Lab, Reservation, ReservationIn } from "@/lib/types";

interface Props {
  lab: Lab | null;
  today: string;
  onClose: () => void;
  initialDate?: string;
  initialStart?: string;
  initialEnd?: string;
}

export default function LabBookingDialog({ lab, today, onClose, initialDate, initialStart, initialEnd }: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState(initialDate ?? today);
  const [start, setStart] = useState(initialStart ?? "08:00");
  const [end, setEnd] = useState(initialEnd ?? "10:00");
  const [purpose, setPurpose] = useState("");

  const schedule = useQuery({
    queryKey: ["schedule", lab?.id, date],
    queryFn: () => apiGet<Reservation[]>(`/labs/${lab!.id}/schedule?date=${date}`),
    enabled: !!lab && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });

  const book = useMutation({
    mutationFn: (body: ReservationIn) => apiPost<Reservation>("/reservations", body),
    onSuccess: () => {
      toast.success("Reserva confirmada com sucesso!");
      RESERVATION_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lab) return;
    if (end <= start) return toast.error("O horário de término deve ser após o início");
    book.mutate({ kind: "lab", resource_id: lab.id, start: `${date}T${start}`, end: `${date}T${end}`, quantity: 1, purpose });
  };

  return (
    <Dialog open={!!lab} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg" data-testid="lab-booking-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <MonitorSmartphone className="size-5 text-emerald-400" /> Reservar laboratório
          </DialogTitle>
          <DialogDescription>
            {lab?.name} · <span className="font-mono text-emerald-300">{lab?.computers} computadores</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="lab-date">Data</Label>
              <Input id="lab-date" type="date" min={today} required value={date} onChange={(e) => setDate(e.target.value)} className="font-mono" data-testid="lab-booking-date-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-start">Início</Label>
              <Input id="lab-start" type="time" required value={start} onChange={(e) => setStart(e.target.value)} className="font-mono" data-testid="lab-booking-start-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-end">Término</Label>
              <Input id="lab-end" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} className="font-mono" data-testid="lab-booking-end-input" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3" aria-live="polite" data-testid="lab-schedule">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <CalendarClock className="size-3.5" /> Horários ocupados no dia
            </div>
            {schedule.isLoading ? (
              <Loader2 className="size-4 animate-spin text-slate-500" />
            ) : schedule.data && schedule.data.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {schedule.data.map((r) => (
                  <span key={r.id} className="rounded-md bg-amber-950/60 px-2 py-1 font-mono text-xs text-amber-300 ring-1 ring-amber-500/20" data-testid="lab-schedule-slot">
                    {fmtTime(r.start)}–{fmtTime(r.end)} · {r.user_name.split(" ")[0]}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-emerald-300" data-testid="lab-schedule-free">Dia livre — nenhum horário ocupado.</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lab-purpose">Finalidade (opcional)</Label>
            <Textarea id="lab-purpose" rows={2} placeholder="Ex.: Aula de Algoritmos, grupo de estudos…" value={purpose} onChange={(e) => setPurpose(e.target.value)} data-testid="lab-booking-purpose-input" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="lab-booking-cancel-button">Cancelar</Button>
            <Button type="submit" disabled={book.isPending} data-testid="lab-booking-submit-button">
              {book.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar reserva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

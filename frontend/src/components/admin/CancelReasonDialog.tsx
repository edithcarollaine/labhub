import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtRange } from "@/lib/helpers";
import type { Reservation } from "@/lib/types";

const QUICK_REASONS = [
  "Manutenção programada no laboratório",
  "Evento institucional no horário",
  "Equipamento em manutenção",
  "Reserva em desacordo com as normas de uso",
];

interface Props {
  reservation: Reservation;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function CancelReasonDialog({ reservation, pending, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 3;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg" data-testid="cancel-reason-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <TriangleAlert className="size-5 text-red-400" /> Cancelar reserva
          </DialogTitle>
          <DialogDescription>
            {reservation.resource_name} · <span className="font-mono">{fmtRange(reservation.start, reservation.end)}</span>
            <br />
            Solicitante: {reservation.user_name} <span className="font-mono text-xs">({reservation.user_email})</span>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) onConfirm(reason.trim()); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              required
              maxLength={500}
              placeholder="Explique ao solicitante por que a reserva foi cancelada…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="cancel-reason-input"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((q, i) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setReason(q)}
                  className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors duration-150 hover:border-emerald-500/50 hover:text-emerald-300"
                  data-testid={`cancel-quick-reason-${i}`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">O solicitante receberá uma notificação com este motivo.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="cancel-reason-back-button">Voltar</Button>
            <Button type="submit" variant="destructive" disabled={!valid || pending} data-testid="cancel-reason-confirm-button">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Cancelar e notificar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

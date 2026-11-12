import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cpu, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { RESERVATION_KEYS, errMsg } from "@/lib/helpers";
import type { AvailabilityOut, Equipment, Reservation, ReservationIn } from "@/lib/types";

interface Props {
  item: Equipment | null;
  today: string;
  onClose: () => void;
}

export default function EquipmentRentDialog({ item, today, onClose }: Props) {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("18:00");
  const [quantity, setQuantity] = useState("1");
  const [purpose, setPurpose] = useState("");

  const start = `${startDate}T${startTime}`;
  const end = `${endDate}T${endTime}`;
  const validRange = start.length === 16 && end.length === 16 && end > start;

  const availability = useQuery({
    queryKey: ["equipment", "availability", item?.id, start, end],
    queryFn: () => apiGet<AvailabilityOut>(`/equipment/${item!.id}/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
    enabled: !!item && validRange,
  });

  const rent = useMutation({
    mutationFn: (body: ReservationIn) => apiPost<Reservation>("/reservations", body),
    onSuccess: () => {
      toast.success("Aluguel confirmado com sucesso!");
      RESERVATION_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const qty = Number(quantity) || 0;
  const avail = availability.data?.available;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!validRange) return toast.error("O término deve ser após o início");
    if (qty < 1) return toast.error("Informe uma quantidade válida");
    rent.mutate({ kind: "equipment", resource_id: item.id, start, end, quantity: qty, purpose });
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg" data-testid="equipment-rent-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <Cpu className="size-5 text-sky-400" /> Alugar equipamento
          </DialogTitle>
          <DialogDescription>{item?.name} · {item?.category}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="eq-start-date">Retirada</Label>
              <Input id="eq-start-date" type="date" min={today} required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="font-mono" data-testid="rent-start-date-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-start-time">Hora</Label>
              <Input id="eq-start-time" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-mono" data-testid="rent-start-time-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-end-date">Devolução</Label>
              <Input id="eq-end-date" type="date" min={startDate || today} required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="font-mono" data-testid="rent-end-date-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-end-time">Hora</Label>
              <Input id="eq-end-time" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-mono" data-testid="rent-end-time-input" />
            </div>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="eq-qty">Quantidade</Label>
              <Input id="eq-qty" type="number" min={1} max={item?.quantity ?? 1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="font-mono" data-testid="rent-quantity-input" />
            </div>
            <div className="flex h-9 items-center rounded-lg border border-slate-800 bg-slate-950/50 px-3 text-sm" aria-live="polite" data-testid="rent-availability">
              {!validRange ? (
                <span className="text-slate-500">Defina um período válido</span>
              ) : availability.isLoading ? (
                <Loader2 className="size-4 animate-spin text-slate-500" />
              ) : avail !== undefined ? (
                <span className={qty > avail ? "text-red-300" : "text-emerald-300"}>
                  <span className="font-mono font-semibold">{avail}</span> de {availability.data?.total} disponíveis no período
                </span>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-purpose">Finalidade (opcional)</Label>
            <Textarea id="eq-purpose" rows={2} placeholder="Ex.: Projeto de TCC, prática de IoT…" value={purpose} onChange={(e) => setPurpose(e.target.value)} data-testid="rent-purpose-input" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="rent-cancel-button">Cancelar</Button>
            <Button type="submit" disabled={rent.isPending || (avail !== undefined && qty > avail)} data-testid="rent-submit-button">
              {rent.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar aluguel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

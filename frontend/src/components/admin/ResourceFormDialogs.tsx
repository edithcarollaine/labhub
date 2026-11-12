import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost, apiPut } from "@/lib/api";
import { errMsg } from "@/lib/helpers";
import type { Equipment, EquipmentIn, Lab, LabIn } from "@/lib/types";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ["labs", "equipment", "stats", "all-reservations", "my-reservations"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function LabFormDialog({ lab, open, onClose }: { lab: Lab | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<LabIn>({
    name: lab?.name ?? "",
    location: lab?.location ?? "",
    computers: lab?.computers ?? 20,
    capacity: lab?.capacity ?? 25,
    description: lab?.description ?? "",
    specs: lab?.specs ?? "",
    active: lab?.active ?? true,
  });
  const save = useMutation({
    mutationFn: (body: LabIn) => (lab ? apiPut<Lab>(`/labs/${lab.id}`, body) : apiPost<Lab>("/labs", body)),
    onSuccess: () => {
      toast.success(lab ? "Laboratório atualizado" : "Laboratório cadastrado");
      invalidateAll(qc);
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg" data-testid="lab-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{lab ? "Editar laboratório" : "Novo laboratório"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(f); }} className="space-y-4">
          <Field id="lf-name" label="Nome"><Input id="lf-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="lab-form-name-input" /></Field>
          <Field id="lf-loc" label="Localização"><Input id="lf-loc" required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} data-testid="lab-form-location-input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="lf-pcs" label="Nº de computadores"><Input id="lf-pcs" type="number" min={0} required value={f.computers} onChange={(e) => setF({ ...f, computers: Number(e.target.value) })} className="font-mono" data-testid="lab-form-computers-input" /></Field>
            <Field id="lf-cap" label="Capacidade (pessoas)"><Input id="lf-cap" type="number" min={1} required value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} className="font-mono" data-testid="lab-form-capacity-input" /></Field>
          </div>
          <Field id="lf-specs" label="Configuração das máquinas"><Input id="lf-specs" value={f.specs} onChange={(e) => setF({ ...f, specs: e.target.value })} data-testid="lab-form-specs-input" /></Field>
          <Field id="lf-desc" label="Descrição"><Textarea id="lf-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="lab-form-description-input" /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Checkbox checked={f.active} onCheckedChange={(c) => setF({ ...f, active: !!c })} data-testid="lab-form-active-checkbox" /> Disponível para reservas
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending} data-testid="lab-form-submit-button">{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EquipmentFormDialog({ item, open, onClose }: { item: Equipment | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<EquipmentIn>({
    name: item?.name ?? "",
    category: item?.category ?? "",
    quantity: item?.quantity ?? 1,
    description: item?.description ?? "",
    specs: item?.specs ?? "",
    active: item?.active ?? true,
  });
  const save = useMutation({
    mutationFn: (body: EquipmentIn) => (item ? apiPut<Equipment>(`/equipment/${item.id}`, body) : apiPost<Equipment>("/equipment", body)),
    onSuccess: () => {
      toast.success(item ? "Equipamento atualizado" : "Equipamento cadastrado");
      invalidateAll(qc);
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-lg" data-testid="equipment-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{item ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(f); }} className="space-y-4">
          <Field id="ef-name" label="Nome"><Input id="ef-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="equipment-form-name-input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ef-cat" label="Categoria"><Input id="ef-cat" required value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} data-testid="equipment-form-category-input" /></Field>
            <Field id="ef-qty" label="Quantidade total"><Input id="ef-qty" type="number" min={0} required value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} className="font-mono" data-testid="equipment-form-quantity-input" /></Field>
          </div>
          <Field id="ef-specs" label="Especificações"><Input id="ef-specs" value={f.specs} onChange={(e) => setF({ ...f, specs: e.target.value })} data-testid="equipment-form-specs-input" /></Field>
          <Field id="ef-desc" label="Descrição"><Textarea id="ef-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="equipment-form-description-input" /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Checkbox checked={f.active} onCheckedChange={(c) => setF({ ...f, active: !!c })} data-testid="equipment-form-active-checkbox" /> Disponível para aluguel
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending} data-testid="equipment-form-submit-button">{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

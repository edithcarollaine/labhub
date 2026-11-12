import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import ReservationsTable from "@/components/ReservationsTable";
import { EquipmentFormDialog, LabFormDialog } from "@/components/admin/ResourceFormDialogs";
import CancelReasonDialog from "@/components/admin/CancelReasonDialog";
import { useCancelReservation } from "@/pages/Reservations";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDelete, apiGet } from "@/lib/api";
import { errMsg, useMe, useStats } from "@/lib/helpers";
import type { Equipment, Lab, Reservation } from "@/lib/types";

const TH = "font-mono text-[11px] uppercase tracking-wider text-slate-500";

type Editing<T> = { open: boolean; item: T | null };

export default function Admin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const stats = useStats();
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => apiGet<Lab[]>("/labs"), enabled: me?.role === "admin" });
  const equipment = useQuery({ queryKey: ["equipment"], queryFn: () => apiGet<Equipment[]>("/equipment"), enabled: me?.role === "admin" });
  const all = useQuery({ queryKey: ["all-reservations"], queryFn: () => apiGet<Reservation[]>("/reservations"), enabled: me?.role === "admin" });
  const cancel = useCancelReservation();
  const [labEdit, setLabEdit] = useState<Editing<Lab>>({ open: false, item: null });
  const [eqEdit, setEqEdit] = useState<Editing<Equipment>>({ open: false, item: null });
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);

  const remove = useMutation({
    mutationFn: ({ kind, id }: { kind: "labs" | "equipment"; id: string }) => apiDelete<{ ok: boolean }>(`/${kind}/${id}`),
    onSuccess: () => {
      toast.success("Item removido");
      ["labs", "equipment", "stats", "all-reservations", "my-reservations"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (me && me.role !== "admin") return <Navigate to="/painel" replace />;

  const confirmDelete = (kind: "labs" | "equipment", id: string, name: string) => {
    if (window.confirm(`Remover "${name}"? Reservas ativas serão canceladas.`)) remove.mutate({ kind, id });
  };

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Gestão do campus" subtitle="Cadastre laboratórios e equipamentos e acompanhe todas as reservas." />
      <Tabs defaultValue="labs">
        <TabsList className="mb-5">
          <TabsTrigger value="labs" data-testid="admin-tab-labs">Laboratórios</TabsTrigger>
          <TabsTrigger value="equipment" data-testid="admin-tab-equipment">Equipamentos</TabsTrigger>
          <TabsTrigger value="reservations" data-testid="admin-tab-reservations">Reservas</TabsTrigger>
        </TabsList>

        <TabsContent value="labs">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setLabEdit({ open: true, item: null })} data-testid="admin-new-lab-button"><Plus className="size-4" />Novo laboratório</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className={TH}>Nome</TableHead><TableHead className={TH}>Local</TableHead>
                  <TableHead className={TH}>PCs</TableHead><TableHead className={TH}>Capac.</TableHead>
                  <TableHead className={TH}>Status</TableHead><TableHead className={`${TH} text-right`}>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(labs.data ?? []).map((l) => (
                  <TableRow key={l.id} className="border-slate-800 hover:bg-slate-800/40" data-testid={`admin-lab-row-${l.id}`}>
                    <TableCell className="font-medium text-slate-100">{l.name}</TableCell>
                    <TableCell className="text-slate-400">{l.location}</TableCell>
                    <TableCell className="font-mono text-emerald-300">{l.computers}</TableCell>
                    <TableCell className="font-mono text-slate-300">{l.capacity}</TableCell>
                    <TableCell className={l.active ? "text-emerald-300" : "text-red-300"}>{l.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setLabEdit({ open: true, item: l })} data-testid={`admin-edit-lab-${l.id}`}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Remover" className="text-red-300" onClick={() => confirmDelete("labs", l.id, l.name)} data-testid={`admin-delete-lab-${l.id}`}><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setEqEdit({ open: true, item: null })} data-testid="admin-new-equipment-button"><Plus className="size-4" />Novo equipamento</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className={TH}>Nome</TableHead><TableHead className={TH}>Categoria</TableHead>
                  <TableHead className={TH}>Disp./Total</TableHead><TableHead className={TH}>Status</TableHead>
                  <TableHead className={`${TH} text-right`}>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(equipment.data ?? []).map((it) => (
                  <TableRow key={it.id} className="border-slate-800 hover:bg-slate-800/40" data-testid={`admin-equipment-row-${it.id}`}>
                    <TableCell className="font-medium text-slate-100">{it.name}</TableCell>
                    <TableCell className="text-slate-400">{it.category}</TableCell>
                    <TableCell className="font-mono text-slate-300"><span className="text-emerald-300">{it.available_now}</span>/{it.quantity}</TableCell>
                    <TableCell className={it.active ? "text-emerald-300" : "text-red-300"}>{it.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setEqEdit({ open: true, item: it })} data-testid={`admin-edit-equipment-${it.id}`}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Remover" className="text-red-300" onClick={() => confirmDelete("equipment", it.id, it.name)} data-testid={`admin-delete-equipment-${it.id}`}><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="reservations">
          <ReservationsTable
            reservations={all.data ?? []}
            now={stats.data?.now ?? ""}
            showUser
            onCancel={(id) => setCancelTarget(all.data?.find((r) => r.id === id) ?? null)}
            cancellingId={cancel.isPending ? cancel.variables?.id : null}
            emptyText="Nenhuma reserva registrada."
            testId="admin-reservations-table"
          />
        </TabsContent>
      </Tabs>

      {labEdit.open && <LabFormDialog key={labEdit.item?.id ?? "new"} lab={labEdit.item} open onClose={() => setLabEdit({ open: false, item: null })} />}
      {eqEdit.open && <EquipmentFormDialog key={eqEdit.item?.id ?? "new"} item={eqEdit.item} open onClose={() => setEqEdit({ open: false, item: null })} />}
      {cancelTarget && (
        <CancelReasonDialog
          key={cancelTarget.id}
          reservation={cancelTarget}
          pending={cancel.isPending}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => cancel.mutate({ id: cancelTarget.id, reason }, { onSuccess: () => setCancelTarget(null) })}
        />
      )}
    </div>
  );
}

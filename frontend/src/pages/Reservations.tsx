import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import ReservationsTable from "@/components/ReservationsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPost } from "@/lib/api";
import { RESERVATION_KEYS, errMsg, useMyReservations, useStats } from "@/lib/helpers";
import type { CancelIn, Reservation } from "@/lib/types";

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiPost<Reservation>(`/reservations/${id}/cancel`, { reason } satisfies CancelIn),
    onSuccess: () => {
      toast.success("Reserva cancelada");
      RESERVATION_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export default function Reservations() {
  const mine = useMyReservations();
  const stats = useStats();
  const cancel = useCancelReservation();
  const now = stats.data?.now ?? "";
  const list = mine.isError ? [] : mine.data ?? [];
  const active = list.filter((r) => r.status === "confirmed" && (!now || r.end > now)).sort((a, b) => a.start.localeCompare(b.start));
  const history = list.filter((r) => !active.includes(r));

  return (
    <div>
      <PageHeader eyebrow="Reservas" title="Minhas reservas" subtitle="Acompanhe e cancele suas reservas de laboratórios e aluguéis de equipamentos." />
      <Tabs defaultValue="active">
        <TabsList className="mb-5">
          <TabsTrigger value="active" data-testid="tab-active-reservations">Ativas ({active.length})</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history-reservations">Histórico ({history.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <ReservationsTable
            reservations={active}
            now={now}
            onCancel={(id) => cancel.mutate({ id, reason: "" })}
            cancellingId={cancel.isPending ? cancel.variables?.id : null}
            emptyText="Você não possui reservas ativas. Reserve um laboratório ou alugue um equipamento."
            testId="active-reservations-table"
          />
        </TabsContent>
        <TabsContent value="history">
          <ReservationsTable reservations={history} now={now} emptyText="Sem histórico ainda." testId="history-reservations-table" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiGet, apiPost } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

function ago(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

export default function NotificationsBell({ testId = "notifications-bell", align = "start" }: { testId?: string; align?: "start" | "end" }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<Notification[]>("/notifications"),
    refetchInterval: 30_000,
  });
  const list = q.isError ? [] : q.data ?? [];
  const unread = list.filter((n) => !n.read).length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["my-reservations"] });
  };
  const readOne = useMutation({ mutationFn: (id: string) => apiPost<Notification>(`/notifications/${id}/read`), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => apiPost<{ updated: number }>("/notifications/read-all"), onSuccess: refresh });

  return (
    <Popover>
      <PopoverTrigger
        className="relative grid size-9 place-items-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-slate-100"
        aria-label="Notificações"
        data-testid={testId}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-semibold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]" data-testid={`${testId}-count`}>
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} side="bottom" className="w-80 border-slate-800 bg-slate-900 p-0" data-testid="notifications-panel">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="font-heading font-semibold text-slate-100">Notificações</div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => readAll.mutate()}
              className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
              data-testid="notifications-read-all"
            >
              <CheckCheck className="size-3.5" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {list.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500" data-testid="notifications-empty">Nenhuma notificação.</div>
          ) : (
            list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read && readOne.mutate(n.id)}
                className={cn(
                  "block w-full border-b border-slate-800/70 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-800/50",
                  !n.read && "bg-red-500/[0.06]",
                )}
                data-testid={`notification-${n.id}`}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-slate-700" : "bg-red-400")} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100" data-testid="notification-title">{n.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{n.message}</div>
                    {n.reason && (
                      <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-950/40 px-2 py-1.5 text-xs text-amber-200" data-testid="notification-reason">
                        <span className="font-semibold">Motivo:</span> {n.reason}
                      </div>
                    )}
                    <div className="mt-1.5 font-mono text-[10px] text-slate-500">{ago(n.created_at)}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

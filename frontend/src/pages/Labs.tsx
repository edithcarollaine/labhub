import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Server, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import LabBookingDialog from "@/components/LabBookingDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { IMAGES, useStats } from "@/lib/helpers";
import type { Lab } from "@/lib/types";
import { cn } from "@/lib/utils";

const LAB_IMAGES = [IMAGES.lab, IMAGES.labResearch, IMAGES.board, IMAGES.workspace];

export default function Labs() {
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => apiGet<Lab[]>("/labs") });
  const stats = useStats();
  const [selected, setSelected] = useState<Lab | null>(null);
  const today = stats.data?.now.slice(0, 10) ?? "";
  const list = labs.isError ? [] : labs.data ?? [];
  const totalPcs = list.reduce((a, l) => a + l.computers, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Laboratórios"
        title="Reserve um laboratório"
        subtitle="Confira quantos computadores cada sala possui e reserve um horário. A confirmação é automática quando não há conflito."
        action={
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-right" data-testid="labs-total-computers">
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Computadores no campus</div>
            <div className="font-mono text-3xl font-semibold text-emerald-300">{totalPcs}</div>
          </div>
        }
      />

      {labs.isLoading && <div className="text-slate-500">Carregando…</div>}
      {labs.isError && <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-400">Não foi possível carregar os laboratórios.</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list.map((lab, i) => (
          <article
            key={lab.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/30 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
            data-testid={`lab-card-${lab.id}`}
          >
            <div className="relative h-36 overflow-hidden">
              <img src={LAB_IMAGES[i % LAB_IMAGES.length]} alt={lab.name} className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <span className={cn("absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 backdrop-blur",
                !lab.active ? "bg-red-950/80 text-red-300 ring-red-500/30" : lab.in_use_now ? "bg-amber-950/80 text-amber-300 ring-amber-500/30" : "bg-emerald-950/80 text-emerald-300 ring-emerald-500/30")}
                data-testid="lab-status">
                <span className={cn("size-1.5 rounded-full", !lab.active ? "bg-red-400" : lab.in_use_now ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                {!lab.active ? "Inativo" : lab.in_use_now ? "Em uso agora" : "Livre agora"}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg font-semibold text-slate-100" data-testid="lab-name">{lab.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-400"><MapPin className="size-3.5" />{lab.location}</div>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800">
                <div className="bg-slate-950/60 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Server className="size-3" />Computadores</div>
                  <div className="mt-1 font-mono text-2xl font-semibold text-emerald-300" data-testid="lab-computers">{lab.computers}</div>
                </div>
                <div className="bg-slate-950/60 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500"><Users className="size-3" />Capacidade</div>
                  <div className="mt-1 font-mono text-2xl font-semibold text-slate-200">{lab.capacity}</div>
                </div>
              </div>
              {lab.description && <p className="mt-4 text-sm text-slate-400">{lab.description}</p>}
              {lab.specs && <p className="mt-2 font-mono text-xs text-slate-500">{lab.specs}</p>}
              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <Link to={`/laboratorios/${lab.id}/agenda`} className={cn(buttonVariants({ variant: "outline" }), "h-11 font-semibold")} data-testid={`lab-agenda-btn-${lab.id}`}>
                  <CalendarDays className="size-4" /> Agenda
                </Link>
                <Button className="h-11 w-full font-semibold" disabled={!lab.active} onClick={() => setSelected(lab)} data-testid={`book-lab-btn-${lab.id}`}>
                  Reservar
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selected && <LabBookingDialog key={selected.id} lab={selected} today={today} onClose={() => setSelected(null)} />}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import EquipmentRentDialog from "@/components/EquipmentRentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { useStats } from "@/lib/helpers";
import type { Equipment } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export default function EquipmentPage() {
  const items = useQuery({ queryKey: ["equipment"], queryFn: () => apiGet<Equipment[]>("/equipment") });
  const stats = useStats();
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(ALL);
  const today = stats.data?.now.slice(0, 10) ?? "";
  const list = items.isError ? [] : items.data ?? [];
  const categories = useMemo(() => Array.from(new Set(list.map((i) => i.category))).sort(), [list]);
  const filtered = list.filter(
    (i) => (cat === ALL || i.category === cat) && (i.name.toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader eyebrow="Equipamentos" title="Aluguel de hardware" subtitle="Notebooks, kits de microcontroladores, periféricos e ferramentas disponíveis para empréstimo." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input placeholder="Buscar equipamento…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 bg-slate-900/80 pl-9" data-testid="equipment-search-input" />
        </div>
        <Select value={cat} onValueChange={(v: string) => setCat(v)}>
          <SelectTrigger className="h-11 w-full bg-slate-900/80 sm:w-56" data-testid="equipment-category-filter">
            <SelectValue>{(v) => (v === ALL ? "Todas as categorias" : (v as string))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.isLoading && <div className="text-slate-500">Carregando…</div>}
      {!items.isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-400" data-testid="equipment-empty">Nenhum equipamento encontrado.</div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((it, i) => {
          const pct = it.quantity ? (it.available_now / it.quantity) * 100 : 0;
          const none = it.available_now === 0 || !it.active;
          return (
            <article
              key={it.id}
              className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/30 animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
              data-testid={`equipment-card-${it.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-400">{it.category}</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-100" data-testid="equipment-name">{it.name}</h3>
                </div>
                <div className="text-right">
                  <div className={cn("font-mono text-2xl font-semibold", none ? "text-red-300" : "text-emerald-300")} data-testid="equipment-available">
                    {it.available_now}
                    <span className="text-sm text-slate-500">/{it.quantity}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">disponíveis</div>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className={cn("h-full rounded-full transition-[width] duration-500", none ? "bg-red-400" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
              </div>
              {it.description && <p className="mt-4 text-sm text-slate-400">{it.description}</p>}
              {it.specs && <p className="mt-2 font-mono text-xs text-slate-500">{it.specs}</p>}
              <div className="mt-auto pt-5">
                <Button className="h-11 w-full font-semibold" variant={none ? "secondary" : "default"} disabled={!it.active || it.quantity === 0} onClick={() => setSelected(it)} data-testid={`equipment-rent-btn-${it.id}`}>
                  {it.active ? "Alugar" : "Indisponível"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {selected && <EquipmentRentDialog key={selected.id} item={selected} today={today} onClose={() => setSelected(null)} />}
    </div>
  );
}

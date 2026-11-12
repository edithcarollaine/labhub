import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ApiError, apiGet } from "@/lib/api";
import type { Reservation, StatsOut, UserPublic } from "@/lib/types";

export const PROFESSOR_DOMAIN = "ufpa.br";
export const STUDENT_DOMAIN = "tucurui.ufpa.br";
// UFPA page where people create/activate their institutional account (first access).
export const UFPA_ACCOUNT_URL = "https://servicosdetic.ufpa.br/containstitucional";

export const IMAGES = {
  lab: "https://images.unsplash.com/photo-1720320704929-ebabb3a3fc6b?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400",
  labResearch: "https://images.unsplash.com/photo-1766297247924-6638d54e7c89?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400",
  hardware: "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400",
  board: "https://images.unsplash.com/photo-1515630278258-407f66498911?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400",
  workspace: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400",
  laptops: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400",
};

export function isCollegeEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1] ?? "";
  return domain === PROFESSOR_DOMAIN || domain === STUDENT_DOMAIN;
}

export function errMsg(e: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "detail" in e.body) {
    const d = (e.body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return "Dados inválidos: verifique os campos.";
  }
  return fallback;
}

export function fmtDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function fmtTime(iso: string): string {
  return iso.slice(11, 16);
}

export function fmtRange(start: string, end: string): string {
  if (start.slice(0, 10) === end.slice(0, 10)) return `${fmtDateTime(start)} – ${fmtTime(end)}`;
  return `${fmtDateTime(start)} – ${fmtDateTime(end)}`;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<UserPublic>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => apiGet<StatsOut>("/stats") });
}

export function useMyReservations() {
  return useQuery({ queryKey: ["my-reservations"], queryFn: () => apiGet<Reservation[]>("/reservations/mine") });
}

// Keys invalidated after any reservation change.
export const RESERVATION_KEYS = [["stats"], ["labs"], ["equipment"], ["my-reservations"], ["all-reservations"], ["schedule"]];

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { errMsg } from "@/lib/helpers";
import type { GoogleLoginIn, UserPublic } from "@/lib/types";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const GSI_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar o Google"));
    document.head.appendChild(s);
  });
}

export default function GoogleLoginButton({ label = "Entrar com conta institucional UFPA" }: { label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const googleRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !googleRef.current || !wrapRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }: { credential: string }) => {
            try {
              const user = await apiPost<UserPublic>("/auth/google", { credential } satisfies GoogleLoginIn);
              beginSession();
              qc.setQueryData(["me"], user);
              toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
              navigate("/painel", { replace: true });
            } catch (e) {
              toast.error(errMsg(e, "Não foi possível concluir o acesso institucional"));
            }
          },
        });
        const width = Math.min(400, Math.max(200, Math.round(wrapRef.current.offsetWidth)));
        window.google.accounts.id.renderButton(googleRef.current, {
          theme: "filled_blue",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width,
          locale: "pt-BR",
        });
      })
      .catch(() => toast.error("Não foi possível carregar o login do Google"));
    return () => {
      cancelled = true;
    };
  }, [navigate, qc]);

  return (
    <div
      ref={wrapRef}
      className="relative h-12 w-full overflow-hidden rounded-lg"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid="google-login-button"
    >
      {/* Botão visível, no padrão do site */}
      <div
        aria-hidden
        className={`pointer-events-none flex h-full w-full items-center justify-center gap-2 text-base font-semibold text-slate-950 transition-colors ${
          hover ? "bg-emerald-400" : "bg-emerald-500"
        }`}
      >
        <GraduationCap className="size-5" />
        {label}
      </div>
      {/* Botão oficial do Google, invisível, por cima: recebe o clique */}
      <div
        ref={googleRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.01]"
      />
    </div>
  );
}
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

export default function GoogleLoginButton() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return;
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
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          locale: "pt-BR",
        });
      })
      .catch(() => toast.error("Não foi possível carregar o login do Google"));
    return () => {
      cancelled = true;
    };
  }, [navigate, qc]);

  return <div ref={ref} data-testid="google-login-button" />;
}
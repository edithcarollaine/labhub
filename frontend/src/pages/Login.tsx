import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, GraduationCap, KeyRound, Loader2, LogIn } from "lucide-react";
import AuthSplit from "@/components/AuthSplit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { PROFESSOR_DOMAIN, STUDENT_DOMAIN, errMsg, useMe } from "@/lib/helpers";
import type { LoginIn, UserPublic } from "@/lib/types";
import { cn } from "@/lib/utils";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function Login() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: (body: LoginIn) => apiPost<UserPublic>("/auth/login", body),
    onSuccess: (user) => {
      beginSession();
      qc.setQueryData(["me"], user);
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate("/painel");
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (me.data && !me.isError) return <Navigate to="/painel" replace />;

  return (
    <AuthSplit title="Entrar" subtitle="Use sua conta institucional da UFPA. Você será redirecionado para a página de acesso da instituição.">
      <div className="space-y-6" data-testid="login-panel">
      <div className="flex justify-center" data-testid="institutional-login-button">
        <GoogleLoginButton />
      </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3" data-testid="domain-professor">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Professores</div>
            <div className="mt-1 font-mono text-emerald-300">@{PROFESSOR_DOMAIN}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3" data-testid="domain-student">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Alunos</div>
            <div className="mt-1 font-mono text-sky-300">@{STUDENT_DOMAIN}</div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-400">
          Primeiro acesso?{" "}
          <Link to="/primeiro-acesso" className="font-medium text-sky-400 hover:text-sky-300" data-testid="first-access-link">
            Ainda não tenho conta
          </Link>
        </p>

        <div className="border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setShowAdmin((s) => !s)}
            className="flex w-full items-center justify-between text-sm text-slate-500 transition-colors duration-200 hover:text-slate-300"
            data-testid="admin-login-toggle"
          >
            <span className="inline-flex items-center gap-2"><KeyRound className="size-4" />Acesso do administrador</span>
            <ChevronDown className={cn("size-4 transition-transform duration-200", showAdmin && "rotate-180")} />
          </button>
          {showAdmin && (
            <form
              onSubmit={(e) => { e.preventDefault(); login.mutate({ email, password }); }}
              className="mt-4 space-y-4 animate-fade-up"
              data-testid="admin-login-form"
            >
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-slate-900/80 font-mono" data-testid="login-email-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-slate-900/80" data-testid="login-password-input" />
              </div>
              <Button type="submit" variant="outline" className="h-11 w-full" disabled={login.isPending} data-testid="login-submit-button">
                {login.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Entrar como administrador
              </Button>
            </form>
          )}
        </div>
      </div>
    </AuthSplit>
  );
}

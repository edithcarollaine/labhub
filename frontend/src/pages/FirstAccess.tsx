import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import AuthSplit from "@/components/AuthSplit";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { buttonVariants } from "@/components/ui/button";
import { PROFESSOR_DOMAIN, STUDENT_DOMAIN, UFPA_ACCOUNT_URL } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: "01", t: "Tenha sua conta institucional", d: `Professores usam @${PROFESSOR_DOMAIN} e alunos @${STUDENT_DOMAIN}. Se ainda não ativou, faça isso na página da UFPA.` },
  { n: "02", t: "Entre com o Google", d: "Clique no botão abaixo e escolha a sua conta institucional da UFPA no seletor do Google." },
  { n: "03", t: "Pronto!", d: "Seu cadastro no LabHub é criado automaticamente no primeiro acesso, com perfil de Professor ou Aluno conforme o seu e-mail." },
];

export default function FirstAccess() {
  return (
    <AuthSplit title="Primeiro acesso" subtitle="Não é preciso criar senha no LabHub — o acesso é feito com a sua conta da UFPA.">
      <div className="space-y-6" data-testid="first-access-panel">
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4" data-testid={`first-access-step-${s.n}`}>
              <div className="font-mono text-sm font-semibold text-emerald-400">{s.n}</div>
              <div>
                <div className="font-medium text-slate-100">{s.t}</div>
                <div className="mt-1 text-sm text-slate-400">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex justify-center" data-testid="first-access-login-button">
          <GoogleLoginButton />
        </div>
        <a
          href={UFPA_ACCOUNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full")}
          data-testid="ufpa-account-link"
        >
          Ainda não tenho e-mail da UFPA <ExternalLink className="size-4" />
        </a>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200" data-testid="back-to-login-link">
          <ArrowLeft className="size-4" /> Voltar para o login
        </Link>
      </div>
    </AuthSplit>
  );
}
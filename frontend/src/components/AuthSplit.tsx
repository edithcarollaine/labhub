import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/AppShell";
import { IMAGES, PROFESSOR_DOMAIN, STUDENT_DOMAIN } from "@/lib/helpers";

export default function AuthSplit({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img src={IMAGES.lab} alt="Laboratório de informática" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,15,25,0.85)_0%,rgba(11,15,25,0.98)_100%)]" />
        <div className="absolute inset-0 bg-micro-grid" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-lg animate-fade-up">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-400">Campus Universitário de Tucuruí</div>
            <h2 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight text-white">
              Laboratórios e hardware,<br />
              <span className="text-emerald-400">a um clique.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-300">
              Reserve salas de computação, veja quantos computadores cada laboratório possui e alugue equipamentos — com confirmação instantânea.
            </p>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {[
                ["24/7", "Reservas online"],
                ["0", "Conflitos"],
                ["<1s", "Confirmação"],
              ].map(([v, l]) => (
                <div key={l} className="bg-slate-950/70 p-4 backdrop-blur">
                  <div className="font-mono text-2xl font-semibold text-emerald-300">{v}</div>
                  <div className="mt-1 text-xs text-slate-400">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center gap-2 overflow-hidden font-mono text-xs text-slate-400">
            <ShieldCheck className="size-4 text-emerald-400" /> Acesso exclusivo para @{PROFESSOR_DOMAIN} e @{STUDENT_DOMAIN}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">Portal institucional</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">{title}</h1>
          <p className="mt-2 text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}

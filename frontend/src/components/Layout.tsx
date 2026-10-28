import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  CalendarClock, ChartLine, LayoutDashboard, LogOut, Menu, ShieldCheck, SlidersHorizontal, Users, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../lib/auth";
import { iniciais } from "../lib/formato";
import { Logo } from "./Logo";
import { BotaoIcone, Carregando, cn } from "./ui";

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
}

const PLANEJAMENTO: ItemMenu[] = [
  { para: "/painel", rotulo: "Painel", icone: LayoutDashboard },
  { para: "/otimizacao", rotulo: "Otimização", icone: SlidersHorizontal },
];

const ADMINISTRACAO: ItemMenu[] = [{ para: "/usuarios", rotulo: "Usuários", icone: Users }];

function GrupoMenu({ titulo, itens }: { titulo: string; itens: ItemMenu[] }) {
  return (
    <div>
      <p className="px-3 pb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">{titulo}</p>
      <ul className="space-y-1">
        {itens.map(({ para, rotulo, icone: Icone }) => (
          <li key={para}>
            <NavLink to={para}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}>
              {({ isActive }) => (
                <>
                  <Icone className={cn("size-4", isActive ? "text-brand-600" : "text-slate-400")} aria-hidden />
                  {rotulo}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarraLateral({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario, sair } = useAuth();
  if (!usuario) return null;
  const admin = usuario.role === "admin";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" onClick={aoNavegar}>
        <GrupoMenu titulo="Planejamento" itens={PLANEJAMENTO} />
        {admin && <GrupoMenu titulo="Administração" itens={ADMINISTRACAO} />}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {iniciais(usuario.full_name)}
          </span>
          <div className="min-w-0 flex-1" title={`@${usuario.username}`}>
            <p className="truncate text-sm font-medium text-slate-900">{usuario.full_name}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              {admin && <ShieldCheck className="size-3.5 shrink-0 text-brand-600" aria-hidden />}
              {admin ? "Administrador" : "Usuário"}
            </p>
          </div>
          <BotaoIcone icone={LogOut} rotulo="Sair" onClick={sair} />
        </div>
      </div>
    </div>
  );
}

export function LayoutApp() {
  const [menuAberto, setMenuAberto] = useState(false);
  const local = useLocation();

  useEffect(() => setMenuAberto(false), [local.pathname]);

  return (
    <div className="min-h-dvh">
      {/* Barra lateral fixa em telas grandes */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <BarraLateral />
      </aside>

      {/* Barra superior + gaveta em telas pequenas */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <BotaoIcone icone={Menu} rotulo="Abrir menu" onClick={() => setMenuAberto(true)} />
      </header>
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">
            <BotaoIcone icone={X} rotulo="Fechar menu" onClick={() => setMenuAberto(false)}
              className="absolute top-4 right-3" />
            <BarraLateral aoNavegar={() => setMenuAberto(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------------------------
// Telas de entrada e cadastro

const DESTAQUES = [
  { icone: ChartLine, titulo: "Demanda simulada", texto: "Estime quantos atendentes cada intervalo do dia exige." },
  { icone: SlidersHorizontal, titulo: "Turnos otimizados", texto: "Combine durações e custos para gastar o mínimo." },
  { icone: CalendarClock, titulo: "Escala pronta", texto: "Veja quem entra em cada horário e exporte para o Excel." },
];

export function LayoutEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-10 text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute -top-32 -right-32 size-96 rounded-full border-[48px] border-white/5" />
        <div aria-hidden className="absolute -bottom-40 -left-24 size-[28rem] rounded-full border-[64px] border-white/5" />
        <Logo invertido />
        <div className="relative my-auto max-w-md">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">
            A equipe certa, no horário certo, pelo menor custo.
          </h1>
          <p className="mt-3 text-brand-100">
            O Attentus planeja a escala da sua central de atendimento a partir do volume e da duração das ligações.
          </p>
          <ul className="mt-10 space-y-5">
            {DESTAQUES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icone className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{titulo}</p>
                  <p className="text-sm text-brand-100">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200">Attentus · Otimização da força de trabalho</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}

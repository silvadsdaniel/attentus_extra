import { forwardRef, useEffect, useId, useRef } from "react";
import type {
  ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes,
} from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------------------------
// Botões

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600",
  secundario: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 shadow-xs hover:bg-slate-50",
  fantasma: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  perigo: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

/** Classes de botão, para usar também em links (<Link className={estiloBotao()}>). */
export function estiloBotao(variante: Variante = "primario", tamanho: Tamanho = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTES[variante], TAMANHOS[tamanho], className,
  );
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: LucideIcon;
  carregando?: boolean;
}

export function Botao({
  variante = "primario", tamanho = "md", icone: Icone, carregando, className, children,
  disabled, type = "button", ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={estiloBotao(variante, tamanho, className)}
      {...props}
    >
      {carregando ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        Icone && <Icone className="size-4" aria-hidden />
      )}
      {children}
    </button>
  );
}

export function BotaoIcone({
  icone: Icone, rotulo, className, perigo, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icone: LucideIcon; rotulo: string; perigo?: boolean }) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        perigo ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-900",
        className,
      )}
      {...props}
    >
      <Icone className="size-4" aria-hidden />
    </button>
  );
}

// ------------------------------------------------------------------------------------
// Estrutura

export function Cartao({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-xs", className)}>
      {children}
    </section>
  );
}

export function CabecalhoCartao({
  titulo, descricao, icone: Icone, acoes,
}: { titulo: string; descricao?: ReactNode; icone?: LucideIcon; acoes?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icone && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icone className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
        </div>
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function CabecalhoPagina({
  titulo, descricao, acoes,
}: { titulo: ReactNode; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

export function Indicador({
  rotulo, valor, detalhe, icone: Icone,
}: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; icone: LucideIcon }) {
  return (
    <Cartao className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{rotulo}</p>
        <Icone className="size-4 text-slate-400" aria-hidden />
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </Cartao>
  );
}

export function EstadoVazio({
  icone: Icone, titulo, descricao, acao,
}: { icone: LucideIcon; titulo: string; descricao: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icone className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{descricao}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

// ------------------------------------------------------------------------------------
// Etiquetas e avisos

type Cor = "marca" | "cinza" | "verde" | "vermelho" | "ambar";

const CORES_ETIQUETA: Record<Cor, string> = {
  marca: "bg-brand-50 text-brand-700 ring-brand-600/20",
  cinza: "bg-slate-100 text-slate-600 ring-slate-500/15",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  vermelho: "bg-red-50 text-red-700 ring-red-600/15",
  ambar: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

export function Etiqueta({
  cor = "cinza", icone: Icone, children,
}: { cor?: Cor; icone?: LucideIcon; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
      CORES_ETIQUETA[cor],
    )}>
      {Icone && <Icone className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

type TipoAviso = "info" | "sucesso" | "alerta" | "erro";

const AVISOS: Record<TipoAviso, { classe: string; icone: LucideIcon }> = {
  info: { classe: "bg-brand-50 text-brand-900 ring-brand-600/15", icone: Info },
  sucesso: { classe: "bg-emerald-50 text-emerald-900 ring-emerald-600/20", icone: CircleCheck },
  alerta: { classe: "bg-amber-50 text-amber-900 ring-amber-600/25", icone: TriangleAlert },
  erro: { classe: "bg-red-50 text-red-900 ring-red-600/20", icone: CircleAlert },
};

export function Aviso({
  tipo = "info", titulo, children, className,
}: { tipo?: TipoAviso; titulo?: string; children?: ReactNode; className?: string }) {
  const { classe, icone: Icone } = AVISOS[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset", classe, className)}>
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className={cn(titulo && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <LoaderCircle className="size-5 animate-spin text-brand-600" aria-hidden />
      {texto}
    </div>
  );
}

// ------------------------------------------------------------------------------------
// Formulários

export function Campo({
  rotulo, ajuda, erro, children, id, acessorio,
}: { rotulo: string; ajuda?: ReactNode; erro?: string; children: ReactNode; id: string; acessorio?: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">{rotulo}</label>
        {acessorio}
      </div>
      {children}
      {erro ? (
        <p className="mt-1.5 text-xs text-red-600">{erro}</p>
      ) : (
        ajuda && <p className="mt-1.5 text-xs text-slate-500">{ajuda}</p>
      )}
    </div>
  );
}

const CLASSE_CAMPO = cn(
  "block w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-900 shadow-xs ring-1 ring-inset ring-slate-300",
  "placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
);

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }>(
  function Entrada({ className, invalido, ...props }, ref) {
    return (
      <input ref={ref} aria-invalid={invalido || undefined}
        className={cn(CLASSE_CAMPO, "h-10", invalido && "ring-red-400 focus:ring-red-500", className)}
        {...props} />
    );
  },
);

export function Selecao({
  className, invalido, children, ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalido?: boolean }) {
  return (
    <select aria-invalid={invalido || undefined}
      className={cn(CLASSE_CAMPO, "h-10 pr-8", invalido && "ring-red-400 focus:ring-red-500", className)}
      {...props}>
      {children}
    </select>
  );
}

/** Campo numérico com unidade à direita (ex.: "s", "R$"). */
export function EntradaComUnidade({
  unidade, prefixo, ...props
}: InputHTMLAttributes<HTMLInputElement> & { unidade?: string; prefixo?: string; invalido?: boolean }) {
  return (
    <div className="relative">
      {prefixo && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
          {prefixo}
        </span>
      )}
      <Entrada {...props} className={cn("tabular", prefixo && "pl-9", unidade && "pr-10")} />
      {unidade && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
          {unidade}
        </span>
      )}
    </div>
  );
}

export function useIdCampo(prefixo: string) {
  return `${prefixo}-${useId().replace(/:/g, "")}`;
}

// ------------------------------------------------------------------------------------
// Abas

export function Abas<T extends string>({
  abas, ativa, aoMudar,
}: { abas: { id: T; rotulo: string; icone?: LucideIcon }[]; ativa: T; aoMudar: (id: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 px-5">
      {abas.map(({ id, rotulo, icone: Icone }) => (
        <button key={id} role="tab" type="button" aria-selected={ativa === id} onClick={() => aoMudar(id)}
          className={cn(
            "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
            ativa === id
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
          )}>
          {Icone && <Icone className="size-4" aria-hidden />}
          {rotulo}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------
// Janela modal (usa <dialog>, que já cuida do foco e da tecla Esc)

export function Modal({
  aberto, aoFechar, titulo, descricao, children, rodape,
}: {
  aberto: boolean; aoFechar: () => void; titulo: string; descricao?: ReactNode;
  children?: ReactNode; rodape?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog ref={ref} onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl">
      {aberto && (
        <div>
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
              {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
            </div>
            <BotaoIcone icone={X} rotulo="Fechar" onClick={aoFechar} className="-mr-2" />
          </div>
          {children && <div className="px-6 pt-4">{children}</div>}
          {rodape && <div className="mt-6 flex justify-end gap-2 bg-slate-50 px-6 py-4">{rodape}</div>}
          {!rodape && <div className="h-6" />}
        </div>
      )}
    </dialog>
  );
}

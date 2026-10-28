import { cn } from "./ui";

/** Marca do Attentus: um alvo (atenção no ponto certo) dentro de um quadrado arredondado. */
export function Simbolo({ className, invertido }: { className?: string; invertido?: boolean }) {
  const fundo = invertido ? "#FFFFFF" : "#2B59C3";
  const traco = invertido ? "#2B59C3" : "#FFFFFF";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill={fundo} />
      <circle cx="32" cy="32" r="17" fill="none" stroke={traco} strokeWidth="5" />
      <circle cx="32" cy="32" r="6" fill={traco} />
      <path d="M32 6v12M32 46v12M6 32h12M46 32h12" stroke={traco} strokeWidth="5"
        strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Logo({ className, invertido }: { className?: string; invertido?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Simbolo className="size-8" invertido={invertido} />
      <span className={cn("text-lg font-semibold tracking-tight", invertido ? "text-white" : "text-slate-900")}>
        Attentus
      </span>
    </span>
  );
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const formataMoeda = (valor: number) => moeda.format(valor);

export const formataNumero = (valor: number, casas = 0) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);

export const formataPercentual = (valor: number, casas = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: casas }).format(valor);

/** Datas do SQLite (CURRENT_TIMESTAMP) vêm em UTC no formato "AAAA-MM-DD HH:MM:SS". */
export function formataDataHora(valor?: string | null): string {
  if (!valor) return "—";
  const data = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(valor) ? valor : `${valor.replace(" ", "T")}Z`);
  return Number.isNaN(data.getTime()) ? valor : dataHora.format(data);
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (partes[0][0] + ultima).toUpperCase();
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

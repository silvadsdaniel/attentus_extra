// Regras da configuração da otimização. Espelham utilidades/utils.py (encontra_divisores e
// lista_turnos_possiveis) para validar na hora, sem ida ao servidor; a API valida de novo.

export interface TurnoConfig {
  id: string;
  duracaoMin: number;
  custo: number;
}

export interface Parametros {
  horasTotal: number;
  horaInicial: number;
  minutoInicial: number;
  intervalo: number;
  turnos: TurnoConfig[];
  tempoDescanso: number;
  tempoMaximoEspera: number;
  grau: number;
  semente: number | null;
}

export interface Periodo {
  inicio: string;
  fim: string;
  ligacoes: number;
  necessarios: number;
  escalados: number;
  entradas: Record<string, number>;
}

export interface ResultadoTurno {
  rotulo: string;
  duracao_horas: number;
  custo: number;
  atendentes: number;
  custo_total: number;
}

export interface Resultado {
  status: string;
  custo_total: number;
  total_atendentes: number;
  pico_necessarios: number;
  turnos: ResultadoTurno[];
  periodos: Periodo[];
  avisos: string[];
}

export interface ResumoArquivo {
  nome: string;
  linhas: number;
  colunas: string[];
  amostra: Record<string, string>[];
  resumo: Record<string, number>;
}

export type TipoArquivo = "duracoes" | "volume";

export const MAX_TURNOS = 5;

const novoId = () => Math.random().toString(36).slice(2, 10);

// Custos por regime da planilha dados/nad.xlsx
export const PARAMETROS_PADRAO: Parametros = {
  horasTotal: 24,
  horaInicial: 0,
  minutoInicial: 0,
  intervalo: 15,
  turnos: [
    { id: "t3", duracaoMin: 180, custo: 540 },
    { id: "t4", duracaoMin: 240, custo: 680 },
    { id: "t6", duracaoMin: 360, custo: 960 },
  ],
  tempoDescanso: 0,
  tempoMaximoEspera: 10,
  grau: 2,
  semente: null,
};

export function novoTurno(parametros: Parametros): TurnoConfig {
  const usadas = new Set(parametros.turnos.map((t) => t.duracaoMin));
  const livre = duracoesPossiveis(parametros).find((m) => !usadas.has(m)) ?? 60;
  return { id: novoId(), duracaoMin: livre, custo: 0 };
}

export function divisores(n: number): number[] {
  const lista: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) lista.push(i);
  return lista;
}

export function intervalosPossiveis(p: Pick<Parametros, "horasTotal">): number[] {
  return divisores(p.horasTotal * 60);
}

/** Durações de turno válidas (em minutos): de 1 h até o dia operacional, múltiplas do intervalo. */
export function duracoesPossiveis(p: Pick<Parametros, "horasTotal" | "intervalo">): number[] {
  const lista: number[] = [];
  for (let m = 60; m <= p.horasTotal * 60; m++) if (m % p.intervalo === 0) lista.push(m);
  return lista;
}

export function rotuloDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

export function rotuloHorario(minutosDoDia: number): string {
  const total = ((minutosDoDia % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function numeroPeriodos(p: Parametros): number {
  return Math.floor((p.horasTotal * 60) / p.intervalo);
}

export function janelaOperacao(p: Parametros): { inicio: string; fim: string } {
  const inicio = p.horaInicial * 60 + p.minutoInicial;
  return { inicio: rotuloHorario(inicio), fim: rotuloHorario(inicio + p.horasTotal * 60) };
}

/** Erros de configuração, por campo, prontos para exibir. */
export function validaParametros(p: Parametros): { geral: string[]; turnos: Record<string, string> } {
  const geral: string[] = [];
  const turnos: Record<string, string> = {};

  if (!intervalosPossiveis(p).includes(p.intervalo)) {
    geral.push(`O intervalo de ${p.intervalo} min não divide ${p.horasTotal} h em partes iguais.`);
  }
  if (p.turnos.length === 0) geral.push("Adicione pelo menos um tipo de turno.");

  const possiveis = new Set(duracoesPossiveis(p));
  const vistas = new Set<number>();
  for (const turno of p.turnos) {
    if (!possiveis.has(turno.duracaoMin)) {
      turnos[turno.id] = `Precisa ser múltiplo de ${p.intervalo} min e até ${p.horasTotal} h.`;
    } else if (vistas.has(turno.duracaoMin)) {
      turnos[turno.id] = "Já existe um turno com essa duração.";
    } else if (!(turno.custo >= 0)) {
      turnos[turno.id] = "Informe um custo válido.";
    }
    vistas.add(turno.duracaoMin);
  }
  return { geral, turnos };
}

export function paraApi(p: Parametros) {
  return {
    horas_total: p.horasTotal,
    hora_inicial: p.horaInicial,
    minuto_inicial: p.minutoInicial,
    intervalo: p.intervalo,
    turnos: p.turnos.map((t) => ({ duracao_horas: t.duracaoMin / 60, custo: t.custo })),
    tempo_descanso: p.tempoDescanso,
    tempo_maximo_espera: p.tempoMaximoEspera,
    grau: p.grau,
    semente: p.semente,
  };
}

/** Parcela da capacidade escalada que a demanda simulada realmente usa. */
export function aproveitamento(resultado: Resultado): number {
  const escalados = resultado.periodos.reduce((soma, p) => soma + p.escalados, 0);
  const necessarios = resultado.periodos.reduce((soma, p) => soma + p.necessarios, 0);
  return escalados > 0 ? necessarios / escalados : 0;
}

/** CSV com ";" e BOM, que o Excel em português abre direto com as colunas separadas. */
export function escalaParaCsv(resultado: Resultado): Blob {
  const rotulos = resultado.turnos.map((t) => t.rotulo);
  const cabecalho = ["inicio", "fim", ...rotulos.map((r) => `entradas_${r}`), "escalados", "necessarios", "ligacoes"];
  const linhas = resultado.periodos.map((p) =>
    [p.inicio, p.fim, ...rotulos.map((r) => p.entradas[r] ?? 0), p.escalados, p.necessarios, p.ligacoes].join(";"),
  );
  return new Blob(["﻿" + [cabecalho.join(";"), ...linhas].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
}

import type { ReactNode } from "react";
import { ChevronDown, Plus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { useOtimizacao } from "../../lib/estado-otimizacao";
import {
  duracoesPossiveis, intervalosPossiveis, janelaOperacao, MAX_TURNOS, novoTurno, numeroPeriodos, rotuloDuracao,
  rotuloHorario, validaParametros,
} from "../../lib/otimizacao";
import type { Parametros } from "../../lib/otimizacao";
import {
  Aviso, Botao, BotaoIcone, CabecalhoCartao, Campo, Cartao, Entrada, EntradaComUnidade, Selecao,
} from "../ui";

function Secao({ titulo, acoes, children }: { titulo: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{titulo}</h3>
        {acoes}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function rotuloIntervalo(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Converte o texto de um campo numérico, limitando ao intervalo permitido. */
function numero(texto: string, minimo: number, maximo: number): number {
  const valor = Number(texto);
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(maximo, Math.max(minimo, valor));
}

export function CartaoParametros() {
  const { parametros: p, setParametros, restaurarPadrao } = useOtimizacao();
  const erros = validaParametros(p);
  const intervalos = intervalosPossiveis(p);
  const duracoes = duracoesPossiveis(p);
  const janela = janelaOperacao(p);
  const viraODia = p.horaInicial * 60 + p.minutoInicial + p.horasTotal * 60 > 1440;

  const atualiza = (parcial: Partial<Parametros>) => setParametros((atual) => ({ ...atual, ...parcial }));

  function mudaHoras(horasTotal: number) {
    // mantém um intervalo que continue dividindo o novo dia operacional
    const validos = intervalosPossiveis({ horasTotal });
    const intervalo = validos.includes(p.intervalo)
      ? p.intervalo
      : Math.max(...validos.filter((v) => v <= p.intervalo));
    atualiza({ horasTotal, intervalo });
  }

  function mudaTurno(id: string, parcial: { duracaoMin?: number; custo?: number }) {
    setParametros((atual) => ({
      ...atual,
      turnos: atual.turnos.map((t) => (t.id === id ? { ...t, ...parcial } : t)),
    }));
  }

  return (
    <Cartao>
      <CabecalhoCartao icone={Settings2} titulo="Parâmetros" descricao="Como a operação funciona."
        acoes={<BotaoIcone icone={RotateCcw} rotulo="Restaurar valores padrão" onClick={restaurarPadrao} />} />

      <div className="divide-y divide-slate-100">
        <Secao titulo="Janela de operação">
          <Campo id="horas" rotulo="Horas de operação por dia"
            acessorio={<span className="tabular text-sm font-semibold text-brand-700">{p.horasTotal} h</span>}>
            <input id="horas" type="range" min={1} max={24} value={p.horasTotal}
              onChange={(e) => mudaHoras(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-brand-600" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="inicio" rotulo="Início">
              <Entrada id="inicio" type="time" step={60} required className="tabular"
                value={rotuloHorario(p.horaInicial * 60 + p.minutoInicial)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  if (Number.isFinite(h) && Number.isFinite(m)) atualiza({ horaInicial: h, minutoInicial: m });
                }} />
            </Campo>
            <Campo id="intervalo" rotulo="Intervalo">
              <Selecao id="intervalo" value={p.intervalo} onChange={(e) => atualiza({ intervalo: Number(e.target.value) })}>
                {intervalos.map((m) => <option key={m} value={m}>{rotuloIntervalo(m)}</option>)}
              </Selecao>
            </Campo>
          </div>
          <p className="tabular rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {numeroPeriodos(p)} períodos de {rotuloIntervalo(p.intervalo)} · {janela.inicio} → {janela.fim}
            {viraODia && " (dia seguinte)"}
          </p>
        </Secao>

        <Secao titulo="Tipos de turno"
          acoes={
            <Botao variante="fantasma" tamanho="sm" icone={Plus} disabled={p.turnos.length >= MAX_TURNOS}
              onClick={() => setParametros((atual) => ({ ...atual, turnos: [...atual.turnos, novoTurno(atual)] }))}>
              Adicionar
            </Botao>
          }>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_2rem] gap-x-2 text-xs font-medium text-slate-500">
            <span>Duração</span>
            <span>Custo por atendente</span>
          </div>
          <ul className="!mt-2 space-y-2">
            {p.turnos.map((turno) => {
              const erro = erros.turnos[turno.id];
              return (
                <li key={turno.id}>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_2rem] items-center gap-2">
                    <Selecao aria-label="Duração do turno" value={turno.duracaoMin} invalido={!!erro}
                      onChange={(e) => mudaTurno(turno.id, { duracaoMin: Number(e.target.value) })}>
                      {!duracoes.includes(turno.duracaoMin) && (
                        <option value={turno.duracaoMin}>{rotuloDuracao(turno.duracaoMin)} (inválido)</option>
                      )}
                      {duracoes.map((m) => <option key={m} value={m}>{rotuloDuracao(m)}</option>)}
                    </Selecao>
                    <EntradaComUnidade aria-label="Custo por atendente" prefixo="R$" type="number" min={0} step={0.01}
                      value={turno.custo} onChange={(e) => mudaTurno(turno.id, { custo: numero(e.target.value, 0, 1e7) })} />
                    <BotaoIcone icone={Trash2} rotulo="Remover turno" perigo disabled={p.turnos.length <= 1}
                      onClick={() => setParametros((atual) => ({
                        ...atual, turnos: atual.turnos.filter((t) => t.id !== turno.id),
                      }))} />
                  </div>
                  {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
                </li>
              );
            })}
          </ul>
          {p.turnos.length >= MAX_TURNOS && (
            <p className="text-xs text-slate-500">Limite de {MAX_TURNOS} tipos de turno.</p>
          )}
        </Secao>

        <Secao titulo="Atendimento">
          <div className="grid grid-cols-2 gap-3">
            <Campo id="espera" rotulo="Espera máxima" ajuda="Tempo que a ligação pode aguardar.">
              <EntradaComUnidade id="espera" type="number" min={0} max={1000} unidade="s" value={p.tempoMaximoEspera}
                onChange={(e) => atualiza({ tempoMaximoEspera: numero(e.target.value, 0, 1000) })} />
            </Campo>
            <Campo id="descanso" rotulo="Pausa entre ligações" ajuda="Descanso após cada atendimento.">
              <EntradaComUnidade id="descanso" type="number" min={0} max={1000} unidade="s" value={p.tempoDescanso}
                onChange={(e) => atualiza({ tempoDescanso: numero(e.target.value, 0, 1000) })} />
            </Campo>
          </div>
        </Secao>

        <details className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase [&::-webkit-details-marker]:hidden">
            Avançado
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-4">
            <Campo id="semente" rotulo="Semente da simulação"
              ajuda="A simulação sorteia os momentos das ligações. Use a mesma semente para repetir um resultado.">
              <Entrada id="semente" type="number" min={0} placeholder="Aleatória" className="tabular"
                value={p.semente ?? ""}
                onChange={(e) => atualiza({
                  semente: e.target.value === "" ? null : numero(e.target.value, 0, 2 ** 32 - 1),
                })} />
            </Campo>
          </div>
        </details>
      </div>

      {erros.geral.length > 0 && (
        <div className="px-5 pb-5">
          <Aviso tipo="erro">{erros.geral.join(" ")}</Aviso>
        </div>
      )}
    </Cartao>
  );
}

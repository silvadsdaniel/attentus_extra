import { useState } from "react";
import { CalendarClock, ChartColumn, CircleCheck, Coins, Download, Gauge, Target, UsersRound } from "lucide-react";
import { baixarArquivo } from "../../lib/api";
import type { Execucao } from "../../lib/estado-otimizacao";
import { formataDataHora, formataMoeda, formataNumero, formataPercentual } from "../../lib/formato";
import { aproveitamento, escalaParaCsv } from "../../lib/otimizacao";
import { GraficoCobertura, GraficoCustos } from "../Graficos";
import { Abas, Aviso, Botao, Cartao, cn, Etiqueta, Indicador } from "../ui";

type Aba = "cobertura" | "escala" | "custos";

const CELULA = "px-3 py-2 text-right tabular";

function Valor({ n }: { n: number }) {
  return n === 0 ? <span className="text-slate-300">–</span> : <>{formataNumero(n)}</>;
}

function TabelaEscala({ execucao }: { execucao: Execucao }) {
  const { resultado } = execucao;
  const [soComEntradas, setSoComEntradas] = useState(true);
  const rotulos = resultado.turnos.map((t) => t.rotulo);
  const periodos = soComEntradas
    ? resultado.periodos.filter((p) => rotulos.some((r) => (p.entradas[r] ?? 0) > 0))
    : resultado.periodos;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <p className="text-sm text-slate-500">Quantos atendentes começam a trabalhar em cada horário, por tipo de turno.</p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={soComEntradas} onChange={(e) => setSoComEntradas(e.target.checked)}
            className="size-4 rounded border-slate-300 accent-brand-600" />
          Só horários com entradas
        </label>
      </div>
      <div className="max-h-[28rem] overflow-auto border-t border-slate-100">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-2 text-left">Horário</th>
              {rotulos.map((r) => <th key={r} scope="col" className={CELULA}>Entram · {r}</th>)}
              <th scope="col" className={CELULA}>Escalados</th>
              <th scope="col" className={cn(CELULA, "pr-5")}>Necessários</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {periodos.map((p) => (
              <tr key={p.inicio} className="hover:bg-slate-50">
                <th scope="row" className="tabular px-5 py-2 text-left font-medium text-slate-900">
                  {p.inicio} <span className="font-normal text-slate-400">– {p.fim}</span>
                </th>
                {rotulos.map((r) => (
                  <td key={r} className={cn(CELULA, "font-medium text-brand-700")}><Valor n={p.entradas[r] ?? 0} /></td>
                ))}
                <td className={cn(CELULA, "text-slate-700")}>{formataNumero(p.escalados)}</td>
                <td className={cn(CELULA, "pr-5 text-slate-500")}>{formataNumero(p.necessarios)}</td>
              </tr>
            ))}
            {periodos.length === 0 && (
              <tr><td colSpan={rotulos.length + 3} className="px-5 py-8 text-center text-slate-500">Nenhuma entrada.</td></tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-white text-sm font-semibold text-slate-900 shadow-[0_-1px_0_var(--color-slate-200)]">
            <tr>
              <th scope="row" className="px-5 py-2 text-left">Total</th>
              {resultado.turnos.map((t) => <td key={t.rotulo} className={CELULA}>{formataNumero(t.atendentes)}</td>)}
              <td className={CELULA} />
              <td className={cn(CELULA, "pr-5")} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function TabelaCustos({ execucao }: { execucao: Execucao }) {
  const { resultado } = execucao;
  return (
    <div className="grid gap-6 p-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="text-xs font-medium text-slate-500">
            <tr className="border-b border-slate-200">
              <th scope="col" className="py-2 pr-3 text-left">Turno</th>
              <th scope="col" className={CELULA}>Atendentes</th>
              <th scope="col" className={CELULA}>Custo unitário</th>
              <th scope="col" className={CELULA}>Custo total</th>
              <th scope="col" className="py-2 pl-3 text-right">Participação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resultado.turnos.map((t) => {
              const parte = resultado.custo_total > 0 ? t.custo_total / resultado.custo_total : 0;
              return (
                <tr key={t.rotulo}>
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-slate-900">{t.rotulo}</th>
                  <td className={CELULA}>{formataNumero(t.atendentes)}</td>
                  <td className={cn(CELULA, "text-slate-500")}>{formataMoeda(t.custo)}</td>
                  <td className={cn(CELULA, "font-medium text-slate-900")}>{formataMoeda(t.custo_total)}</td>
                  <td className="py-2.5 pl-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${parte * 100}%` }} />
                      </div>
                      <span className="tabular w-10 text-right text-slate-600">{formataPercentual(parte)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 font-semibold text-slate-900">
            <tr>
              <th scope="row" className="py-2.5 pr-3 text-left">Total</th>
              <td className={CELULA}>{formataNumero(resultado.total_atendentes)}</td>
              <td className={CELULA} />
              <td className={CELULA}>{formataMoeda(resultado.custo_total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <GraficoCustos turnos={resultado.turnos} />
    </div>
  );
}

export function Resultados({ execucao, desatualizado }: { execucao: Execucao; desatualizado: boolean }) {
  const { resultado } = execucao;
  const [aba, setAba] = useState<Aba>("cobertura");
  const custoMedio = resultado.custo_total / Math.max(1, resultado.total_atendentes);

  return (
    <section aria-labelledby="titulo-resultado">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="titulo-resultado" className="text-lg font-semibold text-slate-900">Resultado</h2>
          <Etiqueta cor="verde" icone={CircleCheck}>Solução ótima</Etiqueta>
          <span className="text-sm text-slate-500">{formataDataHora(execucao.executadoEm)}</span>
        </div>
        <Botao variante="secundario" icone={Download}
          onClick={() => baixarArquivo(escalaParaCsv(resultado), "escala_attentus.csv")}>
          Baixar escala (CSV)
        </Botao>
      </div>

      <div className="space-y-3">
        {desatualizado && (
          <Aviso tipo="alerta" titulo="Este resultado está desatualizado">
            Os parâmetros ou arquivos mudaram desde a execução. Execute a otimização de novo para atualizar.
          </Aviso>
        )}
        {resultado.avisos.map((aviso) => <Aviso key={aviso} tipo="alerta">{aviso}</Aviso>)}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador icone={Coins} rotulo="Custo diário" valor={formataMoeda(resultado.custo_total)}
          detalhe={`${formataMoeda(custoMedio)} por atendente`} />
        <Indicador icone={UsersRound} rotulo="Atendentes escalados" valor={formataNumero(resultado.total_atendentes)}
          detalhe={resultado.turnos.map((t) => `${t.atendentes} × ${t.rotulo}`).join(" · ")} />
        <Indicador icone={Target} rotulo="Pico de demanda" valor={formataNumero(resultado.pico_necessarios)}
          detalhe="atendentes simultâneos necessários" />
        <Indicador icone={Gauge} rotulo="Aproveitamento" valor={formataPercentual(aproveitamento(resultado))}
          detalhe="da capacidade escalada é usada" />
      </div>

      <Cartao className="mt-6 overflow-hidden">
        <Abas<Aba> ativa={aba} aoMudar={setAba} abas={[
          { id: "cobertura", rotulo: "Cobertura do dia", icone: ChartColumn },
          { id: "escala", rotulo: "Escala de entrada", icone: CalendarClock },
          { id: "custos", rotulo: "Custos por turno", icone: Coins },
        ]} />
        {aba === "cobertura" && (
          <div className="p-4 sm:p-5">
            <GraficoCobertura periodos={resultado.periodos} altura={340} />
            <p className="mt-3 text-xs text-slate-500">
              <strong className="font-medium text-slate-600">Necessários</strong>: atendentes simultâneos que a simulação
              exige em cada período. <strong className="font-medium text-slate-600">Escalados</strong>: atendentes
              trabalhando no período segundo a escala ótima.
            </p>
          </div>
        )}
        {aba === "escala" && <TabelaEscala execucao={execucao} />}
        {aba === "custos" && <TabelaCustos execucao={execucao} />}
      </Cartao>
    </section>
  );
}

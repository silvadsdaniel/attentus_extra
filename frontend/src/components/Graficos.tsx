import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from "recharts";
import { formataMoeda, formataNumero, formataPercentual } from "../lib/formato";
import type { Periodo, ResultadoTurno } from "../lib/otimizacao";

const COR_NECESSARIOS = "#b9cdf3"; // brand-200
const COR_ESCALADOS = "#2b59c3"; // brand-600
const COR_EIXO = "#64748b"; // slate-500
const COR_GRADE = "#e2e8f0"; // slate-200

const eixo = { fontSize: 12, fill: COR_EIXO };

function CaixaDica({ titulo, linhas }: { titulo: string; linhas: [string, string, string?][] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{titulo}</p>
      {linhas.map(([rotulo, valor, cor]) => (
        <p key={rotulo} className="tabular flex items-center justify-between gap-6 text-slate-600">
          <span className="flex items-center gap-1.5">
            {cor && <span className="size-2 rounded-full" style={{ background: cor }} />}
            {rotulo}
          </span>
          <span className="font-medium text-slate-900">{valor}</span>
        </p>
      ))}
    </div>
  );
}

interface DicaProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}

/** Linha de dados sob o cursor do gráfico. */
function dadoDaDica<T>(props: DicaProps): T | undefined {
  return props.active ? (props.payload?.[0]?.payload as T | undefined) : undefined;
}

/** Atendentes necessários (simulação) x escalados (solução ótima) em cada período do dia. */
export function GraficoCobertura({ periodos, altura = 320, compacto }: {
  periodos: Periodo[]; altura?: number; compacto?: boolean;
}) {
  const passo = Math.max(0, Math.round(periodos.length / (compacto ? 6 : 12)) - 1);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={periodos} margin={{ top: 8, right: 8, bottom: 0, left: compacto ? -24 : -8 }}
        barCategoryGap={1}>
        <CartesianGrid vertical={false} stroke={COR_GRADE} />
        <XAxis dataKey="inicio" interval={passo} tick={eixo} tickLine={false} axisLine={{ stroke: COR_GRADE }} />
        <YAxis allowDecimals={false} tick={eixo} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgb(43 89 195 / 0.06)" }}
          content={(props: DicaProps) => {
            const p = dadoDaDica<Periodo>(props);
            if (!p) return null;
            return (
              <CaixaDica titulo={`${p.inicio} – ${p.fim}`} linhas={[
                ["Escalados", formataNumero(p.escalados), COR_ESCALADOS],
                ["Necessários", formataNumero(p.necessarios), COR_NECESSARIOS],
                ["Folga", formataNumero(p.escalados - p.necessarios)],
                ["Ligações", formataNumero(p.ligacoes)],
              ]} />
            );
          }} />
        {!compacto && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        <Bar dataKey="necessarios" name="Necessários (simulação)" fill={COR_NECESSARIOS} radius={[2, 2, 0, 0]}
          isAnimationActive={false} />
        <Line dataKey="escalados" name="Escalados (otimização)" type="stepAfter" stroke={COR_ESCALADOS}
          strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Pontos da distribuição de durações e a curva do polinômio ajustado. */
export function GraficoAjuste({ pontos, curva }: {
  pontos: { x: number; y: number }[]; curva: { x: number; y: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={COR_GRADE} />
        <XAxis type="number" dataKey="x" domain={[0, 1]} tickCount={6} tick={eixo} tickLine={false}
          axisLine={{ stroke: COR_GRADE }} tickFormatter={(v: number) => formataPercentual(v)} />
        <YAxis type="number" dataKey="y" tick={eixo} tickLine={false} axisLine={false}
          tickFormatter={(v: number) => `${formataNumero(v)} s`} />
        <Tooltip cursor={{ stroke: COR_GRADE }}
          content={(props: DicaProps) => {
            const p = dadoDaDica<{ x: number; y: number }>(props);
            if (!p) return null;
            return (
              <CaixaDica titulo={`${formataPercentual(p.x, 1)} das ligações`}
                linhas={[["Duram até", `${formataNumero(p.y, 1)} s`]]} />
            );
          }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        <Line data={curva} dataKey="y" name="Polinômio ajustado" type="monotone" stroke={COR_ESCALADOS}
          strokeWidth={2} dot={false} isAnimationActive={false} />
        <Scatter data={pontos} dataKey="y" name="Dados enviados" fill="#f59e0b" stroke="#b45309"
          isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Custo total de cada tipo de turno. */
export function GraficoCustos({ turnos }: { turnos: ResultadoTurno[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, turnos.length * 52)}>
      <BarChart data={turnos} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={COR_GRADE} />
        <XAxis type="number" tick={eixo} tickLine={false} axisLine={false}
          tickFormatter={(v: number) => formataMoeda(v).replace(/,\d\d$/, "")} />
        <YAxis type="category" dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} width={52} />
        <Tooltip cursor={{ fill: "rgb(43 89 195 / 0.06)" }}
          content={(props: DicaProps) => {
            const t = dadoDaDica<ResultadoTurno>(props);
            if (!t) return null;
            return (
              <CaixaDica titulo={`Turno de ${t.rotulo}`} linhas={[
                ["Atendentes", formataNumero(t.atendentes)],
                ["Custo total", formataMoeda(t.custo_total)],
              ]} />
            );
          }} />
        <Bar dataKey="custo_total" fill={COR_ESCALADOS} radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

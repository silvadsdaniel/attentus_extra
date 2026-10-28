import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, CalendarClock, Coins, FileSpreadsheet, Gauge, Play, SlidersHorizontal, Target, Users, UsersRound,
} from "lucide-react";
import { GraficoCobertura } from "../components/Graficos";
import { CabecalhoCartao, CabecalhoPagina, Cartao, EstadoVazio, estiloBotao, Indicador } from "../components/ui";
import { api } from "../lib/api";
import type { Usuario } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useOtimizacao } from "../lib/estado-otimizacao";
import { formataDataHora, formataMoeda, formataNumero, formataPercentual, primeiroNome } from "../lib/formato";
import { aproveitamento } from "../lib/otimizacao";

const PASSOS = [
  {
    icone: SlidersHorizontal, titulo: "Configure a operação",
    texto: "Defina o horário de funcionamento, o intervalo de análise e os tipos de turno com seus custos.",
  },
  {
    icone: FileSpreadsheet, titulo: "Envie os dados",
    texto: "Carregue a distribuição de duração das ligações e o volume médio de ligações por período.",
  },
  {
    icone: CalendarClock, titulo: "Receba a escala",
    texto: "O Attentus simula a demanda e calcula quantos atendentes devem entrar em cada horário.",
  },
];

export default function Painel() {
  const { usuario } = useAuth();
  const { execucao } = useOtimizacao();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const admin = usuario?.role === "admin";

  useEffect(() => {
    if (admin) api<Usuario[]>("/usuarios").then(setUsuarios).catch(() => setUsuarios(null));
  }, [admin]);

  const hoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const resultado = execucao?.resultado;

  return (
    <>
      <CabecalhoPagina
        titulo={`Olá, ${primeiroNome(usuario?.full_name ?? "")}`}
        descricao={<span className="first-letter:uppercase">{hoje}</span>}
        acoes={
          <Link to="/otimizacao" className={estiloBotao()}>
            <Play className="size-4" aria-hidden />
            {resultado ? "Nova otimização" : "Começar otimização"}
          </Link>
        }
      />

      {resultado && execucao ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador icone={Coins} rotulo="Custo diário ótimo" valor={formataMoeda(resultado.custo_total)}
              detalhe={`${formataMoeda(resultado.custo_total / Math.max(1, resultado.total_atendentes))} por atendente`} />
            <Indicador icone={UsersRound} rotulo="Atendentes escalados" valor={formataNumero(resultado.total_atendentes)}
              detalhe={`em ${resultado.turnos.filter((t) => t.atendentes > 0).length} tipo(s) de turno`} />
            <Indicador icone={Target} rotulo="Pico de demanda" valor={formataNumero(resultado.pico_necessarios)}
              detalhe="atendentes simultâneos necessários" />
            <Indicador icone={Gauge} rotulo="Aproveitamento da escala"
              valor={formataPercentual(aproveitamento(resultado))}
              detalhe="da capacidade escalada é usada pela demanda" />
          </div>

          <Cartao className="mt-6">
            <CabecalhoCartao titulo="Cobertura ao longo do dia"
              descricao={`Última otimização em ${formataDataHora(execucao.executadoEm)} · ${execucao.arquivos.volume}`}
              acoes={
                <Link to="/otimizacao" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                  Ver detalhes <ArrowRight className="size-4" aria-hidden />
                </Link>
              } />
            <div className="p-4 sm:p-5">
              <GraficoCobertura periodos={resultado.periodos} altura={240} />
            </div>
          </Cartao>
        </>
      ) : (
        <Cartao>
          <EstadoVazio icone={SlidersHorizontal} titulo="Nenhuma otimização nesta sessão"
            descricao="Configure os turnos e envie os dados de ligações para ver aqui o custo, a equipe necessária e a cobertura do dia."
            acao={
              <Link to="/otimizacao" className={estiloBotao()}>
                <Play className="size-4" aria-hidden /> Começar otimização
              </Link>
            } />
        </Cartao>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className={admin ? "xl:col-span-2" : "xl:col-span-3"}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Como funciona</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo}>
                <Cartao className="h-full p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icone className="size-4" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-slate-400">Passo {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{titulo}</h3>
                  <p className="mt-1 text-sm text-slate-500">{texto}</p>
                </Cartao>
              </li>
            ))}
          </ol>
        </section>

        {admin && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Equipe do sistema</h2>
            <Cartao className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Users className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="tabular text-2xl font-semibold text-slate-900">
                    {usuarios ? formataNumero(usuarios.filter((u) => u.is_active).length) : "—"}
                  </p>
                  <p className="text-sm text-slate-500">usuários ativos</p>
                </div>
              </div>
              <dl className="tabular mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <dt className="text-slate-500">Administradores</dt>
                  <dd className="font-medium text-slate-900">
                    {usuarios ? usuarios.filter((u) => u.role === "admin").length : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Inativos</dt>
                  <dd className="font-medium text-slate-900">
                    {usuarios ? usuarios.filter((u) => !u.is_active).length : "—"}
                  </dd>
                </div>
              </dl>
              <Link to="/usuarios" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                Gerenciar usuários <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Cartao>
          </section>
        )}
      </div>
    </>
  );
}

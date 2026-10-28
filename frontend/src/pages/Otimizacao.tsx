import { useState } from "react";
import { Check, Circle, LoaderCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { CartaoAjuste, CartaoDados } from "../components/otimizacao/Dados";
import { CartaoParametros } from "../components/otimizacao/Parametros";
import { Resultados } from "../components/otimizacao/Resultados";
import { Aviso, Botao, CabecalhoPagina, Cartao, cn } from "../components/ui";
import { mensagemDeErro } from "../lib/api";
import { useOtimizacao } from "../lib/estado-otimizacao";
import { formataMoeda } from "../lib/formato";
import { numeroPeriodos, paraApi, validaParametros } from "../lib/otimizacao";

function ItemChecklist({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className={cn("flex items-center gap-2 text-sm", ok ? "text-slate-700" : "text-slate-400")}>
      {ok ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <Circle className="size-4" aria-hidden />
      )}
      {children}
    </li>
  );
}

export default function Otimizacao() {
  const { parametros, arquivos, execucao, executando, executar, assinaturaAtual } = useOtimizacao();
  const [erro, setErro] = useState<string | null>(null);

  const erros = validaParametros(parametros);
  const parametrosOk = erros.geral.length === 0 && Object.keys(erros.turnos).length === 0;
  const duracoesOk = !!arquivos.duracoes?.resumo;
  const volumeOk = !!arquivos.volume?.resumo && arquivos.volume.resumo.linhas === numeroPeriodos(parametros);
  const pronto = parametrosOk && duracoesOk && volumeOk;

  // Depois de recarregar a página os arquivos não estão mais em memória; nesse caso só
  // mudanças nos parâmetros deixam o resultado desatualizado.
  const semArquivos = !arquivos.duracoes && !arquivos.volume;
  const desatualizado = !!execucao && (semArquivos
    ? JSON.stringify(paraApi(parametros)) !== JSON.stringify(paraApi(execucao.parametros))
    : execucao.assinatura !== assinaturaAtual);

  async function rodar() {
    setErro(null);
    try {
      const nova = await executar();
      toast.success(`Escala ótima encontrada: ${formataMoeda(nova.resultado.custo_total)} por dia.`);
      requestAnimationFrame(() =>
        document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  return (
    <>
      <CabecalhoPagina titulo="Otimização"
        descricao="Configure a operação, envie os dados de ligações e encontre a escala de menor custo." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <CartaoParametros />

        <div className="min-w-0 space-y-6">
          <CartaoDados />
          <CartaoAjuste />

          <Cartao className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                <ItemChecklist ok={parametrosOk}>Parâmetros válidos</ItemChecklist>
                <ItemChecklist ok={duracoesOk}>Durações carregadas</ItemChecklist>
                <ItemChecklist ok={volumeOk}>Volume compatível</ItemChecklist>
              </ul>
              <Botao tamanho="lg" icone={Play} carregando={executando} disabled={!pronto} onClick={rodar}
                className="w-full sm:w-auto">
                {executando ? "Otimizando…" : "Executar otimização"}
              </Botao>
            </div>
            {executando && (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="size-4 animate-spin text-brand-600" aria-hidden />
                Simulando a demanda e resolvendo o modelo. Isso pode levar alguns segundos.
              </p>
            )}
            {erro && <Aviso tipo="erro" className="mt-4">{erro}</Aviso>}
          </Cartao>
        </div>
      </div>

      {execucao && (
        <div id="resultados" className="mt-10 scroll-mt-20 border-t border-slate-200 pt-8 lg:scroll-mt-6">
          <Resultados execucao={execucao} desatualizado={desatualizado} />
        </div>
      )}
    </>
  );
}

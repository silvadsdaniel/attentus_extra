import { useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import {
  ChartLine, CircleAlert, CircleCheck, Download, FileSpreadsheet, FlaskConical, LoaderCircle, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { api, baixarArquivo, mensagemDeErro } from "../../lib/api";
import { useOtimizacao } from "../../lib/estado-otimizacao";
import { formataNumero } from "../../lib/formato";
import { numeroPeriodos } from "../../lib/otimizacao";
import type { TipoArquivo } from "../../lib/otimizacao";
import { GraficoAjuste } from "../Graficos";
import { Aviso, Botao, BotaoIcone, CabecalhoCartao, Cartao, cn, Etiqueta, Selecao } from "../ui";

const ACEITOS = ".csv,.xlsx,.xls";

function ZonaArquivo({
  tipo, titulo, colunas, extra, aviso, resumo,
}: {
  tipo: TipoArquivo; titulo: string; colunas: string[]; extra?: ReactNode; aviso?: string;
  resumo: (dados: Record<string, number>, linhas: number) => string[];
}) {
  const { arquivos, carregarArquivo, removerArquivo } = useOtimizacao();
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const atual = arquivos[tipo];

  function escolher(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (arquivo) void carregarArquivo(tipo, arquivo);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastando(false);
    escolher(e.dataTransfer.files);
  }

  const seletor = (
    <input ref={entrada} type="file" accept={ACEITOS} className="sr-only" tabIndex={-1}
      onChange={(e) => {
        escolher(e.target.files);
        e.target.value = "";
      }} />
  );

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium whitespace-nowrap text-slate-700">{titulo}</h3>
        {extra}
      </div>
      {seletor}

      {!atual ? (
        <button type="button" onClick={() => entrada.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)} onDrop={soltar}
          className={cn(
            "flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
            arrastando ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50",
          )}>
          <Upload className="size-6 text-slate-400" aria-hidden />
          <span className="mt-2 text-sm font-medium text-slate-700">
            Arraste o arquivo ou <span className="text-brand-600">clique para escolher</span>
          </span>
          <span className="mt-1 text-xs text-slate-500">CSV ou XLSX com as colunas</span>
          <span className="mt-1 flex flex-wrap justify-center gap-1">
            {colunas.map((c) => <code key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{c}</code>)}
          </span>
        </button>
      ) : (
        <div onDragOver={(e) => e.preventDefault()} onDrop={soltar}
          className={cn(
            "flex flex-1 flex-col rounded-lg border px-4 py-3",
            atual.erro ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-slate-50/60",
          )}>
          <div className="flex items-start gap-3">
            {atual.validando ? (
              <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-brand-600" aria-hidden />
            ) : atual.erro ? (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
                <FileSpreadsheet className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{atual.arquivo.name}</span>
              </p>
              {atual.validando && <p className="mt-1 text-xs text-slate-500">Validando…</p>}
              {atual.erro && <p className="mt-1 text-xs text-red-700">{atual.erro}</p>}
              {atual.resumo && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resumo(atual.resumo.resumo, atual.resumo.linhas).map((texto) => (
                    <Etiqueta key={texto}>{texto}</Etiqueta>
                  ))}
                </div>
              )}
            </div>
            <BotaoIcone icone={X} rotulo="Remover arquivo" onClick={() => removerArquivo(tipo)} className="-mt-1 -mr-2" />
          </div>
          {aviso && !atual.erro && <p className="mt-3 text-xs text-amber-800">{aviso}</p>}
          <button type="button" onClick={() => entrada.current?.click()}
            className="mt-3 self-start text-xs font-medium text-brand-600 hover:text-brand-700">
            Trocar arquivo
          </button>
        </div>
      )}
    </div>
  );
}

export function CartaoDados() {
  const { parametros, arquivos, carregarExemplo } = useOtimizacao();
  const [baixando, setBaixando] = useState(false);
  const [carregandoExemplo, setCarregandoExemplo] = useState(false);
  const periodos = numeroPeriodos(parametros);
  const linhasVolume = arquivos.volume?.resumo?.linhas;

  async function baixarModelo() {
    setBaixando(true);
    try {
      const busca = new URLSearchParams({
        horas_total: String(parametros.horasTotal),
        hora_inicial: String(parametros.horaInicial),
        minuto_inicial: String(parametros.minutoInicial),
        intervalo: String(parametros.intervalo),
      });
      baixarArquivo(await api<Blob>(`/otimizacao/modelo-planilha?${busca}`), "modelo_volume_chamadas.csv");
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    } finally {
      setBaixando(false);
    }
  }

  async function usarExemplo() {
    setCarregandoExemplo(true);
    try {
      await Promise.all([carregarExemplo("duracoes"), carregarExemplo("volume")]);
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    } finally {
      setCarregandoExemplo(false);
    }
  }

  return (
    <Cartao>
      <CabecalhoCartao icone={FileSpreadsheet} titulo="Dados de ligações"
        descricao="Histórico da central que alimenta a simulação."
        acoes={
          <Botao variante="secundario" tamanho="sm" icone={FlaskConical} carregando={carregandoExemplo}
            onClick={usarExemplo}>
            Usar dados de exemplo
          </Botao>
        } />
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <ZonaArquivo tipo="duracoes" titulo="Duração das ligações"
          colunas={["percentagem_acumulada", "duracao_conexao"]}
          resumo={(r, linhas) => [`${linhas} faixas`, `até ${formataNumero(r.maior_duracao)} s`]} />
        <ZonaArquivo tipo="volume" titulo="Volume de ligações"
          colunas={["hora_inicio", "numero_medio_ligantes"]}
          resumo={(r, linhas) => [
            `${linhas} períodos`, `${formataNumero(r.total_ligacoes)} ligações`, `pico de ${formataNumero(r.pico_ligacoes)}`,
          ]}
          aviso={linhasVolume !== undefined && linhasVolume !== periodos
            ? `O arquivo tem ${linhasVolume} linhas, mas a configuração atual gera ${periodos} períodos. Ajuste a janela e o intervalo ou baixe a planilha-modelo.`
            : undefined}
          extra={
            <button type="button" onClick={baixarModelo} disabled={baixando}
              className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-brand-600 hover:text-brand-700 disabled:opacity-50">
              {baixando ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Download className="size-3.5" aria-hidden />}
              Planilha-modelo
            </button>
          } />
      </div>
    </Cartao>
  );
}

interface Ajuste {
  pontos: { x: number; y: number }[];
  curva: { x: number; y: number }[];
  r2: number;
}

export function CartaoAjuste() {
  const { parametros, setParametros, arquivos } = useOtimizacao();
  const duracoes = arquivos.duracoes;
  const pronto = duracoes?.resumo ? duracoes.arquivo : null;
  const [ajuste, setAjuste] = useState<Ajuste | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!pronto) {
      setAjuste(null);
      setErro(null);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const form = new FormData();
    form.append("grau", String(parametros.grau));
    form.append("duracoes", pronto);
    api<Ajuste>("/otimizacao/ajuste", { method: "POST", form })
      .then((dados) => {
        if (!ativo) return;
        setAjuste(dados);
        setErro(null);
      })
      .catch((falha) => ativo && setErro(mensagemDeErro(falha)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [pronto, parametros.grau]);

  const corR2 = !ajuste ? "cinza" : ajuste.r2 >= 0.95 ? "verde" : ajuste.r2 >= 0.8 ? "ambar" : "vermelho";

  return (
    <Cartao>
      <CabecalhoCartao icone={ChartLine} titulo="Curva de duração"
        descricao="Polinômio usado para sortear a duração de cada ligação simulada."
        acoes={
          <div className="flex items-center gap-2">
            {ajuste && <Etiqueta cor={corR2}>R² {ajuste.r2.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</Etiqueta>}
            <label htmlFor="grau" className="text-xs text-slate-500">Grau</label>
            <Selecao id="grau" value={parametros.grau} className="h-8 w-16"
              onChange={(e) => setParametros((atual) => ({ ...atual, grau: Number(e.target.value) }))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}
            </Selecao>
          </div>
        } />
      <div className={cn("relative p-5", carregando && ajuste && "opacity-60")}>
        {!pronto ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Envie o arquivo de duração das ligações para conferir o ajuste.
          </p>
        ) : erro ? (
          <Aviso tipo="erro">{erro}</Aviso>
        ) : ajuste ? (
          <GraficoAjuste pontos={ajuste.pontos} curva={ajuste.curva} />
        ) : (
          <div className="flex h-[260px] items-center justify-center">
            <LoaderCircle className="size-5 animate-spin text-brand-600" aria-hidden />
          </div>
        )}
      </div>
    </Cartao>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import { PARAMETROS_PADRAO, paraApi } from "./otimizacao";
import type { Parametros, Resultado, ResumoArquivo, TipoArquivo } from "./otimizacao";

// Estado da tela de otimização compartilhado entre páginas: os parâmetros ficam salvos no
// navegador, os arquivos ficam em memória e a última execução vale até fechar a aba
// (o painel mostra o resumo dela).

const CHAVE_PARAMETROS = "attentus.parametros";
const CHAVE_EXECUCAO = "attentus.execucao";

export interface ArquivoCarregado {
  arquivo: File;
  validando: boolean;
  resumo?: ResumoArquivo;
  erro?: string;
}

export interface Execucao {
  resultado: Resultado;
  assinatura: string;
  executadoEm: string;
  parametros: Parametros;
  arquivos: Record<TipoArquivo, string>;
}

interface EstadoOtimizacao {
  parametros: Parametros;
  setParametros: (atualiza: (atual: Parametros) => Parametros) => void;
  restaurarPadrao: () => void;
  arquivos: Partial<Record<TipoArquivo, ArquivoCarregado>>;
  carregarArquivo: (tipo: TipoArquivo, arquivo: File) => Promise<void>;
  carregarExemplo: (tipo: TipoArquivo) => Promise<void>;
  removerArquivo: (tipo: TipoArquivo) => void;
  execucao: Execucao | null;
  executando: boolean;
  executar: () => Promise<Execucao>;
  assinaturaAtual: string;
}

const Contexto = createContext<EstadoOtimizacao | null>(null);

function lerJson<T>(armazenamento: () => Storage, chave: string): T | null {
  try {
    const texto = armazenamento().getItem(chave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function gravarJson(armazenamento: () => Storage, chave: string, valor: unknown) {
  try {
    armazenamento().setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: o estado vale só nesta página
  }
}

function assinatura(parametros: Parametros, arquivos: Partial<Record<TipoArquivo, ArquivoCarregado>>) {
  const arquivo = (tipo: TipoArquivo) => {
    const a = arquivos[tipo]?.arquivo;
    return a ? `${a.name}:${a.size}:${a.lastModified}` : "";
  };
  return JSON.stringify([paraApi(parametros), arquivo("duracoes"), arquivo("volume")]);
}

export function OtimizacaoProvider({ children }: { children: ReactNode }) {
  const [parametros, setParametrosEstado] = useState<Parametros>(
    () => ({ ...PARAMETROS_PADRAO, ...lerJson<Parametros>(() => localStorage, CHAVE_PARAMETROS) }),
  );
  const [arquivos, setArquivos] = useState<Partial<Record<TipoArquivo, ArquivoCarregado>>>({});
  const [execucao, setExecucao] = useState<Execucao | null>(
    () => lerJson<Execucao>(() => sessionStorage, CHAVE_EXECUCAO),
  );
  const [executando, setExecutando] = useState(false);
  const arquivosRef = useRef(arquivos);
  arquivosRef.current = arquivos;

  useEffect(() => gravarJson(() => localStorage, CHAVE_PARAMETROS, parametros), [parametros]);

  const setParametros = useCallback((atualiza: (atual: Parametros) => Parametros) => {
    setParametrosEstado(atualiza);
  }, []);

  const restaurarPadrao = useCallback(() => setParametrosEstado(PARAMETROS_PADRAO), []);

  const carregarArquivo = useCallback(async (tipo: TipoArquivo, arquivo: File) => {
    setArquivos((atual) => ({ ...atual, [tipo]: { arquivo, validando: true } }));
    const form = new FormData();
    form.append("tipo", tipo);
    form.append("arquivo", arquivo);
    let carregado: ArquivoCarregado;
    try {
      const resumo = await api<ResumoArquivo>("/otimizacao/arquivos", { method: "POST", form });
      carregado = { arquivo, validando: false, resumo };
    } catch (erro) {
      carregado = { arquivo, validando: false, erro: (erro as Error).message };
    }
    // ignora a resposta se outro arquivo foi escolhido enquanto este era validado
    setArquivos((atual) => (atual[tipo]?.arquivo === arquivo ? { ...atual, [tipo]: carregado } : atual));
  }, []);

  const carregarExemplo = useCallback(
    async (tipo: TipoArquivo) => {
      const conteudo = await api<Blob>(`/otimizacao/exemplo/${tipo}`);
      const nome = tipo === "duracoes" ? "exemplo_duracoes.xlsx" : "exemplo_volume.xlsx";
      await carregarArquivo(tipo, new File([conteudo], nome, { lastModified: 0 }));
    },
    [carregarArquivo],
  );

  const removerArquivo = useCallback((tipo: TipoArquivo) => {
    setArquivos(({ [tipo]: _, ...resto }) => resto);
  }, []);

  const executar = useCallback(async () => {
    const { duracoes, volume } = arquivosRef.current;
    if (!duracoes || !volume) throw new Error("Envie os dois arquivos antes de executar.");
    const form = new FormData();
    form.append("parametros", JSON.stringify(paraApi(parametros)));
    form.append("duracoes", duracoes.arquivo);
    form.append("volume", volume.arquivo);

    setExecutando(true);
    try {
      const resultado = await api<Resultado>("/otimizacao/executar", { method: "POST", form });
      const nova: Execucao = {
        resultado,
        assinatura: assinatura(parametros, arquivosRef.current),
        executadoEm: new Date().toISOString(),
        parametros,
        arquivos: { duracoes: duracoes.arquivo.name, volume: volume.arquivo.name },
      };
      setExecucao(nova);
      gravarJson(() => sessionStorage, CHAVE_EXECUCAO, nova);
      return nova;
    } finally {
      setExecutando(false);
    }
  }, [parametros]);

  const assinaturaAtual = useMemo(() => assinatura(parametros, arquivos), [parametros, arquivos]);

  const valor = useMemo(
    () => ({
      parametros, setParametros, restaurarPadrao, arquivos, carregarArquivo, carregarExemplo,
      removerArquivo, execucao, executando, executar, assinaturaAtual,
    }),
    [parametros, setParametros, restaurarPadrao, arquivos, carregarArquivo, carregarExemplo,
      removerArquivo, execucao, executando, executar, assinaturaAtual],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useOtimizacao() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useOtimizacao precisa estar dentro de <OtimizacaoProvider>");
  return contexto;
}

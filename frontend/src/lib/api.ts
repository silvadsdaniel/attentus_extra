// Cliente da API FastAPI (/api). Guarda o token de acesso e traduz erros em mensagens.

const CHAVE_TOKEN = "attentus.token";
export const EVENTO_SESSAO_EXPIRADA = "attentus:sessao-expirada";

export type Funcao = "admin" | "user";

export interface Usuario {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Funcao;
  is_active: boolean;
  created_at?: string;
  last_login?: string | null;
}

export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // sem armazenamento (ex.: janela privada): a sessão dura até recarregar a página
  }
}

type Opcoes = Omit<RequestInit, "body"> & { json?: unknown; form?: FormData };

export async function api<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { json, form, ...resto } = opcoes;
  const headers = new Headers(resto.headers);
  const token = lerToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined = form;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, { ...resto, headers, body });
  } catch {
    throw new ErroApi(0, "Não foi possível conectar ao servidor. Verifique se a API está rodando.");
  }

  if (resposta.status === 401 && token) {
    salvarToken(null);
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  }

  if (!resposta.ok) {
    let mensagem = "Algo deu errado. Tente novamente.";
    try {
      const dados = await resposta.json();
      if (typeof dados.detail === "string") mensagem = dados.detail;
    } catch {
      // resposta sem JSON: fica a mensagem genérica
    }
    throw new ErroApi(resposta.status, mensagem);
  }

  if (resposta.status === 204) return undefined as T;
  const tipo = resposta.headers.get("content-type") ?? "";
  return (tipo.includes("application/json") ? resposta.json() : resposta.blob()) as Promise<T>;
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Algo deu errado. Tente novamente.";
}

/** Dispara o download de um arquivo gerado no navegador. */
export function baixarArquivo(conteudo: Blob, nome: string) {
  const url = URL.createObjectURL(conteudo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

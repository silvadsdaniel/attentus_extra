import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Power, PowerOff, Search, ShieldCheck, ShieldMinus, Trash2, User, UserPlus, Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Aviso, Botao, BotaoIcone, CabecalhoPagina, Campo, Cartao, Carregando, cn, Entrada, EstadoVazio, Etiqueta, Modal,
  Selecao,
} from "../components/ui";
import { api, mensagemDeErro } from "../lib/api";
import type { Funcao, Usuario } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formataDataHora, iniciais } from "../lib/formato";
import { validaNovoUsuario } from "./Cadastro";
import type { DadosNovoUsuario } from "./Cadastro";

type Filtro = "todos" | "admin" | "user" | "inativos";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "admin", rotulo: "Administradores" },
  { id: "user", rotulo: "Usuários" },
  { id: "inativos", rotulo: "Inativos" },
];

function Avatar({ nome, inativo }: { nome: string; inativo?: boolean }) {
  return (
    <span className={cn(
      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
      inativo ? "bg-slate-100 text-slate-400" : "bg-brand-100 text-brand-700",
    )}>
      {iniciais(nome)}
    </span>
  );
}

function EtiquetaFuncao({ role }: { role: Funcao }) {
  return role === "admin"
    ? <Etiqueta cor="marca" icone={ShieldCheck}>Administrador</Etiqueta>
    : <Etiqueta cor="cinza" icone={User}>Usuário</Etiqueta>;
}

function EtiquetaStatus({ ativo }: { ativo: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", ativo ? "text-emerald-700" : "text-slate-500")}>
      <span className={cn("size-1.5 rounded-full", ativo ? "bg-emerald-500" : "bg-slate-300")} />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

const NOVO_USUARIO_VAZIO: DadosNovoUsuario & { role: Funcao } = {
  full_name: "", username: "", email: "", password: "", role: "user",
};

function ModalNovoUsuario({ aberto, aoFechar, aoCriar }: {
  aberto: boolean; aoFechar: () => void; aoCriar: () => void;
}) {
  const [dados, setDados] = useState(NOVO_USUARIO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setDados(NOVO_USUARIO_VAZIO);
      setErro(null);
    }
  }, [aberto]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const problema = validaNovoUsuario(dados);
    if (problema) {
      setErro(problema);
      return;
    }
    setEnviando(true);
    try {
      await api("/usuarios", { method: "POST", json: dados });
      toast.success(`${dados.full_name.trim()} foi adicionado(a).`);
      aoCriar();
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  const muda = (campo: keyof typeof dados, valor: string) => setDados((atual) => ({ ...atual, [campo]: valor }));

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Novo usuário"
      descricao="A pessoa poderá entrar com o usuário e a senha definidos aqui."
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" form="form-novo-usuario" icone={UserPlus} carregando={enviando}>Adicionar</Botao>
        </>
      }>
      <form id="form-novo-usuario" onSubmit={enviar} noValidate className="space-y-4">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo id="nu-nome" rotulo="Nome completo">
          <Entrada id="nu-nome" value={dados.full_name} autoFocus onChange={(e) => muda("full_name", e.target.value)} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nu-usuario" rotulo="Nome de usuário">
            <Entrada id="nu-usuario" value={dados.username} autoComplete="off"
              onChange={(e) => muda("username", e.target.value)} />
          </Campo>
          <Campo id="nu-funcao" rotulo="Função">
            <Selecao id="nu-funcao" value={dados.role} onChange={(e) => muda("role", e.target.value)}>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </Selecao>
          </Campo>
        </div>
        <Campo id="nu-email" rotulo="Email">
          <Entrada id="nu-email" type="email" value={dados.email} onChange={(e) => muda("email", e.target.value)} />
        </Campo>
        <Campo id="nu-senha" rotulo="Senha inicial" ajuda="Mínimo de 6 caracteres.">
          <Entrada id="nu-senha" type="password" value={dados.password} autoComplete="new-password"
            onChange={(e) => muda("password", e.target.value)} />
        </Campo>
      </form>
    </Modal>
  );
}

export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [novoAberto, setNovoAberto] = useState(false);
  const [excluindo, setExcluindo] = useState<Usuario | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const carregar = useCallback(() => {
    api<Usuario[]>("/usuarios")
      .then((lista) => {
        setUsuarios(lista);
        setErro(null);
      })
      .catch((falha) => setErro(mensagemDeErro(falha)));
  }, []);

  useEffect(carregar, [carregar]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios ?? []).filter((u) => {
      if (filtro === "admin" && u.role !== "admin") return false;
      if (filtro === "user" && u.role !== "user") return false;
      if (filtro === "inativos" && u.is_active) return false;
      return !termo || [u.full_name, u.username, u.email].some((v) => v.toLowerCase().includes(termo));
    });
  }, [usuarios, busca, filtro]);

  async function atualizar(u: Usuario, mudanca: Partial<Pick<Usuario, "role" | "is_active">>, mensagem: string) {
    setOcupado(u.id);
    try {
      const atualizado = await api<Usuario>(`/usuarios/${u.id}`, { method: "PATCH", json: mudanca });
      setUsuarios((lista) => lista?.map((x) => (x.id === u.id ? atualizado : x)) ?? null);
      toast.success(mensagem);
    } catch (falha) {
      toast.error(mensagemDeErro(falha));
    } finally {
      setOcupado(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    setOcupado(alvo.id);
    try {
      await api(`/usuarios/${alvo.id}`, { method: "DELETE" });
      setUsuarios((lista) => lista?.filter((x) => x.id !== alvo.id) ?? null);
      toast.success(`${alvo.full_name} foi excluído(a).`);
      setExcluindo(null);
    } catch (falha) {
      toast.error(mensagemDeErro(falha));
    } finally {
      setOcupado(null);
    }
  }

  const contagem = {
    total: usuarios?.length ?? 0,
    ativos: usuarios?.filter((u) => u.is_active).length ?? 0,
    admins: usuarios?.filter((u) => u.role === "admin").length ?? 0,
  };

  function acoes(u: Usuario) {
    if (u.id === eu?.id) return <Etiqueta cor="marca">Você</Etiqueta>;
    const desabilitado = ocupado === u.id;
    return (
      <div className="flex justify-end gap-1">
        {u.role === "admin" ? (
          <BotaoIcone icone={ShieldMinus} rotulo="Tornar usuário comum" disabled={desabilitado}
            onClick={() => atualizar(u, { role: "user" }, `${u.full_name} agora é usuário comum.`)} />
        ) : (
          <BotaoIcone icone={ShieldCheck} rotulo="Tornar administrador" disabled={desabilitado}
            onClick={() => atualizar(u, { role: "admin" }, `${u.full_name} agora é administrador(a).`)} />
        )}
        {u.is_active ? (
          <BotaoIcone icone={PowerOff} rotulo="Desativar acesso" disabled={desabilitado}
            onClick={() => atualizar(u, { is_active: false }, `Acesso de ${u.full_name} desativado.`)} />
        ) : (
          <BotaoIcone icone={Power} rotulo="Reativar acesso" disabled={desabilitado}
            onClick={() => atualizar(u, { is_active: true }, `Acesso de ${u.full_name} reativado.`)} />
        )}
        <BotaoIcone icone={Trash2} rotulo="Excluir usuário" perigo disabled={desabilitado}
          onClick={() => setExcluindo(u)} />
      </div>
    );
  }

  return (
    <>
      <CabecalhoPagina titulo="Usuários" descricao="Quem acessa o Attentus e com qual permissão."
        acoes={<Botao icone={UserPlus} onClick={() => setNovoAberto(true)}>Novo usuário</Botao>} />

      <dl className="mb-6 grid grid-cols-3 gap-4">
        {[
          ["Total", contagem.total],
          ["Ativos", contagem.ativos],
          ["Administradores", contagem.admins],
        ].map(([rotulo, valor]) => (
          <Cartao key={rotulo} className="px-5 py-4">
            <dt className="text-sm text-slate-500">{rotulo}</dt>
            <dd className="tabular mt-1 text-2xl font-semibold text-slate-900">{usuarios ? valor : "—"}</dd>
          </Cartao>
        ))}
      </dl>

      <Cartao>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Entrada type="search" aria-label="Buscar usuários" placeholder="Buscar por nome, usuário ou email"
              value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
          <div role="group" aria-label="Filtrar usuários" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {FILTROS.map(({ id, rotulo }) => (
              <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filtro === id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900",
                )}>
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {erro ? (
          <div className="p-5"><Aviso tipo="erro">{erro}</Aviso></div>
        ) : !usuarios ? (
          <Carregando texto="Carregando usuários…" />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone={Users} titulo="Nenhum usuário encontrado"
            descricao={busca || filtro !== "todos" ? "Tente outra busca ou filtro." : "Adicione a primeira pessoa da equipe."} />
        ) : (
          <>
            {/* Tabela em telas médias e grandes */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 text-left">Nome</th>
                    <th scope="col" className="px-3 py-2.5 text-left">Função</th>
                    <th scope="col" className="px-3 py-2.5 text-left">Status</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-left xl:table-cell">Último acesso</th>
                    <th scope="col" className="hidden px-3 py-2.5 text-left 2xl:table-cell">Criado em</th>
                    <th scope="col" className="px-5 py-2.5 text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiveis.map((u) => (
                    <tr key={u.id} className={cn("hover:bg-slate-50", !u.is_active && "text-slate-500")}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nome={u.full_name} inativo={!u.is_active} />
                          <div className="max-w-[18rem] min-w-0">
                            <p className={cn("truncate font-medium", u.is_active ? "text-slate-900" : "text-slate-500")}>
                              {u.full_name}
                            </p>
                            <p className="truncate text-xs text-slate-500">@{u.username} · {u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><EtiquetaFuncao role={u.role} /></td>
                      <td className="px-3 py-3"><EtiquetaStatus ativo={u.is_active} /></td>
                      <td className="tabular hidden px-3 py-3 whitespace-nowrap text-slate-600 xl:table-cell">
                        {u.last_login ? formataDataHora(u.last_login) : <span className="text-slate-400">Nunca</span>}
                      </td>
                      <td className="tabular hidden px-3 py-3 whitespace-nowrap text-slate-600 2xl:table-cell">{formataDataHora(u.created_at)}</td>
                      <td className="px-5 py-3 text-right">{acoes(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lista em cartões no celular */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visiveis.map((u) => (
                <li key={u.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar nome={u.full_name} inativo={!u.is_active} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{u.full_name}</p>
                      <p className="truncate text-xs text-slate-500">@{u.username} · {u.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <EtiquetaFuncao role={u.role} />
                        <EtiquetaStatus ativo={u.is_active} />
                      </div>
                    </div>
                    {acoes(u)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Cartao>

      <ModalNovoUsuario aberto={novoAberto} aoFechar={() => setNovoAberto(false)} aoCriar={carregar} />

      <Modal aberto={!!excluindo} aoFechar={() => setExcluindo(null)} titulo="Excluir usuário?"
        descricao={excluindo && (
          <>
            <strong className="font-medium text-slate-700">{excluindo.full_name}</strong> perderá o acesso e o
            histórico de sessões será apagado. Esta ação não pode ser desfeita. Se quiser apenas bloquear o
            acesso, desative a conta.
          </>
        )}
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setExcluindo(null)}>Cancelar</Botao>
            <Botao variante="perigo" icone={Trash2} carregando={ocupado === excluindo?.id} onClick={confirmarExclusao}>
              Excluir
            </Botao>
          </>
        } />
    </>
  );
}

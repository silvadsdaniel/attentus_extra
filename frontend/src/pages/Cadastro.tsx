import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { LayoutEntrada } from "../components/Layout";
import { Aviso, Botao, Campo, Entrada } from "../components/ui";
import { api, mensagemDeErro } from "../lib/api";
import { useAuth } from "../lib/auth";
import { CampoSenha } from "./Entrar";

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface DadosNovoUsuario {
  full_name: string;
  username: string;
  email: string;
  password: string;
}

/** Mesmas regras da API (api/seguranca.py), para avisar antes de enviar. */
export function validaNovoUsuario(dados: DadosNovoUsuario, confirmacao?: string): string | null {
  if (!dados.full_name.trim() || !dados.username.trim() || !dados.email.trim() || !dados.password) {
    return "Preencha todos os campos.";
  }
  if (!EMAIL_VALIDO.test(dados.email.trim())) return "Digite um email válido.";
  if (dados.password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  if (confirmacao !== undefined && dados.password !== confirmacao) return "As senhas não coincidem.";
  return null;
}

export default function Cadastro() {
  const { entrar } = useAuth();
  const [dados, setDados] = useState<DadosNovoUsuario>({ full_name: "", username: "", email: "", password: "" });
  const [confirmacao, setConfirmacao] = useState("");
  const [primeiroAdmin, setPrimeiroAdmin] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<{ primeiro_admin: boolean }>("/auth/cadastro")
      .then((info) => setPrimeiroAdmin(info.primeiro_admin))
      .catch(() => undefined);
  }, []);

  const muda = (campo: keyof DadosNovoUsuario) => (valor: string) =>
    setDados((atual) => ({ ...atual, [campo]: valor }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const problema = validaNovoUsuario(dados, confirmacao);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await api("/auth/cadastro", { method: "POST", json: dados });
      await entrar(dados.username.trim(), dados.password);
      toast.success("Conta criada. Boas-vindas ao Attentus!");
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  return (
    <LayoutEntrada>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Criar conta</h2>
      <p className="mt-1 text-sm text-slate-500">Leva menos de um minuto.</p>

      <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
        {primeiroAdmin && (
          <Aviso tipo="info" titulo="Primeira conta do sistema">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" aria-hidden /> Ela será criada como administrador.
            </span>
          </Aviso>
        )}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo id="nome" rotulo="Nome completo">
          <Entrada id="nome" value={dados.full_name} autoFocus autoComplete="name" placeholder="Maria Silva"
            onChange={(e) => muda("full_name")(e.target.value)} />
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="novo-usuario" rotulo="Nome de usuário">
            <Entrada id="novo-usuario" value={dados.username} autoComplete="username" placeholder="maria.silva"
              onChange={(e) => muda("username")(e.target.value)} />
          </Campo>
          <Campo id="email" rotulo="Email">
            <Entrada id="email" type="email" value={dados.email} autoComplete="email"
              placeholder="maria@empresa.com.br" onChange={(e) => muda("email")(e.target.value)} />
          </Campo>
        </div>
        <Campo id="nova-senha" rotulo="Senha" ajuda="Mínimo de 6 caracteres.">
          <CampoSenha id="nova-senha" valor={dados.password} aoMudar={muda("password")} autoComplete="new-password" />
        </Campo>
        <Campo id="confirmacao" rotulo="Confirmar senha">
          <CampoSenha id="confirmacao" valor={confirmacao} aoMudar={setConfirmacao} autoComplete="new-password" />
        </Campo>
        <Botao type="submit" icone={UserPlus} carregando={enviando} tamanho="lg" className="w-full">
          Criar conta
        </Botao>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link to="/entrar" className="font-medium text-brand-600 hover:text-brand-700">Entrar</Link>
      </p>
    </LayoutEntrada>
  );
}

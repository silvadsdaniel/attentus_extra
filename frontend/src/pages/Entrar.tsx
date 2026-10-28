import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { LayoutEntrada } from "../components/Layout";
import { Aviso, Botao, BotaoIcone, Campo, Entrada } from "../components/ui";
import { mensagemDeErro } from "../lib/api";
import { useAuth } from "../lib/auth";

export function CampoSenha({
  id, valor, aoMudar, autoComplete,
}: { id: string; valor: string; aoMudar: (v: string) => void; autoComplete: string }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Entrada id={id} type={visivel ? "text" : "password"} value={valor} required
        autoComplete={autoComplete} onChange={(e) => aoMudar(e.target.value)} className="pr-11" />
      <BotaoIcone icone={visivel ? EyeOff : Eye} rotulo={visivel ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisivel((v) => !v)} className="absolute top-1 right-1" />
    </div>
  );
}

export default function Entrar() {
  const { entrar } = useAuth();
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      // com a sessão aberta, a rota de visitante redireciona para a página pedida
      await entrar(username.trim(), senha);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  return (
    <LayoutEntrada>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Entrar</h2>
      <p className="mt-1 text-sm text-slate-500">Acesse sua conta para planejar a escala.</p>

      <form onSubmit={enviar} className="mt-8 space-y-5">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo id="usuario" rotulo="Nome de usuário">
          <Entrada id="usuario" value={username} required autoFocus autoComplete="username"
            placeholder="seu.usuario" onChange={(e) => setUsername(e.target.value)} />
        </Campo>
        <Campo id="senha" rotulo="Senha">
          <CampoSenha id="senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" />
        </Campo>
        <Botao type="submit" icone={LogIn} carregando={enviando} tamanho="lg" className="w-full">
          Entrar
        </Botao>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="font-medium text-brand-600 hover:text-brand-700">Criar conta</Link>
      </p>
    </LayoutEntrada>
  );
}

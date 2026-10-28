import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { api, EVENTO_SESSAO_EXPIRADA, lerToken, salvarToken } from "./api";
import type { Usuario } from "./api";

interface AuthContexto {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (username: string, password: string) => Promise<void>;
  sair: () => void;
}

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => lerToken() !== null);

  // Restaura a sessão salva ao abrir o app
  useEffect(() => {
    if (!lerToken()) return;
    api<Usuario>("/auth/me")
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    const expirou = () => {
      setUsuario((atual) => {
        if (atual) toast.info("Sua sessão expirou. Entre novamente.");
        return null;
      });
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, []);

  const entrar = useCallback(async (username: string, password: string) => {
    const resposta = await api<{ token: string; usuario: Usuario }>("/auth/login", {
      method: "POST",
      json: { username, password },
    });
    salvarToken(resposta.token);
    setUsuario(resposta.usuario);
  }, []);

  const sair = useCallback(() => {
    salvarToken(null);
    try {
      sessionStorage.clear(); // última otimização da sessão
    } catch {
      // sem armazenamento
    }
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair }),
    [usuario, carregando, entrar, sair],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return contexto;
}

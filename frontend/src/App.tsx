import { lazy } from "react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Toaster } from "sonner";
import { LayoutApp } from "./components/Layout";
import { Simbolo } from "./components/Logo";
import { Carregando } from "./components/ui";
import { AuthProvider, useAuth } from "./lib/auth";
import { OtimizacaoProvider } from "./lib/estado-otimizacao";
import Cadastro from "./pages/Cadastro";
import Entrar from "./pages/Entrar";

// Páginas internas carregadas sob demanda: a tela de login não baixa a biblioteca de gráficos
const Painel = lazy(() => import("./pages/Painel"));
const Otimizacao = lazy(() => import("./pages/Otimizacao"));
const Usuarios = lazy(() => import("./pages/Usuarios"));

/** Páginas internas: exigem sessão e compartilham o estado da otimização. */
function SoAutenticado() {
  const { usuario, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando texto="Abrindo o Attentus…" />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return (
    <OtimizacaoProvider>
      <LayoutApp />
    </OtimizacaoProvider>
  );
}

/** Login e cadastro; quem entra volta para a página que tinha pedido (ou o painel). */
function SoVisitante() {
  const { usuario, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando texto="Abrindo o Attentus…" />;
  const destino = (local.state as { de?: string } | null)?.de ?? "/painel";
  return usuario ? <Navigate to={destino} replace /> : <Outlet />;
}

function SoAdmin() {
  const { usuario } = useAuth();
  return usuario?.role === "admin" ? <Outlet /> : <Navigate to="/painel" replace />;
}

function NaoEncontrada() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Simbolo className="size-12" />
      <h1 className="mt-6 text-2xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="mt-2 text-sm text-slate-500">O endereço pode ter mudado ou não existir mais.</p>
      <Link to="/" className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700">Voltar ao início</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SoVisitante />}>
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/cadastro" element={<Cadastro />} />
          </Route>
          <Route element={<SoAutenticado />}>
            <Route index element={<Navigate to="/painel" replace />} />
            <Route path="/painel" element={<Painel />} />
            <Route path="/otimizacao" element={<Otimizacao />} />
            <Route element={<SoAdmin />}>
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Route>
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Atividades from "./pages/Atividades";
import NovaAtividade from "./pages/NovaAtividade";
import Confirmacao from "./pages/Confirmacao";
import DetalhesAtividade from "./pages/DetalhesAtividade";
import Usuarios from "./pages/Usuarios";
import UsuarioForm from "./pages/UsuarioForm";

// Carregada só ao abrir a tela, para o Chart.js não pesar no resto do sistema
const Relatorios = lazy(() => import("./pages/Relatorios"));

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* PÚBLICA */}
                    <Route path="/login" element={<Login />} />

                    {/* PROTEGIDAS (navbar + sidebar) */}
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/atividades" element={<Atividades />} />
                        <Route path="/atividades/nova" element={<NovaAtividade />} />
                        <Route path="/atividades/confirmacao" element={<Confirmacao />} />
                        <Route path="/atividades/:id" element={<DetalhesAtividade />} />
                        <Route
                            path="/relatorios"
                            element={<Suspense fallback={null}><Relatorios /></Suspense>}
                        />
                        <Route path="/usuarios" element={<Usuarios />} />
                        <Route path="/usuarios/novo" element={<UsuarioForm />} />
                        <Route path="/usuarios/:id" element={<UsuarioForm />} />
                    </Route>

                    {/* QUALQUER OUTRA ROTA */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

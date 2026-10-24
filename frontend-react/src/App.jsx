import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import Home from "./pages/Home";
import Atividades from "./pages/Atividades";
import NovaAtividade from "./pages/NovaAtividade";
import Confirmacao from "./pages/Confirmacao";
import DetalhesAtividade from "./pages/DetalhesAtividade";
import Usuarios from "./pages/Usuarios";
import UsuarioForm from "./pages/UsuarioForm";
import Perfil from "./pages/Perfil";

// Carregada só ao abrir a tela, para o Chart.js não pesar no resto do sistema
const Relatorios = lazy(() => import("./pages/Relatorios"));

// Telas do cadastro de usuários: quem não é TI volta para a Home
function SomenteTI({ children }) {
    const { usuario } = useAuth();
    return usuario?.funcao === "ti" ? children : <Navigate to="/" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* PÚBLICA */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/recuperar-senha" element={<RecuperarSenha />} />

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
                        <Route path="/perfil" element={<Perfil />} />
                        <Route path="/usuarios" element={<SomenteTI><Usuarios /></SomenteTI>} />
                        <Route path="/usuarios/novo" element={<SomenteTI><UsuarioForm /></SomenteTI>} />
                        <Route path="/usuarios/:id" element={<SomenteTI><UsuarioForm /></SomenteTI>} />
                    </Route>

                    {/* QUALQUER OUTRA ROTA */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

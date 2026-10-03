import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

/* Estrutura comum das páginas internas (navbar + sidebar).
   Quem não estiver logado é mandado para a tela de login. */
export default function Layout() {
    const { usuario } = useAuth();

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="w-full h-screen overflow-hidden bg-[#f2f2f4] font-sans antialiased flex flex-col">
            <Navbar />
            <div className="w-full h-[calc(100vh-56px)] flex">
                <Sidebar />
                <main className="flex-1 h-full bg-[#f2f2f4] p-5 xl:p-6 2xl:p-8 overflow-y-auto flex flex-col gap-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

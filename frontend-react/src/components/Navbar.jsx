import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFecharAoClicarFora } from "../hooks/useFecharAoClicarFora";
import { IconeSino, IconePessoa } from "./Icones";
import logoBranca from "../assets/logobranca.png";

export default function Navbar() {
    const { usuario, sair } = useAuth();
    const navigate = useNavigate();
    const [menuAberto, setMenuAberto] = useState(false);
    const areaMenuRef = useRef(null);

    useFecharAoClicarFora(areaMenuRef, useCallback(() => setMenuAberto(false), []));

    function fazerLogout() {
        sair();
        navigate("/login");
    }

    const funcoes = { usuario: "Usuário comum", gestor: "Gestor" };
    const detalhe = [usuario?.setor, funcoes[usuario?.funcao]].filter(Boolean).join(" · ");
    const primeiroNome = usuario?.nome ? usuario.nome.split(" ")[0] : "Usuário";

    return (
        <header className="w-full h-[56px] bg-[#6F0049] flex items-center justify-between px-6 shrink-0">

            {/* LOGO */}
            <div className="logo-area">
                <img src={logoBranca} alt="Pinhalense" className="h-[28px] w-auto block" />
            </div>

            {/* PARTE DIREITA DA NAVBAR */}
            <div className="flex items-center gap-[18px] text-white">

                {/* NOTIFICAÇÕES */}
                <button
                    className="bg-transparent border-0 text-white cursor-pointer flex items-center hover:opacity-80 transition-opacity"
                    type="button"
                    aria-label="Notificações"
                >
                    <IconeSino />
                </button>

                {/* USUÁRIO + MENU */}
                <div className="relative" ref={areaMenuRef}>
                    <button
                        className="bg-transparent border-0 text-white cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity"
                        type="button"
                        aria-label="Usuário"
                        onClick={() => setMenuAberto(aberto => !aberto)}
                    >
                        <IconePessoa />
                        <span className="text-sm">{primeiroNome}</span>
                        <span className="text-xs">⌄</span>
                    </button>

                    {menuAberto && (
                        <div
                            role="menu"
                            className="absolute right-0 top-[calc(100%+10px)] min-w-[220px] bg-white border border-[#d1d1d6] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.12)] p-3 z-50 text-[#1c1c1e] text-sm"
                        >
                            <div className="font-semibold">{usuario?.nome || "Usuário"}</div>
                            <div className="text-[#6e6e73] text-xs mt-0.5">
                                {detalhe || usuario?.email || ""}
                            </div>
                            <hr className="border-0 border-t border-[#e2e2e7] my-2.5" />
                            <button
                                type="button"
                                onClick={fazerLogout}
                                className="w-full text-left bg-transparent border-0 px-2.5 py-2 rounded-lg text-[#6F0049] font-semibold cursor-pointer hover:bg-[#f4e8f0] transition-colors"
                            >
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

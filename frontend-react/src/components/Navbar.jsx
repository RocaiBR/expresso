import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFecharAoClicarFora } from "../hooks/useFecharAoClicarFora";
import { Api } from "../services/api";
import { TEMAS, aplicarTema, useTema } from "../utils/tema";
import { IconePessoa } from "./Icones";
import Avatar from "./Avatar";
import SinoNotificacoes from "./SinoNotificacoes";
import logoBranca from "../assets/logobranca.png";

export default function Navbar() {
    const { usuario, sair, atualizarSessao } = useAuth();
    const navigate = useNavigate();
    const tema = useTema();
    const [menuAberto, setMenuAberto] = useState(false);
    const areaMenuRef = useRef(null);

    useFecharAoClicarFora(areaMenuRef, useCallback(() => setMenuAberto(false), []));

    function fazerLogout() {
        sair();
        navigate("/login");
    }

    function abrirPerfil() {
        setMenuAberto(false);
        navigate("/perfil");
    }

    // Troca na hora e guarda na conta (se falhar, continua valendo neste navegador)
    function escolherTema(valor) {
        aplicarTema(valor);
        atualizarSessao({ tema: valor });
        Api.salvarTema(valor).catch(function () {});
    }

    const funcoes = { usuario: "Usuário padrão", gestor: "Gestor", ti: "TI" };
    const detalhe = [usuario?.setor, funcoes[usuario?.funcao]].filter(Boolean).join(" · ");
    const primeiroNome = usuario?.nome ? usuario.nome.split(" ")[0] : "Usuário";

    return (
        <header className="w-full h-[56px] bg-barra border-b border-barra-borda flex items-center justify-between px-6 shrink-0">

            {/* LOGO */}
            <div className="logo-area">
                <img src={logoBranca} alt="Pinhalense" className="h-[28px] w-auto block" />
            </div>

            {/* PARTE DIREITA DA NAVBAR */}
            <div className="flex items-center gap-[18px] text-white">

                {/* NOTIFICAÇÕES */}
                <SinoNotificacoes />

                {/* USUÁRIO + MENU */}
                <div className="relative" ref={areaMenuRef}>
                    <button
                        className="bg-transparent border-0 text-white cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity"
                        type="button"
                        aria-label="Usuário"
                        onClick={() => setMenuAberto(aberto => !aberto)}
                    >
                        {usuario?.foto_url
                            ? <Avatar fotoUrl={usuario.foto_url} nome={usuario.nome} tamanho={28} className="border-2 border-white" />
                            : <IconePessoa />}
                        <span className="text-sm">{primeiroNome}</span>
                        <span className="text-xs">⌄</span>
                    </button>

                    {menuAberto && (
                        <div
                            role="menu"
                            className="absolute right-0 top-[calc(100%+10px)] min-w-[280px] bg-superficie border border-borda rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.12)] p-3 z-50 text-texto text-sm"
                        >
                            <div className="font-semibold">{usuario?.nome || "Usuário"}</div>
                            <div className="text-texto-suave text-xs mt-0.5">
                                {detalhe || usuario?.email || ""}
                            </div>
                            <hr className="border-0 border-t border-borda-suave my-2.5" />

                            {/* TEMA */}
                            <div className="px-1 pb-2.5">
                                <div className="text-xs font-semibold text-texto-suave mb-1.5">Tema</div>
                                <div className="flex gap-1 bg-fundo border border-borda-suave rounded-lg p-1" role="radiogroup" aria-label="Tema">
                                    {TEMAS.map(opcao => (
                                        <button
                                            key={opcao.valor}
                                            type="button"
                                            role="radio"
                                            aria-checked={tema === opcao.valor}
                                            onClick={() => escolherTema(opcao.valor)}
                                            className={
                                                "flex-1 border-0 rounded-md px-2 py-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap transition-colors " +
                                                (tema === opcao.valor
                                                    ? "bg-marca text-white"
                                                    : "bg-transparent text-texto-2 hover:bg-superficie-hover")
                                            }
                                        >
                                            {opcao.rotulo}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <hr className="border-0 border-t border-borda-suave mb-2.5" />

                            <button
                                type="button"
                                onClick={abrirPerfil}
                                className="w-full text-left bg-transparent border-0 px-2.5 py-2 rounded-lg text-texto font-medium cursor-pointer hover:bg-realce transition-colors"
                            >
                                Meu perfil
                            </button>
                            <button
                                type="button"
                                onClick={fazerLogout}
                                className="w-full text-left bg-transparent border-0 px-2.5 py-2 rounded-lg text-marca-texto font-semibold cursor-pointer hover:bg-realce transition-colors"
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

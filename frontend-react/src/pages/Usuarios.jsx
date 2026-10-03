import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Api } from "../services/api";
import { IconeEditar } from "../components/Icones";

export default function Usuarios() {
    const location = useLocation();
    const [usuarios, setUsuarios] = useState(null);
    const [aviso, setAviso] = useState(null);

    // Mensagem deixada pela tela de cadastro/edição
    const mensagemSucesso = location.state?.aviso;

    useEffect(() => {
        let ativo = true;
        async function carregar() {
            try {
                const lista = await Api.listarUsuarios();
                if (ativo) setUsuarios(lista);
            } catch (erro) {
                if (ativo) {
                    setUsuarios([]);
                    setAviso({ texto: erro.message, tipo: "erro" });
                }
            }
        }
        carregar();
        return () => { ativo = false; };
    }, []);

    const avisoAtual = aviso || (mensagemSucesso ? { texto: mensagemSucesso, tipo: "sucesso" } : null);

    return (
        <div className="flex flex-col gap-5">

            {/* VOLTAR */}
            <Link to="/" className="text-[#6F0049] text-sm font-semibold no-underline hover:underline w-fit">
                &lt; Voltar
            </Link>

            {/* TÍTULO + NOVO USUÁRIO */}
            <div className="w-full flex items-center justify-between gap-4">
                <h1 className="bg-[#6F0049] text-white text-sm font-medium px-8 py-2 rounded-lg shadow-sm">
                    Usuários
                </h1>
                <Link
                    to="/usuarios/novo"
                    className="bg-[#6F0049] hover:bg-[#560039] text-white text-sm font-medium px-5 py-2 rounded-lg shadow-sm no-underline transition-colors whitespace-nowrap"
                >
                    Novo usuário
                </Link>
            </div>

            {/* AVISO */}
            {avisoAtual && (
                <div
                    className={
                        "w-full rounded-lg px-4 py-3 text-sm " +
                        (avisoAtual.tipo === "erro"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-green-50 text-green-700 border border-green-200")
                    }
                >
                    {avisoAtual.texto}
                </div>
            )}

            {/* LISTA */}
            <div className="w-full flex flex-col gap-3">
                {usuarios === null && (
                    <div className="p-6 text-center text-sm text-[#6e6e73]">Carregando usuários...</div>
                )}
                {usuarios !== null && usuarios.length === 0 && !aviso && (
                    <div className="p-6 text-center text-sm text-[#6e6e73]">Nenhum usuário cadastrado ainda.</div>
                )}
                {usuarios !== null && usuarios.map(usuario => (
                    <Link
                        key={usuario.id}
                        to={"/usuarios/" + usuario.id}
                        className="w-full h-[44px] bg-white border border-[#b9b9be] rounded-lg px-4 flex items-center justify-between gap-3 text-sm text-[#3a3a3c] no-underline hover:border-[#6F0049] hover:bg-[#fbf7fa] transition-colors"
                    >
                        <span className={"truncate " + (usuario.ativo ? "" : "text-[#8e8e93]")}>
                            {usuario.nome}
                            {!usuario.ativo && (
                                <span className="ml-2 text-[11px] font-semibold uppercase text-[#6e6e73] bg-[#e7e7e9] px-2 py-0.5 rounded">
                                    Inativo
                                </span>
                            )}
                        </span>
                        <span className="text-[#54565B] shrink-0" title="Editar">
                            <IconeEditar />
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

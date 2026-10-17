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
            <Link to="/" className="text-marca-texto text-sm font-semibold no-underline hover:underline w-fit">
                &lt; Voltar
            </Link>

            {/* TÍTULO + NOVO USUÁRIO */}
            <div className="w-full flex items-center justify-between gap-4">
                <h1 className="bg-marca text-white text-sm font-medium px-8 py-2 rounded-lg shadow-sm">
                    Usuários
                </h1>
                <Link
                    to="/usuarios/novo"
                    className="bg-marca hover:bg-marca-escura text-white text-sm font-medium px-5 py-2 rounded-lg shadow-sm no-underline transition-colors whitespace-nowrap"
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
                            ? "bg-perigo-fundo text-perigo border border-perigo-borda"
                            : "bg-sucesso-fundo text-sucesso border border-sucesso-borda")
                    }
                >
                    {avisoAtual.texto}
                </div>
            )}

            {/* LISTA */}
            <div className="w-full flex flex-col gap-3">
                {usuarios === null && (
                    <div className="p-6 text-center text-sm text-texto-suave">Carregando usuários...</div>
                )}
                {usuarios !== null && usuarios.length === 0 && !aviso && (
                    <div className="p-6 text-center text-sm text-texto-suave">Nenhum usuário cadastrado ainda.</div>
                )}
                {usuarios !== null && usuarios.map(usuario => (
                    <Link
                        key={usuario.id}
                        to={"/usuarios/" + usuario.id}
                        className="w-full h-[44px] bg-superficie border border-borda-forte rounded-lg px-4 flex items-center justify-between gap-3 text-sm text-texto-2 no-underline hover:border-marca-texto hover:bg-realce-suave transition-colors"
                    >
                        <span className={"truncate " + (usuario.ativo ? "" : "text-texto-fraco")}>
                            {usuario.nome}
                            {!usuario.ativo && (
                                <span className="ml-2 text-[11px] font-semibold uppercase text-texto-suave bg-neutro px-2 py-0.5 rounded">
                                    Inativo
                                </span>
                            )}
                        </span>
                        <span className="text-cinza-texto shrink-0" title="Editar">
                            <IconeEditar />
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const classesCampo =
    "h-[40px] bg-superficie border border-borda-forte rounded-lg px-3 text-sm outline-none focus:border-marca-texto focus:ring-1 focus:ring-marca-texto";

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function UsuarioForm() {
    const { id } = useParams();
    const editando = Boolean(id);
    const navigate = useNavigate();
    const { usuario: logado } = useAuth();
    const podeExcluir = editando && String(logado?.id) !== String(id);

    const [dados, setDados] = useState({
        nome: "",
        usuario: "",
        email: "",
        senha: "",
        setor: "",
        funcao: "",
        ativo: "1"
    });
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const [carregouUsuario, setCarregouUsuario] = useState(!editando);

    useEffect(() => {
        if (!editando) return;
        let ativo = true;
        async function carregar() {
            try {
                const usuario = await Api.buscarUsuario(id);
                if (!ativo) return;
                setDados({
                    nome: usuario.nome || "",
                    usuario: usuario.usuario || "",
                    email: usuario.email || "",
                    senha: "",
                    setor: usuario.setor || "",
                    funcao: usuario.funcao || "usuario",
                    ativo: usuario.ativo ? "1" : "0"
                });
                setCarregouUsuario(true);
            } catch (erroApi) {
                if (ativo) setErro(erroApi.message);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, [editando, id]);

    function mudarCampo(campo, valor) {
        setDados(atuais => ({ ...atuais, [campo]: valor }));
        setErro(null);
    }

    function validar() {
        if (!dados.nome.trim()) return "Preencha o nome completo.";
        if (!dados.email.trim() || !emailValido(dados.email.trim())) return "Informe um e-mail válido.";
        if (!editando && !dados.senha) return "Informe uma senha para o novo usuário.";
        if (dados.senha && dados.senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
        if (dados.usuario.trim() && !/^[A-Za-z0-9._-]+$/.test(dados.usuario.trim())) {
            return "O nome de usuário pode ter só letras, números, ponto, hífen e sublinhado (sem espaços).";
        }
        if (!dados.setor) return "Selecione um setor.";
        if (!dados.funcao) return "Selecione uma função.";
        return null;
    }

    async function salvar(evento) {
        evento.preventDefault();
        setErro(null);

        const problema = validar();
        if (problema) {
            setErro(problema);
            return;
        }

        const corpo = {
            nome: dados.nome.trim(),
            usuario: dados.usuario.trim(),
            email: dados.email.trim(),
            senha: dados.senha,
            setor: dados.setor,
            funcao: dados.funcao
        };

        setSalvando(true);
        try {
            let aviso;
            if (editando) {
                corpo.ativo = dados.ativo === "1";
                if (!corpo.senha) delete corpo.senha;
                await Api.atualizarUsuario(id, corpo);
                aviso = 'Usuário "' + corpo.nome + '" atualizado com sucesso.';
            } else {
                await Api.criarUsuario(corpo);
                aviso = 'Usuário "' + corpo.nome + '" adicionado com sucesso.';
            }
            navigate("/usuarios", { state: { aviso } });
        } catch (erroApi) {
            setErro(erroApi.message);
            setSalvando(false);
        }
    }

    async function excluir() {
        setErro(null);
        setSalvando(true);
        try {
            const tarefas = await Api.listarTarefas();
            const quantas = tarefas.filter(tarefa => String(tarefa.usuario_id) === String(id)).length;
            const confirmou = confirm(
                'Excluir o usuário "' + dados.nome + '"? Essa ação não pode ser desfeita.\n\n' +
                (quantas > 0
                    ? "Ele é responsável por " + quantas + " atividade(s). Elas continuam no sistema, com o nome dele, " +
                      "e você pode passá-las para outra pessoa em Atividades > Selecionar.\n\n"
                    : "") +
                'Se a pessoa só vai ficar fora por um tempo, prefira mudar o Estado para "Inativo".'
            );
            if (!confirmou) {
                setSalvando(false);
                return;
            }
            await Api.excluirUsuario(id);
            navigate("/usuarios", { state: { aviso: 'Usuário "' + dados.nome + '" excluído.' } });
        } catch (erroApi) {
            setErro(erroApi.message);
            setSalvando(false);
        }
    }

    return (
        <div className="flex flex-col gap-5">

            {/* VOLTAR */}
            <Link to="/usuarios" className="text-marca-texto text-sm font-semibold no-underline hover:underline w-fit">
                &lt; Voltar
            </Link>

            {/* TÍTULO */}
            <h1 className="bg-marca text-white text-sm font-medium px-8 py-2 rounded-lg shadow-sm w-fit">
                {editando ? "Usuário" : "Novo usuário"}
            </h1>

            {/* AVISO */}
            {erro && (
                <div className="w-full rounded-lg px-4 py-3 text-sm bg-perigo-fundo text-perigo border border-perigo-borda">
                    {erro}
                </div>
            )}

            <form
                onSubmit={salvar}
                noValidate
                className="w-full max-w-[900px] grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5"
            >
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="nome" className="text-sm text-texto">Nome completo</label>
                    <input
                        id="nome"
                        type="text"
                        autoComplete="off"
                        value={dados.nome}
                        onChange={evento => mudarCampo("nome", evento.target.value)}
                        className={classesCampo}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="usuario" className="text-sm text-texto">Usuário</label>
                    <input
                        id="usuario"
                        type="text"
                        autoComplete="off"
                        value={dados.usuario}
                        onChange={evento => mudarCampo("usuario", evento.target.value)}
                        className={classesCampo}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-sm text-texto">Email</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="off"
                        value={dados.email}
                        onChange={evento => mudarCampo("email", evento.target.value)}
                        className={classesCampo}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="senha" className="text-sm text-texto">Senha</label>
                    <input
                        id="senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder={editando ? "Deixe em branco para manter a atual" : undefined}
                        value={dados.senha}
                        onChange={evento => mudarCampo("senha", evento.target.value)}
                        className={classesCampo}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="setor" className="text-sm text-texto">Setor</label>
                    <select
                        id="setor"
                        value={dados.setor}
                        onChange={evento => mudarCampo("setor", evento.target.value)}
                        className={classesCampo + " cursor-pointer"}
                    >
                        <option value="" disabled>Selecione um setor</option>
                        <option value="PCP">PCP</option>
                        <option value="ENGENHARIA">ENGENHARIA</option>
                        <option value="TI">TI</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="funcao" className="text-sm text-texto">Função</label>
                    <select
                        id="funcao"
                        value={dados.funcao}
                        onChange={evento => mudarCampo("funcao", evento.target.value)}
                        className={classesCampo + " cursor-pointer"}
                    >
                        <option value="" disabled>Selecione uma função</option>
                        <option value="usuario">USUÁRIO PADRÃO</option>
                        <option value="gestor">GESTOR</option>
                        <option value="ti">TI</option>
                    </select>
                </div>

                {/* ESTADO: só aparece na edição */}
                {editando && (
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="ativo" className="text-sm text-texto">Estado</label>
                        <select
                            id="ativo"
                            value={dados.ativo}
                            onChange={evento => mudarCampo("ativo", evento.target.value)}
                            className={classesCampo + " cursor-pointer"}
                        >
                            <option value="1">Ativo</option>
                            <option value="0">Inativo</option>
                        </select>
                    </div>
                )}

                <div className={(editando ? "" : "md:col-span-2 ") + "flex justify-end items-end gap-3"}>
                    {podeExcluir && (
                        <button
                            type="button"
                            onClick={excluir}
                            disabled={salvando || !carregouUsuario}
                            className="border border-perigo text-perigo bg-superficie hover:bg-perigo-fundo text-sm font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Excluir usuário
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={salvando || (editando && !carregouUsuario)}
                        className="bg-marca hover:bg-marca-escura text-white text-sm font-medium px-12 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {editando ? "Editar" : "Adicionar"}
                    </button>
                </div>
            </form>
        </div>
    );
}

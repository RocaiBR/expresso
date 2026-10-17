import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Formato } from "../utils/formato";
import { prepararFotoDePerfil } from "../utils/imagem";
import Avatar from "../components/Avatar";

const classesCampo =
    "h-[40px] bg-superficie border border-borda-forte rounded-lg px-3 text-sm outline-none focus:border-marca-texto focus:ring-1 focus:ring-marca-texto";
const classesLeitura =
    "min-h-[40px] bg-superficie-2 border border-borda-suave rounded-lg px-3 py-2 text-sm text-texto flex items-center break-all";
const TAMANHO_MINIMO_SENHA = 6;

function Aviso({ aviso }) {
    if (!aviso) return null;
    return (
        <div
            className={
                "w-full rounded-lg px-4 py-3 text-sm " +
                (aviso.tipo === "erro"
                    ? "bg-perigo-fundo text-perigo border border-perigo-borda"
                    : "bg-sucesso-fundo text-sucesso border border-sucesso-borda")
            }
        >
            {aviso.texto}
        </div>
    );
}

function CampoLeitura({ rotulo, valor }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm text-texto">{rotulo}</span>
            <div className={classesLeitura}>{valor || "—"}</div>
        </div>
    );
}

/* Meu perfil: qualquer cargo vê os próprios dados e troca a foto e a senha */
export default function Perfil() {
    const { atualizarSessao } = useAuth();
    const [perfil, setPerfil] = useState(null);
    const [erroCarregar, setErroCarregar] = useState(null);

    const entradaFoto = useRef(null);
    const [enviandoFoto, setEnviandoFoto] = useState(false);
    const [avisoFoto, setAvisoFoto] = useState(null);

    const [senhas, setSenhas] = useState({ atual: "", nova: "", confirmacao: "" });
    const [salvandoSenha, setSalvandoSenha] = useState(false);
    const [avisoSenha, setAvisoSenha] = useState(null);

    useEffect(() => {
        let ativo = true;
        Api.buscarPerfil()
            .then(dados => {
                if (ativo) setPerfil(dados);
            })
            .catch(erro => {
                if (ativo) setErroCarregar(erro.message);
            });
        return () => { ativo = false; };
    }, []);

    async function escolherFoto(evento) {
        const arquivo = evento.target.files[0];
        evento.target.value = "";
        if (!arquivo) return;

        setAvisoFoto(null);
        setEnviandoFoto(true);
        try {
            const imagem = await prepararFotoDePerfil(arquivo);
            const { foto_url } = await Api.trocarFotoPerfil(imagem);
            setPerfil(atual => ({ ...atual, foto_url }));
            atualizarSessao({ foto_url });
            setAvisoFoto({ tipo: "sucesso", texto: "Foto atualizada." });
        } catch (erro) {
            setAvisoFoto({ tipo: "erro", texto: erro.message });
        } finally {
            setEnviandoFoto(false);
        }
    }

    async function removerFoto() {
        setAvisoFoto(null);
        setEnviandoFoto(true);
        try {
            await Api.removerFotoPerfil();
            setPerfil(atual => ({ ...atual, foto_url: null }));
            atualizarSessao({ foto_url: null });
            setAvisoFoto({ tipo: "sucesso", texto: "Foto removida." });
        } catch (erro) {
            setAvisoFoto({ tipo: "erro", texto: erro.message });
        } finally {
            setEnviandoFoto(false);
        }
    }

    function mudarSenha(campo, valor) {
        setSenhas(atuais => ({ ...atuais, [campo]: valor }));
        setAvisoSenha(null);
    }

    async function salvarSenha(evento) {
        evento.preventDefault();
        if (!senhas.atual) {
            setAvisoSenha({ tipo: "erro", texto: "Informe a senha atual." });
            return;
        }
        if (senhas.nova.length < TAMANHO_MINIMO_SENHA) {
            setAvisoSenha({ tipo: "erro", texto: "A nova senha deve ter pelo menos " + TAMANHO_MINIMO_SENHA + " caracteres." });
            return;
        }
        if (senhas.nova !== senhas.confirmacao) {
            setAvisoSenha({ tipo: "erro", texto: "A confirmação não é igual à nova senha." });
            return;
        }

        setSalvandoSenha(true);
        try {
            const resposta = await Api.trocarSenha(senhas.atual, senhas.nova);
            setSenhas({ atual: "", nova: "", confirmacao: "" });
            setAvisoSenha({ tipo: "sucesso", texto: resposta.mensagem });
        } catch (erro) {
            setAvisoSenha({ tipo: "erro", texto: erro.message });
        } finally {
            setSalvandoSenha(false);
        }
    }

    return (
        <div className="flex flex-col gap-5">

            {/* VOLTAR */}
            <Link to="/" className="text-marca-texto text-sm font-semibold no-underline hover:underline w-fit">
                &lt; Voltar
            </Link>

            {/* TÍTULO */}
            <h1 className="bg-marca text-white text-sm font-medium px-8 py-2 rounded-lg shadow-sm w-fit">
                Meu perfil
            </h1>

            {erroCarregar && <Aviso aviso={{ tipo: "erro", texto: erroCarregar }} />}

            <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* FOTO + DADOS */}
                <section className="bg-superficie border border-borda rounded-xl shadow-sm p-5 flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-texto">Meus dados</h2>

                    <div className="flex items-center gap-4">
                        <Avatar fotoUrl={perfil?.foto_url} nome={perfil?.nome} tamanho={88} />
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => entradaFoto.current.click()}
                                disabled={!perfil || enviandoFoto}
                                className="bg-marca hover:bg-marca-escura text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {enviandoFoto ? "Enviando..." : perfil?.foto_url ? "Trocar foto" : "Adicionar foto"}
                            </button>
                            {perfil?.foto_url && (
                                <button
                                    type="button"
                                    onClick={removerFoto}
                                    disabled={enviandoFoto}
                                    className="bg-superficie border border-borda hover:bg-superficie-hover text-texto-2 text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                                >
                                    Remover foto
                                </button>
                            )}
                            <input
                                ref={entradaFoto}
                                type="file"
                                accept="image/*"
                                onChange={escolherFoto}
                                className="hidden"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-texto-suave -mt-1">
                        A foto é recortada no centro em formato quadrado.
                    </p>
                    <Aviso aviso={avisoFoto} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CampoLeitura rotulo="Nome completo" valor={perfil?.nome} />
                        <CampoLeitura rotulo="Usuário" valor={perfil?.usuario} />
                        <div className="sm:col-span-2">
                            <CampoLeitura rotulo="E-mail" valor={perfil?.email} />
                        </div>
                        <CampoLeitura rotulo="Setor" valor={perfil?.setor} />
                        <CampoLeitura rotulo="Função" valor={perfil ? Formato.funcoes[perfil.funcao] : ""} />
                    </div>
                    <p className="text-xs text-texto-suave">
                        Para mudar nome, e-mail, setor ou função, fale com o TI.
                    </p>
                </section>

                {/* SENHA */}
                <form
                    onSubmit={salvarSenha}
                    noValidate
                    className="bg-superficie border border-borda rounded-xl shadow-sm p-5 flex flex-col gap-4"
                >
                    <h2 className="text-sm font-bold text-texto">Alterar senha</h2>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="senhaAtual" className="text-sm text-texto">Senha atual</label>
                        <input
                            id="senhaAtual"
                            type="password"
                            autoComplete="current-password"
                            value={senhas.atual}
                            onChange={evento => mudarSenha("atual", evento.target.value)}
                            className={classesCampo}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="novaSenha" className="text-sm text-texto">Nova senha</label>
                        <input
                            id="novaSenha"
                            type="password"
                            autoComplete="new-password"
                            value={senhas.nova}
                            onChange={evento => mudarSenha("nova", evento.target.value)}
                            className={classesCampo}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirmacaoSenha" className="text-sm text-texto">Confirmar nova senha</label>
                        <input
                            id="confirmacaoSenha"
                            type="password"
                            autoComplete="new-password"
                            value={senhas.confirmacao}
                            onChange={evento => mudarSenha("confirmacao", evento.target.value)}
                            className={classesCampo}
                        />
                    </div>

                    <Aviso aviso={avisoSenha} />

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={salvandoSenha}
                            className="bg-marca hover:bg-marca-escura text-white text-sm font-medium px-8 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {salvandoSenha ? "Salvando..." : "Salvar nova senha"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

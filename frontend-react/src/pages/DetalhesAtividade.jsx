import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";

function CampoLeitura({ rotulo, valor, grande = false, colunaDupla = false }) {
    return (
        <div className={colunaDupla ? "md:col-span-2" : undefined}>
            <label className="block text-xs font-semibold text-[#6e6e73] mb-1">{rotulo}</label>
            <div
                className={
                    "w-full bg-[#f8f8fa] border border-[#e1e1e5] rounded-[10px] px-3 text-sm text-[#1c1c1e] " +
                    (grande
                        ? "min-h-[120px] py-3 whitespace-pre-wrap"
                        : "min-h-[42px] py-2.5 flex items-center")
                }
            >
                {valor}
            </div>
        </div>
    );
}

export default function DetalhesAtividade() {
    const { id } = useParams();
    const [tarefa, setTarefa] = useState(null);
    const [erro, setErro] = useState(null);
    const [atualizando, setAtualizando] = useState(false);

    useEffect(() => {
        let ativo = true;
        async function carregar() {
            try {
                const dados = await Api.buscarTarefa(id);
                if (ativo) setTarefa(dados);
            } catch (erroApi) {
                if (ativo) setErro(erroApi.message);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, [id]);

    async function mudarStatus(novoStatus, mensagemSucesso) {
        if (!tarefa) return;
        setAtualizando(true);
        try {
            const resposta = await Api.atualizarTarefa(tarefa.id, { status: novoStatus });
            setTarefa(resposta.tarefa);
            alert(mensagemSucesso);
        } catch (erroApi) {
            alert("Não foi possível atualizar: " + erroApi.message);
        } finally {
            setAtualizando(false);
        }
    }

    function cancelarAtividade() {
        if (!confirm("Tem certeza que deseja cancelar esta atividade?")) return;
        mudarStatus("cancelado", "Atividade cancelada com sucesso!");
    }

    function concluirAtividade() {
        mudarStatus("concluido", "Atividade concluída com sucesso!");
    }

    const naoEncontrada = Boolean(erro);
    const carregandoTarefa = !tarefa && !erro;
    const encerrada = tarefa && (tarefa.status === "concluido" || tarefa.status === "cancelado");
    const statusConcluido = tarefa?.status === "concluido";

    const titulo = naoEncontrada
        ? "Atividade não encontrada"
        : (tarefa?.titulo || (carregandoTarefa ? "Carregando..." : "Sem título"));

    return (
        <div>
            {/* CABEÇALHO */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Link to="/atividades" className="text-[#6F0049] text-sm no-underline hover:underline">
                        Atividades
                    </Link>
                    <span className="text-[#8e8e93]">/</span>
                    <span className="text-[#6e6e73] text-sm">Detalhes</span>
                </div>
                <h1 className="text-2xl xl:text-3xl font-bold text-[#1c1c1e]">
                    {naoEncontrada ? "Atividade não encontrada" : (tarefa?.titulo || "Detalhes da atividade")}
                </h1>
            </div>

            {/* CARD PRINCIPAL */}
            <section className="w-full max-w-[1000px] bg-white border border-[#d1d1d6] rounded-[15px] shadow-sm p-6 xl:p-8">

                {/* CÓDIGO + STATUS */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <span className="text-sm font-semibold text-[#6e6e73]">
                            {tarefa ? Formato.codigo(tarefa.id) : "#---"}
                        </span>
                        <h2 className="text-xl xl:text-2xl font-bold text-[#1c1c1e] mt-1">{titulo}</h2>
                    </div>

                    {/* STATUS */}
                    <span
                        className={
                            "px-4 py-2 rounded-full text-sm font-semibold " +
                            (statusConcluido
                                ? "bg-[#e7e7e9] text-[#54565B]"
                                : "bg-[#f4e8f0] text-[#6F0049]")
                        }
                    >
                        {naoEncontrada ? "Não encontrada" : Formato.rotuloStatus(tarefa?.status)}
                    </span>
                </div>

                {/* LINHA */}
                <div className="border-t border-[#e5e5e7] mb-6"></div>

                {/* INFORMAÇÕES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <CampoLeitura
                        rotulo="Responsável"
                        valor={naoEncontrada ? "-" : (tarefa?.responsavel || "Não atribuído")}
                    />
                    <CampoLeitura
                        rotulo="Prioridade"
                        valor={naoEncontrada ? "-" : Formato.rotuloPrioridade(tarefa?.prioridade)}
                    />
                    <CampoLeitura
                        rotulo="Data de início"
                        valor={naoEncontrada ? "-" : Formato.data(tarefa?.data_inicio)}
                    />
                    <CampoLeitura
                        rotulo="Data de vencimento"
                        valor={naoEncontrada ? "-" : Formato.data(tarefa?.data_conclusao)}
                    />
                    <CampoLeitura
                        rotulo="Participantes"
                        valor={naoEncontrada ? "-" : (tarefa?.participantes || "Nenhum participante informado")}
                        colunaDupla
                    />
                    <CampoLeitura
                        rotulo="Descrição"
                        valor={naoEncontrada ? erro : (tarefa?.descricao || "Nenhuma descrição informada.")}
                        grande
                        colunaDupla
                    />
                </div>

                {/* BOTÕES */}
                <div className="flex flex-wrap justify-end gap-3 mt-8 pt-6 border-t border-[#e5e5e7]">

                    {/* VOLTAR */}
                    <Link
                        to="/atividades"
                        className="px-5 py-2.5 rounded-[15px] border border-[#d1d1d6] bg-white text-[#3a3a3c] text-sm font-medium no-underline hover:bg-gray-50 transition-colors"
                    >
                        Voltar
                    </Link>

                    {!naoEncontrada && (
                        <>
                            {/* CANCELAR */}
                            <button
                                type="button"
                                onClick={cancelarAtividade}
                                disabled={encerrada || atualizando}
                                className="px-5 py-2.5 rounded-[15px] border border-[#6F0049] bg-white text-[#6F0049] text-sm font-medium hover:bg-[#f4e8f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancelar atividade
                            </button>

                            {/* CONCLUIR */}
                            <button
                                type="button"
                                onClick={concluirAtividade}
                                disabled={encerrada || atualizando}
                                className="px-5 py-2.5 rounded-[15px] bg-[#6F0049] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Concluir atividade
                            </button>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

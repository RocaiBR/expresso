import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";
import { estaAtrasada } from "../utils/tarefas";
import Anexos from "../components/Anexos";

function CampoLeitura({ rotulo, valor, grande = false, colunaDupla = false }) {
    return (
        <div className={colunaDupla ? "md:col-span-2" : undefined}>
            <label className="block text-xs font-semibold text-texto-suave mb-1">{rotulo}</label>
            <div
                className={
                    "w-full bg-superficie-2 border border-borda-suave rounded-[10px] px-3 text-sm text-texto " +
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
    const navigate = useNavigate();
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

    async function excluirAtividade() {
        if (!confirm("Excluir esta atividade e todos os arquivos dela? Essa ação não pode ser desfeita.")) return;
        setAtualizando(true);
        try {
            await Api.excluirTarefa(tarefa.id);
            navigate("/atividades");
        } catch (erroApi) {
            alert("Não foi possível excluir: " + erroApi.message);
            setAtualizando(false);
        }
    }

    const naoEncontrada = Boolean(erro);
    const carregandoTarefa = !tarefa && !erro;
    const encerrada = tarefa && (tarefa.status === "concluido" || tarefa.status === "cancelado");
    const statusConcluido = tarefa?.status === "concluido";
    // O que o usuário logado pode fazer com esta atividade (calculado pela API conforme o cargo)
    const permissoes = tarefa?.permissoes || {};

    const titulo = naoEncontrada
        ? "Atividade não encontrada"
        : (tarefa?.titulo || (carregandoTarefa ? "Carregando..." : "Sem título"));

    return (
        <div>
            {/* CABEÇALHO */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Link to="/atividades" className="text-marca-texto text-sm no-underline hover:underline">
                        Atividades
                    </Link>
                    <span className="text-texto-fraco">/</span>
                    <span className="text-texto-suave text-sm">Detalhes</span>
                </div>
                <h1 className="text-2xl xl:text-3xl font-bold text-texto">
                    {naoEncontrada ? "Atividade não encontrada" : (tarefa?.titulo || "Detalhes da atividade")}
                </h1>
            </div>

            {/* CARD PRINCIPAL */}
            <section className="w-full max-w-[1000px] bg-superficie border border-borda rounded-[15px] shadow-sm p-6 xl:p-8">

                {/* CÓDIGO + STATUS */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <span className="text-sm font-semibold text-texto-suave">
                            {tarefa ? Formato.codigo(tarefa.id) : "#---"}
                        </span>
                        <h2 className="text-xl xl:text-2xl font-bold text-texto mt-1">{titulo}</h2>
                    </div>

                    {/* PRAZO VENCIDO + STATUS */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {tarefa && estaAtrasada(tarefa) && (
                            <span
                                className="px-3 py-2 rounded-full text-xs font-semibold text-perigo bg-perigo-fundo border border-perigo-borda"
                                title="O prazo de entrega passou e a prioridade subiu para Urgente automaticamente"
                            >
                                Atrasada desde {Formato.data(tarefa.atrasada_desde)}
                            </span>
                        )}
                        <span
                            className={
                                "px-4 py-2 rounded-full text-sm font-semibold " +
                                (statusConcluido
                                    ? "bg-neutro text-cinza-texto"
                                    : "bg-realce text-marca-texto")
                            }
                        >
                            {naoEncontrada ? "Não encontrada" : Formato.rotuloStatus(tarefa?.status)}
                        </span>
                    </div>
                </div>

                {/* LINHA */}
                <div className="border-t border-borda-suave mb-6"></div>

                {/* INFORMAÇÕES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <CampoLeitura
                        rotulo="Responsável"
                        valor={naoEncontrada ? "-" : (tarefa?.responsavel || "Não atribuído")}
                    />
                    <CampoLeitura
                        rotulo="Prioridade"
                        valor={
                            naoEncontrada ? "-"
                                : Formato.rotuloPrioridade(tarefa?.prioridade) +
                                  (tarefa && estaAtrasada(tarefa) && tarefa.prioridade_original && tarefa.prioridade_original !== tarefa.prioridade
                                      ? " (era " + Formato.rotuloPrioridade(tarefa.prioridade_original) + ", subiu pelo atraso)"
                                      : "")
                        }
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
                    {tarefa && (
                        <Anexos
                            tarefaId={tarefa.id}
                            podeAnexar={permissoes.status}
                            podeRemoverTodos={permissoes.editar}
                        />
                    )}
                </div>

                {/* BOTÕES */}
                <div className="flex flex-wrap justify-end gap-3 mt-8 pt-6 border-t border-borda-suave">

                    {/* EXCLUIR (fica sozinho à esquerda) */}
                    {permissoes.excluir && (
                        <button
                            type="button"
                            onClick={excluirAtividade}
                            disabled={atualizando}
                            className="mr-auto px-5 py-2.5 rounded-[15px] border border-perigo bg-superficie text-perigo text-sm font-medium hover:bg-perigo-fundo transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Excluir atividade
                        </button>
                    )}

                    {/* VOLTAR */}
                    <Link
                        to="/atividades"
                        className="px-5 py-2.5 rounded-[15px] border border-borda bg-superficie text-texto-2 text-sm font-medium no-underline hover:bg-superficie-hover transition-colors"
                    >
                        Voltar
                    </Link>

                    {!naoEncontrada && permissoes.status && (
                        <>
                            {/* CANCELAR */}
                            <button
                                type="button"
                                onClick={cancelarAtividade}
                                disabled={encerrada || atualizando}
                                className="px-5 py-2.5 rounded-[15px] border border-marca-texto bg-superficie text-marca-texto text-sm font-medium hover:bg-realce transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancelar atividade
                            </button>

                            {/* CONCLUIR */}
                            <button
                                type="button"
                                onClick={concluirAtividade}
                                disabled={encerrada || atualizando}
                                className="px-5 py-2.5 rounded-[15px] bg-marca text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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

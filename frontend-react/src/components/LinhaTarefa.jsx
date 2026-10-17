import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";
import { estaAtrasada } from "../utils/tarefas";

/* Linha da tabela de atividades.
   No modo de seleção (selecionavel), a caixinha e o clique na linha marcam a atividade
   em vez de concluir / abrir os detalhes. */
export default function LinhaTarefa({ tarefa, clicavel = false, aoAlterar, selecionavel = false, selecionada = false, aoSelecionar }) {
    const navigate = useNavigate();

    // Marca/desmarca na hora (otimista) e desfaz se a API falhar
    const [concluida, setConcluida] = useState(tarefa.status === "concluido");
    useEffect(() => {
        setConcluida(tarefa.status === "concluido");
    }, [tarefa.status]);

    async function alternarConclusao(evento) {
        const marcado = evento.target.checked;
        const novoStatus = marcado ? "concluido" : "pendente";
        setConcluida(marcado);
        try {
            await Api.atualizarTarefa(tarefa.id, { status: novoStatus });
            if (aoAlterar) aoAlterar();
        } catch (erro) {
            setConcluida(!marcado);
            alert("Não foi possível atualizar: " + erro.message);
        }
    }

    function abrirDetalhes() {
        if (selecionavel) {
            aoSelecionar(tarefa.id);
            return;
        }
        if (clicavel) navigate("/atividades/" + tarefa.id);
    }

    const tamanhoBolinha = clicavel ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
    const atrasada = estaAtrasada(tarefa);

    return (
        <div
            onClick={abrirDetalhes}
            className={
                "grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center p-3.5 " +
                (clicavel || selecionavel ? "px-5 cursor-pointer " : "px-4 ") +
                (selecionada ? "bg-realce hover:bg-realce-forte " : "hover:bg-superficie-hover ") +
                "text-xs xl:text-sm text-texto-2 transition-colors"
            }
        >
            <div className="flex items-center gap-3 font-medium text-texto">
                {selecionavel ? (
                    <input
                        type="checkbox"
                        checked={selecionada}
                        onChange={() => aoSelecionar(tarefa.id)}
                        onClick={evento => evento.stopPropagation()}
                        title="Selecionar"
                        className="w-4 h-4 rounded border-borda accent-marca-texto cursor-pointer"
                    />
                ) : (
                    <input
                        type="checkbox"
                        checked={concluida}
                        onChange={alternarConclusao}
                        onClick={evento => evento.stopPropagation()}
                        disabled={!tarefa.permissoes?.status}
                        title={tarefa.permissoes?.status ? "Concluir / reabrir" : "Você só acompanha esta atividade"}
                        className="w-4 h-4 rounded border-borda text-marca-texto focus:ring-marca-texto cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                )}
                <span className="text-texto-suave font-semibold min-w-[36px]">
                    {Formato.codigo(tarefa.id)}
                </span>
                <span>{tarefa.titulo}</span>
            </div>
            <div>{tarefa.responsavel || "Não atribuído"}</div>
            <div className="flex items-center gap-2">
                <span className={`${tamanhoBolinha} rounded-full ${Formato.corPrioridade(tarefa.prioridade)} shrink-0`}></span>
                <span>{Formato.rotuloPrioridade(tarefa.prioridade)}</span>
            </div>
            <div className="text-xs text-texto-suave flex items-center gap-2">
                <span className={atrasada ? "text-perigo font-semibold" : ""}>{Formato.data(tarefa.data_conclusao)}</span>
                {atrasada && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-perigo bg-perigo-fundo border border-perigo-borda px-1.5 py-0.5 rounded">
                        Atrasada
                    </span>
                )}
            </div>
        </div>
    );
}

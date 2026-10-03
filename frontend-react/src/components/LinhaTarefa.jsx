import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";

/* Linha da tabela de atividades */
export default function LinhaTarefa({ tarefa, clicavel = false, aoAlterar }) {
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
        if (clicavel) navigate("/atividades/" + tarefa.id);
    }

    const tamanhoBolinha = clicavel ? "w-3.5 h-3.5" : "w-2.5 h-2.5";

    return (
        <div
            onClick={abrirDetalhes}
            className={
                "grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center p-3.5 " +
                (clicavel ? "px-5 cursor-pointer " : "px-4 ") +
                "text-xs xl:text-sm text-[#3a3a3c] hover:bg-gray-50 transition-colors"
            }
        >
            <div className="flex items-center gap-3 font-medium text-[#1c1c1e]">
                <input
                    type="checkbox"
                    checked={concluida}
                    onChange={alternarConclusao}
                    onClick={evento => evento.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-[#6F0049] focus:ring-[#6F0049] cursor-pointer"
                />
                <span className="text-[#6e6e73] font-semibold min-w-[36px]">
                    {Formato.codigo(tarefa.id)}
                </span>
                <span>{tarefa.titulo}</span>
            </div>
            <div>{tarefa.responsavel || "Não atribuído"}</div>
            <div className="flex items-center gap-2">
                <span className={`${tamanhoBolinha} rounded-full ${Formato.corPrioridade(tarefa.prioridade)} shrink-0`}></span>
                <span>{Formato.rotuloPrioridade(tarefa.prioridade)}</span>
            </div>
            <div className="text-xs text-[#6e6e73]">{Formato.data(tarefa.data_conclusao)}</div>
        </div>
    );
}

import { Formato } from "./formato";

/* Filtros das abas */

export function filtrarTarefas(tarefas, filtro) {
    const agora = new Date();
    const hoje =
        agora.getFullYear() + "-" +
        String(agora.getMonth() + 1).padStart(2, "0") + "-" +
        String(agora.getDate()).padStart(2, "0");
    const ativas = tarefas.filter(function (t) { return t.status !== "cancelado"; });

    if (filtro === "atrasadas") {
        return ativas.filter(function (t) {
            return t.data_conclusao && String(t.data_conclusao).split("T")[0] < hoje && t.status !== "concluido";
        });
    }
    if (!filtro || filtro === "todas") return ativas;
    return ativas.filter(function (t) { return t.status === filtro; });
}

/* Pesquisa */

// "Reunião" -> "reuniao"
export function normalizarTexto(valor) {
    return String(valor == null ? "" : valor)
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().trim();
}

export function pesquisarTarefas(tarefas, termo) {
    const palavras = normalizarTexto(termo).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return tarefas;

    return tarefas.filter(function (t) {
        const textoDaTarefa = normalizarTexto([
            Formato.codigo(t.id), t.id,
            t.titulo, t.descricao, t.responsavel, t.participantes,
            Formato.rotuloPrioridade(t.prioridade), Formato.rotuloStatus(t.status),
            Formato.data(t.data_inicio), Formato.data(t.data_conclusao)
        ].join(" "));

        return palavras.every(function (palavra) {
            return textoDaTarefa.includes(palavra);
        });
    });
}

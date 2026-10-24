import { Formato } from "./formato";

/* Textos do sino */

export function textoDaNotificacao(notificacao) {
    const atividade = Formato.codigo(notificacao.tarefa_id) + ' "' + notificacao.tarefa_titulo + '"';
    const autor = notificacao.autor_nome || "Alguém";

    if (notificacao.tipo === "atribuida") {
        return autor + " atribuiu a você a atividade " + atividade + ".";
    }
    if (notificacao.tipo === "recebida") {
        return autor + " passou para você a atividade " + atividade + ".";
    }
    if (notificacao.tipo === "removida") {
        return autor + " passou a atividade " + atividade + " para " + (notificacao.novo_responsavel || "outra pessoa") + ".";
    }
    if (notificacao.tipo === "atrasada") {
        return "A atividade " + atividade + " passou do prazo (" + Formato.data(notificacao.prazo) + ") e agora é Urgente.";
    }
    return "Atualização na atividade " + atividade + ".";
}

// Quem recebeu a atividade abre os detalhes; de quem ela foi tirada pode não ter mais acesso
export function abreAtividade(notificacao) {
    return notificacao.tipo !== "removida";
}

// "2026-10-17T14:00:00.000Z" -> "há 5 min", "ontem", "12/10"
export function tempoRelativo(valor) {
    if (!valor) return "agora";
    const minutos = Math.floor((Date.now() - new Date(valor).getTime()) / 60000);
    if (minutos < 1) return "agora";
    if (minutos < 60) return "há " + minutos + " min";
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return "há " + horas + " h";
    if (horas < 48) return "ontem";
    return Formato.data(valor).slice(0, 5);
}

import { requisitar } from "./requisicao";

// Sino: o número de não lidas é consultado sempre; a lista, só ao abrir
export const NotificacaoApi = {
    contarNotificacoes() {
        return requisitar("/notificacoes/contagem");
    },
    listarNotificacoes() {
        return requisitar("/notificacoes");
    },
    marcarNotificacaoLida(id) {
        return requisitar("/notificacoes/" + encodeURIComponent(id) + "/lida", { method: "POST" });
    },
    marcarTodasNotificacoesLidas() {
        return requisitar("/notificacoes/lidas", { method: "POST" });
    }
};

import { requisitar } from "./requisicao";

export const FeriadoApi = {
    listarFeriados(ano) {
        return requisitar("/feriados/" + encodeURIComponent(ano));
    }
};

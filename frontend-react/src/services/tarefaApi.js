import { requisitar } from "./requisicao";

export const TarefaApi = {
    listarTarefas() {
        return requisitar("/tarefas");
    },
    buscarTarefa(id) {
        return requisitar("/tarefas/" + encodeURIComponent(id));
    },
    criarTarefa(tarefa) {
        return requisitar("/tarefas", { method: "POST", body: JSON.stringify(tarefa) });
    },
    atualizarTarefa(id, campos) {
        return requisitar("/tarefas/" + encodeURIComponent(id), {
            method: "PUT",
            body: JSON.stringify(campos)
        });
    },
    // Só TI: roda agora a verificação de prazos vencidos (normalmente roda sozinha toda madrugada)
    verificarPrazos() {
        return requisitar("/tarefas/verificar-prazos", { method: "POST" });
    },
    excluirTarefa(id) {
        return requisitar("/tarefas/" + encodeURIComponent(id), { method: "DELETE" });
    }
};

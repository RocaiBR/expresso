import { requisitar } from "./requisicao";

// Manda o arquivo direto para o Storage (sem passar pela API), avisando o progresso de 0 a 1
function enviarParaStorage(url, arquivo, tipo, aoProgredir) {
    return new Promise(function (resolver, rejeitar) {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", tipo);
        xhr.upload.onprogress = function (evento) {
            if (evento.lengthComputable && aoProgredir) aoProgredir(evento.loaded / evento.total);
        };
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) resolver();
            else rejeitar(new Error("Erro " + xhr.status + " ao enviar " + arquivo.name + "."));
        };
        xhr.onerror = function () {
            rejeitar(new Error("Falha de conexão ao enviar " + arquivo.name + "."));
        };
        xhr.send(arquivo);
    });
}

export const AnexoApi = {
    listarAnexos(tarefaId) {
        return requisitar("/tarefas/" + encodeURIComponent(tarefaId) + "/anexos");
    },
    excluirAnexo(tarefaId, anexoId) {
        return requisitar(
            "/tarefas/" + encodeURIComponent(tarefaId) + "/anexos/" + encodeURIComponent(anexoId),
            { method: "DELETE" }
        );
    },
    // 1) a API cria o envio, 2) o navegador manda o arquivo ao Storage, 3) a API confirma o anexo
    async anexarArquivo(tarefaId, arquivo, aoProgredir) {
        const caminho = "/tarefas/" + encodeURIComponent(tarefaId) + "/anexos";
        const inicio = await requisitar(caminho, {
            method: "POST",
            body: JSON.stringify({ nome: arquivo.name, tamanho: arquivo.size })
        });
        await enviarParaStorage(inicio.url_envio, arquivo, inicio.anexo.tipo, aoProgredir);
        return requisitar(caminho + "/" + encodeURIComponent(inicio.anexo.id) + "/concluir", { method: "POST" });
    }
};

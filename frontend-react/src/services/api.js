const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function requisitar(caminho, opcoes) {
    let resposta;
    try {
        resposta = await fetch(BASE_URL + caminho, {
            headers: { "Content-Type": "application/json" },
            ...opcoes
        });
    } catch (erro) {
        throw new Error("Servidor fora do ar. Rode o backend com npm run dev.");
    }

    const dados = await resposta.json().catch(function () { return null; });
    if (!resposta.ok) {
        throw new Error((dados && dados.erro) || "Erro " + resposta.status + " na API.");
    }
    return dados;
}

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

export const Api = {
    login(usuario, senha) {
        return requisitar("/auth/login", {
            method: "POST",
            body: JSON.stringify({ usuario, senha })
        });
    },

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
    },

    listarUsuarios() {
        return requisitar("/usuarios");
    },
    buscarUsuario(id) {
        return requisitar("/usuarios/" + encodeURIComponent(id));
    },
    criarUsuario(usuario) {
        return requisitar("/usuarios", { method: "POST", body: JSON.stringify(usuario) });
    },
    atualizarUsuario(id, campos) {
        return requisitar("/usuarios/" + encodeURIComponent(id), {
            method: "PUT",
            body: JSON.stringify(campos)
        });
    },

    listarFeriados(ano) {
        return requisitar("/feriados/" + encodeURIComponent(ano));
    }
};

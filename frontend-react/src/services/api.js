const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// O token do login fica guardado junto com o usuário logado (ver AuthContext)
export const CHAVE_SESSAO = "usuarioLogado";

function tokenDaSessao() {
    try {
        const sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null");
        return sessao ? sessao.token : null;
    } catch (erro) {
        return null;
    }
}

async function requisitar(caminho, opcoes) {
    const token = tokenDaSessao();
    const cabecalhos = { "Content-Type": "application/json" };
    if (token) cabecalhos.Authorization = "Bearer " + token;

    let resposta;
    try {
        resposta = await fetch(BASE_URL + caminho, { ...opcoes, headers: cabecalhos });
    } catch (erro) {
        throw new Error("Servidor fora do ar. Rode o backend com npm run dev.");
    }

    // Sessão vencida ou derrubada (senha trocada, usuário desativado): volta para o login
    if (resposta.status === 401 && token) {
        sessionStorage.removeItem(CHAVE_SESSAO);
        window.location.assign("/login");
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
    sair() {
        return requisitar("/auth/sair", { method: "POST" });
    },
    solicitarRecuperacao(email) {
        return requisitar("/auth/recuperar-senha", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    },
    redefinirSenha(email, codigo, novaSenha) {
        return requisitar("/auth/redefinir-senha", {
            method: "POST",
            body: JSON.stringify({ email, codigo, nova_senha: novaSenha })
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
    excluirTarefa(id) {
        return requisitar("/tarefas/" + encodeURIComponent(id), { method: "DELETE" });
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

    // Quem o usuário logado pode escolher como responsável de uma atividade
    listarAtribuiveis() {
        return requisitar("/usuarios/atribuiveis");
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
    excluirUsuario(id) {
        return requisitar("/usuarios/" + encodeURIComponent(id), { method: "DELETE" });
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

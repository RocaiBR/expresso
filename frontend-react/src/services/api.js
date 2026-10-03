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

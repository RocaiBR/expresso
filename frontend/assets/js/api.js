const Api = (function () {
    const BASE_URL = "http://localhost:3000";

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

    return {
        listarTarefas: function () {
            return requisitar("/tarefas");
        },
        buscarTarefa: function (id) {
            return requisitar("/tarefas/" + encodeURIComponent(id));
        },
        criarTarefa: function (tarefa) {
            return requisitar("/tarefas", { method: "POST", body: JSON.stringify(tarefa) });
        },
        atualizarTarefa: function (id, campos) {
            return requisitar("/tarefas/" + encodeURIComponent(id), {
                method: "PUT",
                body: JSON.stringify(campos)
            });
        }
    };
})();

/* Conversões entre o banco e a tela */

const Formato = {
    // 7 -> "#007"
    codigo: function (id) {
        return "#" + String(id).padStart(3, "0");
    },

    // "2026-06-09" (ou "2026-06-09T03:00:00.000Z") -> "09/06/2026"
    data: function (valor) {
        if (!valor) return "—";
        const [ano, mes, dia] = String(valor).split("T")[0].split("-");
        if (!dia) return valor;
        return dia + "/" + mes + "/" + ano;
    },

    prioridade: {
        // valor do banco
        rotulo: { baixo: "Baixo", medio: "Médio", alto: "Alto", urgente: "Urgente" },
        cor: {
            baixo: "bg-[#AEB0B7]",
            medio: "bg-[#54565B]",
            alto: "bg-[#6F0049]",
            urgente: "bg-[#6F0049]"
        },
        // texto do formulário
        doFormulario: { "Baixa": "baixo", "Média": "medio", "Alta": "alto", "Urgente": "urgente" }
    },

    status: {
        rotulo: {
            "pendente": "Pendente",
            "em andamento": "Em andamento",
            "concluido": "Concluída",
            "cancelado": "Cancelada"
        }
    },

    rotuloPrioridade: function (valor) {
        return this.prioridade.rotulo[valor] || "Médio";
    },
    corPrioridade: function (valor) {
        return this.prioridade.cor[valor] || "bg-[#54565B]";
    },
    rotuloStatus: function (valor) {
        return this.status.rotulo[valor] || "Pendente";
    },

    // Evita que um título com "<" quebre o HTML da tabela
    texto: function (valor) {
        return String(valor == null ? "" : valor)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
};

/* Linha da tabela de atividades */

function montarLinhaTarefa(tarefa, opcoes) {
    opcoes = opcoes || {};
    const linha = document.createElement("div");
    linha.className =
        "grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center p-3.5 " +
        (opcoes.clicavel ? "px-5 cursor-pointer " : "px-4 ") +
        "text-xs xl:text-sm text-[#3a3a3c] hover:bg-gray-50 transition-colors";
    linha.dataset.id = tarefa.id;

    const tamanhoBolinha = opcoes.clicavel ? "w-3.5 h-3.5" : "w-2.5 h-2.5";

    linha.innerHTML = `
        <div class="flex items-center gap-3 font-medium text-[#1c1c1e]">
            <input type="checkbox" ${tarefa.status === "concluido" ? "checked" : ""}
                class="w-4 h-4 rounded border-gray-300 text-[#6F0049] focus:ring-[#6F0049] cursor-pointer">
            <span class="text-[#6e6e73] font-semibold min-w-[36px]">${Formato.codigo(tarefa.id)}</span>
            <span>${Formato.texto(tarefa.titulo)}</span>
        </div>
        <div>${Formato.texto(tarefa.responsavel || "Não atribuído")}</div>
        <div class="flex items-center gap-2">
            <span class="${tamanhoBolinha} rounded-full ${Formato.corPrioridade(tarefa.prioridade)} shrink-0"></span>
            <span>${Formato.rotuloPrioridade(tarefa.prioridade)}</span>
        </div>
        <div class="text-xs text-[#6e6e73]">${Formato.data(tarefa.data_conclusao)}</div>
    `;

    // Marcar o checkbox conclui a tarefa no banco
    const checkbox = linha.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("click", async function (evento) {
        evento.stopPropagation();
        const novoStatus = checkbox.checked ? "concluido" : "pendente";
        try {
            await Api.atualizarTarefa(tarefa.id, { status: novoStatus });
            tarefa.status = novoStatus;
            if (opcoes.aoAlterar) opcoes.aoAlterar();
        } catch (erro) {
            checkbox.checked = !checkbox.checked;
            alert("Não foi possível atualizar: " + erro.message);
        }
    });

    if (opcoes.clicavel) {
        linha.addEventListener("click", function () {
            window.location.href = "detalhes.html?id=" + tarefa.id;
        });
    }

    return linha;
}

// Mensagem dentro da tabela
function mensagemNaTabela(container, texto) {
    const aviso = document.createElement("div");
    aviso.className = "p-6 text-center text-sm text-[#6e6e73]";
    aviso.textContent = texto;
    container.appendChild(aviso);
}

// Filtros das abas
function filtrarTarefas(tarefas, filtro) {
    const agora = new Date();
    const hoje = agora.getFullYear() + "-" + String(agora.getMonth() + 1).padStart(2, "0") + "-" + String(agora.getDate()).padStart(2, "0");
    const ativas = tarefas.filter(function (t) { return t.status !== "cancelado"; });

    if (filtro === "atrasadas") {
        return ativas.filter(function (t) {
            return t.data_conclusao && String(t.data_conclusao).split("T")[0] < hoje && t.status !== "concluido";
        });
    }
    if (!filtro || filtro === "todas") return ativas;
    return ativas.filter(function (t) { return t.status === filtro; });
}

/* Pesquisa  */

function normalizarTexto(valor) {
    return String(valor == null ? "" : valor)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();
}

function pesquisarTarefas(tarefas, termo) {
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
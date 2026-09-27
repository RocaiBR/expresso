<<<<<<< HEAD
const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async function () {
    mostrarUsuarioLogado();
    montarCalendario(new Date());
    await carregarAtividades();
    configurarAbas();
});

/* ===== SAUDAÇÃO "Isadora : PCP" ===== */
function mostrarUsuarioLogado() {
    const dados = sessionStorage.getItem("usuarioLogado");
    if (!dados) return;

    const usuario = JSON.parse(dados);
    document.getElementById("nome-logado").textContent = usuario.nome || "Usuário";

    if (usuario.cargo) {
        document.getElementById("cargo-logado").textContent = usuario.cargo;
        document.getElementById("separador-cargo").style.display = "inline";
    }
}

/* ===== CALENDÁRIO ===== */
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
let mesExibido;

function montarCalendario(data) {
     if (!document.getElementById("calendario-grade")) return;
    mesExibido = new Date(data.getFullYear(), data.getMonth(), 1);
    renderizarCalendario();

    document.getElementById("calendario-anterior").addEventListener("click", function () {
        mesExibido.setMonth(mesExibido.getMonth() - 1);
        renderizarCalendario();
    });
    document.getElementById("calendario-proximo").addEventListener("click", function () {
        mesExibido.setMonth(mesExibido.getMonth() + 1);
        renderizarCalendario();
    });
}

function renderizarCalendario() {
    const hoje = new Date();
    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();

    document.getElementById("calendario-mes-ano").textContent = `${MESES[mes]} de ${ano}`;

    const grade = document.getElementById("calendario-grade");
    grade.innerHTML = "";


    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(ano, mes, 0).getDate();

    // dias do mês anterior (preenchimento)
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
        grade.appendChild(criarCelulaDia(totalDiasMesAnterior - i, true));
    }
    // dias do mês atual
    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const ehHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
        grade.appendChild(criarCelulaDia(dia, false, ehHoje));
    }
    // completa a última semana com dias do próximo mês
    const totalCelulas = grade.children.length;
    const restante = (7 - (totalCelulas % 7)) % 7;
    for (let dia = 1; dia <= restante; dia++) {
        grade.appendChild(criarCelulaDia(dia, true));
    }
}

function criarCelulaDia(numero, foraDoMes, ehHoje) {
    const celula = document.createElement("div");
    celula.textContent = numero;
    if (foraDoMes) celula.classList.add("fora-do-mes");
    if (ehHoje) celula.classList.add("dia-atual");
    return celula;
}

/* ===== CARDS + TABELA DE ATIVIDADES ===== */
let todasAsTarefas = [];

async function carregarAtividades() {
    try {
        const resposta = await fetch(`${API_URL}/tarefas`);
        todasAsTarefas = await resposta.json();
        atualizarContadores();
        renderizarTabela(todasAsTarefas);
    } catch (erro) {
        console.error("Erro ao carregar tarefas:", erro);
        document.getElementById("mensagem-vazio").textContent = "Não foi possível conectar ao servidor.";
        document.getElementById("mensagem-vazio").style.display = "block";
    }
}

function atualizarContadores() {
    if (!document.getElementById("contagem-total")) return;
    document.getElementById("contagem-total").textContent = todasAsTarefas.length;
    document.getElementById("contagem-concluido").textContent =
        todasAsTarefas.filter(t => t.status === "concluido").length;
    document.getElementById("contagem-andamento").textContent =
        todasAsTarefas.filter(t => t.status === "em andamento").length;
    document.getElementById("contagem-pendente").textContent =
        todasAsTarefas.filter(t => t.status === "pendente").length;
}

function renderizarTabela(lista) {
    const corpo = document.getElementById("corpo-tabela-atividades");
    const mensagemVazio = document.getElementById("mensagem-vazio");
    corpo.innerHTML = "";

    if (lista.length === 0) {
        mensagemVazio.style.display = "block";
        return;
    }
    mensagemVazio.style.display = "none";

    lista.forEach(tarefa => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td><input type="checkbox" ${tarefa.status === "concluido" ? "checked" : ""}></td>
            <td>${tarefa.titulo}</td>
            <td>${tarefa.responsavel || "—"}</td>
            <td>${badgePrioridade(tarefa.prioridade)}</td>
            <td>${formatarData(tarefa.data_conclusao)}</td>
        `;
        corpo.appendChild(linha);
    });
}

function badgePrioridade(prioridade) {
    const classe = "prioridade-" + (prioridade || "medio").toLowerCase();
    const texto = { alto: "Alto", medio: "Médio", baixo: "Baixo", urgente: "Urgente" }[prioridade] || "Médio";
    return `<span class="badge-prioridade ${classe}"><i></i>${texto}</span>`;
}

function formatarData(data) {
    if (!data) return "—";
    const [ano, mes, dia] = data.split("T")[0].split("-");
    return `${dia}/${mes}/${ano}`;
}

/* ===== ABAS (Todas / Pendentes / Em andamento / Concluídas) ===== */
function configurarAbas() {
    document.querySelectorAll(".aba").forEach(botao => {
        botao.addEventListener("click", function () {
            document.querySelectorAll(".aba").forEach(b => b.classList.remove("ativa"));
            botao.classList.add("ativa");

            const status = botao.dataset.status;
            const filtradas = status ? todasAsTarefas.filter(t => t.status === status) : todasAsTarefas;
            renderizarTabela(filtradas);
        });
    });
}
=======
localStorage.getItem('ultima_atividade_criada')
>>>>>>> 900620a2d20b83983f9fa941f4a8f1c8b387e67b

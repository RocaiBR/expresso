/* =====================================================
   RELATÓRIOS — dados de atividades e pessoas + gráficos
===================================================== */

const API_URL = "http://localhost:3000";

/* Paleta baseada no tema do Figma/projeto */
const CORES = {
    vinho: "#6F0049",
    vinhoClaro: "rgba(111, 0, 73, 0.15)",
    vinhoMedio: "#9C3F7C",
    cinza: "#54565B",
    cinzaClaro: "#B9B9BE",
    lilas: "#C48FB0",
    dourado: "#C99A3E",
    verde: "#3E8E5A",
    azul: "#4472C4",
    grade: [
        "#6F0049", "#9C3F7C", "#C48FB0", "#54565B",
        "#C99A3E", "#4472C4", "#3E8E5A", "#8e8e93"
    ]
};

/* =====================================================
   1. GERADOR DE DADOS (mock rico + tentativa de dados reais)
===================================================== */

/* PRNG determinístico para os gráficos ficarem sempre "bonitos"
   (mesma aparência a cada carregamento, em vez de mudar aleatoriamente) */
function criarGeradorAleatorio(semente) {
    return function () {
        semente |= 0;
        semente = (semente + 0x6D2B79F5) | 0;
        let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const aleatorio = criarGeradorAleatorio(42);

const PESSOAS = [
    "Isadora Cabral dos Santos",
    "Maiko Fernandes",
    "Ícaro Guminiak de Godoy",
    "Ana Beatriz Rocha",
    "Rafael Souza Lima",
    "Camila Duarte",
    "Bruno Almeida",
    "Equipe"
];

const PROJETOS = [
    "Sistema PI",
    "App Mobile",
    "Integração ERP",
    "Portal do Cliente"
];

const STATUS = ["pendente", "em_andamento", "concluido"];
const PRIORIDADES = ["baixo", "medio", "alto", "urgente"];

const NOMES_STATUS = {
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluído"
};

const NOMES_PRIORIDADE = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    urgente: "Urgente"
};

/* Gera uma base de ~140 atividades espalhadas nos últimos 6 meses,
   já que a tabela "tarefas" do banco não guarda prioridade/projeto/datas.
   Isso garante gráficos ricos independente do que existir na API. */
function gerarAtividadesMock(quantidade) {
    const hoje = new Date();
    const atividades = [];

    const titulos = [
        "Reunião com equipe", "Revisão de desenhos", "Entrega do planejamento",
        "Ajuste de layout", "Correção de bug", "Levantamento de requisitos",
        "Testes de integração", "Atualização de documentação",
        "Configuração de ambiente", "Validação com cliente",
        "Modelagem de dados", "Deploy da versão", "Análise de indicadores",
        "Treinamento da equipe", "Manutenção preventiva"
    ];

    for (let i = 0; i < quantidade; i++) {
        const diasAtras = Math.floor(aleatorio() * 180);
        const criado = new Date(hoje);
        criado.setDate(criado.getDate() - diasAtras);

        const status = STATUS[Math.floor(aleatorio() * STATUS.length)];

        // tarefas concluídas levam de 1 a 12 dias para fechar
        let concluidoEm = null;
        if (status === "concluido") {
            const duracao = 1 + Math.floor(aleatorio() * 11);
            concluidoEm = new Date(criado);
            concluidoEm.setDate(concluidoEm.getDate() + duracao);
            if (concluidoEm > hoje) concluidoEm = new Date(hoje);
        }

        atividades.push({
            id: i + 1,
            titulo: titulos[Math.floor(aleatorio() * titulos.length)],
            responsavel: PESSOAS[Math.floor(aleatorio() * PESSOAS.length)],
            projeto: PROJETOS[Math.floor(aleatorio() * PROJETOS.length)],
            status: status,
            prioridade: PRIORIDADES[Math.floor(aleatorio() * PRIORIDADES.length)],
            criado_em: criado,
            concluido_em: concluidoEm
        });
    }

    return atividades;
}

let BASE_ATIVIDADES = gerarAtividadesMock(140);

/* Tenta puxar usuários reais da API para enriquecer o filtro de
   responsáveis (não quebra a página se a API estiver offline) */
async function tentarCarregarUsuariosReais() {
    try {
        const resposta = await fetch(API_URL + "/usuarios");
        if (!resposta.ok) return;

        const usuarios = await resposta.json();
        if (Array.isArray(usuarios) && usuarios.length > 0) {
            usuarios.forEach(function (usuario) {
                if (usuario.nome && !PESSOAS.includes(usuario.nome)) {
                    PESSOAS.push(usuario.nome);
                }
            });
        }
    } catch (erro) {
        // API offline: seguimos só com os dados mock, sem travar a tela
        console.warn("Não foi possível carregar usuários reais:", erro.message);
    }
}

/* =====================================================
   2. ESTADO DOS FILTROS
===================================================== */

const filtrosAtuais = {
    dias: 90,
    projeto: "todos",
    responsavel: "todos",
    status: "todos",
    prioridade: "todos"
};

function aplicarFiltros(atividades) {
    const limite = new Date();
    limite.setDate(limite.getDate() - filtrosAtuais.dias);

    return atividades.filter(function (atividade) {
        if (atividade.criado_em < limite) return false;
        if (filtrosAtuais.projeto !== "todos" && atividade.projeto !== filtrosAtuais.projeto) return false;
        if (filtrosAtuais.responsavel !== "todos" && atividade.responsavel !== filtrosAtuais.responsavel) return false;
        if (filtrosAtuais.status !== "todos" && atividade.status !== filtrosAtuais.status) return false;
        if (filtrosAtuais.prioridade !== "todos" && atividade.prioridade !== filtrosAtuais.prioridade) return false;
        return true;
    });
}

/* =====================================================
   3. FUNÇÕES DE AGREGAÇÃO
===================================================== */

function formatarDataCurta(data) {
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function calcularBacklog(atividades, granularidade) {
    const passos = granularidade === "semana" ? 12 : 14;
    const incremento = granularidade === "semana" ? 7 : 1;

    const rotulos = [];
    const valores = [];
    const hoje = new Date();

    for (let i = passos - 1; i >= 0; i--) {
        const dataRef = new Date(hoje);
        dataRef.setDate(dataRef.getDate() - i * incremento);

        const abertas = atividades.filter(function (atividade) {
            const criadoAntes = atividade.criado_em <= dataRef;
            const aindaAberta = !atividade.concluido_em || atividade.concluido_em > dataRef;
            return criadoAntes && aindaAberta;
        }).length;

        rotulos.push(formatarDataCurta(dataRef));
        valores.push(abertas);
    }

    return { rotulos, valores };
}

function calcularTempoMedioPorMes(atividades) {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const hoje = new Date();
    const rotulos = [];
    const valores = [];

    for (let i = 5; i >= 0; i--) {
        const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);

        const concluidasNoMes = atividades.filter(function (atividade) {
            return atividade.concluido_em &&
                atividade.concluido_em.getMonth() === referencia.getMonth() &&
                atividade.concluido_em.getFullYear() === referencia.getFullYear();
        });

        let media = 0;
        if (concluidasNoMes.length > 0) {
            const somaDias = concluidasNoMes.reduce(function (soma, atividade) {
                const diffMs = atividade.concluido_em - atividade.criado_em;
                return soma + diffMs / (1000 * 60 * 60 * 24);
            }, 0);
            media = somaDias / concluidasNoMes.length;
        }

        rotulos.push(meses[referencia.getMonth()]);
        valores.push(Number(media.toFixed(1)));
    }

    return { rotulos, valores };
}

function calcularCriadasConcluidasPorSemana(atividades) {
    const hoje = new Date();
    const rotulos = [];
    const criadas = [];
    const concluidas = [];

    for (let i = 7; i >= 0; i--) {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(inicioSemana.getDate() - (i * 7) - 6);
        const fimSemana = new Date(hoje);
        fimSemana.setDate(fimSemana.getDate() - (i * 7));

        const criadasNaSemana = atividades.filter(function (atividade) {
            return atividade.criado_em >= inicioSemana && atividade.criado_em <= fimSemana;
        }).length;

        const concluidasNaSemana = atividades.filter(function (atividade) {
            return atividade.concluido_em &&
                atividade.concluido_em >= inicioSemana &&
                atividade.concluido_em <= fimSemana;
        }).length;

        rotulos.push(formatarDataCurta(fimSemana));
        criadas.push(criadasNaSemana);
        concluidas.push(concluidasNaSemana);
    }

    return { rotulos, criadas, concluidas };
}

function calcularPorResponsavel(atividades) {
    const contagem = {};
    atividades.forEach(function (atividade) {
        contagem[atividade.responsavel] = (contagem[atividade.responsavel] || 0) + 1;
    });

    const ordenado = Object.entries(contagem).sort(function (a, b) { return b[1] - a[1]; });

    return {
        rotulos: ordenado.map(function (item) { return item[0]; }),
        valores: ordenado.map(function (item) { return item[1]; })
    };
}

function calcularPorStatus(atividades) {
    const contagem = { pendente: 0, em_andamento: 0, concluido: 0 };
    atividades.forEach(function (atividade) { contagem[atividade.status]++; });

    return {
        rotulos: STATUS.map(function (chave) { return NOMES_STATUS[chave]; }),
        valores: STATUS.map(function (chave) { return contagem[chave]; })
    };
}

function calcularPorPrioridade(atividades) {
    const contagem = { baixo: 0, medio: 0, alto: 0, urgente: 0 };
    atividades.forEach(function (atividade) { contagem[atividade.prioridade]++; });

    return {
        rotulos: PRIORIDADES.map(function (chave) { return NOMES_PRIORIDADE[chave]; }),
        valores: PRIORIDADES.map(function (chave) { return contagem[chave]; })
    };
}

/* =====================================================
   4. GRÁFICOS (Chart.js)
===================================================== */

let graficos = {};

function destruirGraficoSeExistir(chave) {
    if (graficos[chave]) {
        graficos[chave].destroy();
    }
}

function montarGraficoBacklog(dados) {
    destruirGraficoSeExistir("backlog");
    const ctx = document.getElementById("grafico-backlog");

    graficos.backlog = new Chart(ctx, {
        type: "line",
        data: {
            labels: dados.rotulos,
            datasets: [{
                label: "Atividades em aberto",
                data: dados.valores,
                borderColor: CORES.vinho,
                backgroundColor: CORES.vinhoClaro,
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: CORES.vinho
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: "#eee" } },
                x: { grid: { display: false } }
            }
        }
    });
}

function montarGraficoTempoMedio(dados) {
    destruirGraficoSeExistir("tempoMedio");
    const ctx = document.getElementById("grafico-tempo-medio");

    graficos.tempoMedio = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dados.rotulos,
            datasets: [{
                label: "Média de dias",
                data: dados.valores,
                backgroundColor: CORES.vinho,
                borderRadius: 6,
                maxBarThickness: 46
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: false
            },
            scales: {
                y: { beginAtZero: true, grid: { color: "#eee" } },
                x: { grid: { display: false } }
            }
        }
    });
}

function montarGraficoCriadasConcluidas(dados) {
    destruirGraficoSeExistir("criadasConcluidas");
    const ctx = document.getElementById("grafico-criadas-concluidas");

    graficos.criadasConcluidas = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dados.rotulos,
            datasets: [
                {
                    label: "Criadas",
                    data: dados.criadas,
                    backgroundColor: CORES.cinzaClaro,
                    borderRadius: 6,
                    maxBarThickness: 26
                },
                {
                    label: "Concluídas",
                    data: dados.concluidas,
                    backgroundColor: CORES.vinho,
                    borderRadius: 6,
                    maxBarThickness: 26
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: {
                y: { beginAtZero: true, grid: { color: "#eee" } },
                x: { grid: { display: false } }
            }
        }
    });
}

function montarGraficoPessoas(dados) {
    destruirGraficoSeExistir("pessoas");
    const ctx = document.getElementById("grafico-pessoas");

    graficos.pessoas = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dados.rotulos,
            datasets: [{
                label: "Atividades",
                data: dados.valores,
                backgroundColor: CORES.grade,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: "#eee" } },
                y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

function montarGraficoStatus(dados) {
    destruirGraficoSeExistir("status");
    const ctx = document.getElementById("grafico-status");

    graficos.status = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: dados.rotulos,
            datasets: [{
                data: dados.valores,
                backgroundColor: [CORES.cinzaClaro, CORES.vinhoMedio, CORES.vinho],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }
        }
    });
}

function montarGraficoPrioridade(dados) {
    destruirGraficoSeExistir("prioridade");
    const ctx = document.getElementById("grafico-prioridade");

    graficos.prioridade = new Chart(ctx, {
        type: "pie",
        data: {
            labels: dados.rotulos,
            datasets: [{
                data: dados.valores,
                backgroundColor: [CORES.cinzaClaro, CORES.dourado, CORES.vinhoMedio, CORES.vinho],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }
        }
    });
}

/* =====================================================
   5. RESUMO DO PERÍODO
===================================================== */

function atualizarResumo(atividades) {
    const total = atividades.length;
    const concluidas = atividades.filter(function (a) { return a.status === "concluido"; }).length;
    const mediaDia = (total / filtrosAtuais.dias).toFixed(1);

    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - filtrosAtuais.dias);

    const porPessoa = calcularPorResponsavel(atividades);
    const destaque = porPessoa.rotulos.length > 0 ? porPessoa.rotulos[0] : "—";

    document.getElementById("resumo-periodo").textContent =
        formatarDataCurta(inicio) + " - " + formatarDataCurta(hoje);
    document.getElementById("resumo-total").textContent = total;
    document.getElementById("resumo-concluidas").textContent = concluidas;
    document.getElementById("resumo-media-dia").textContent = mediaDia;
    document.getElementById("resumo-destaque").textContent = destaque;
}

/* =====================================================
   6. RENDERIZAÇÃO GERAL
===================================================== */

function renderizarTudo() {
    const granularidade = document.getElementById("granularidade-backlog").value;
    const atividadesFiltradas = aplicarFiltros(BASE_ATIVIDADES);

    montarGraficoBacklog(calcularBacklog(atividadesFiltradas, granularidade));
    montarGraficoTempoMedio(calcularTempoMedioPorMes(atividadesFiltradas));
    montarGraficoCriadasConcluidas(calcularCriadasConcluidasPorSemana(atividadesFiltradas));
    montarGraficoPessoas(calcularPorResponsavel(atividadesFiltradas));
    montarGraficoStatus(calcularPorStatus(atividadesFiltradas));
    montarGraficoPrioridade(calcularPorPrioridade(atividadesFiltradas));

    atualizarResumo(atividadesFiltradas);
}

/* =====================================================
   7. PREENCHER SELECTS DE FILTRO
===================================================== */

function preencherSelect(id, opcoes) {
    const select = document.getElementById(id);
    opcoes.forEach(function (opcao) {
        const elemento = document.createElement("option");
        elemento.value = opcao;
        elemento.textContent = opcao;
        select.appendChild(elemento);
    });
}

/* =====================================================
   8. EXPORTAR CSV
===================================================== */

function exportarCsv() {
    const atividades = aplicarFiltros(BASE_ATIVIDADES);

    let csv = "titulo;responsavel;projeto;status;prioridade;criado_em;concluido_em\n";
    atividades.forEach(function (a) {
        csv += [
            a.titulo,
            a.responsavel,
            a.projeto,
            NOMES_STATUS[a.status],
            NOMES_PRIORIDADE[a.prioridade],
            a.criado_em.toLocaleDateString("pt-BR"),
            a.concluido_em ? a.concluido_em.toLocaleDateString("pt-BR") : ""
        ].join(";") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio-atividades.csv";
    link.click();
}

/* =====================================================
   9. INICIALIZAÇÃO
===================================================== */

document.addEventListener("DOMContentLoaded", async function () {

    await tentarCarregarUsuariosReais();

    preencherSelect("filtro-projeto", PROJETOS);
    preencherSelect("filtro-responsavel", PESSOAS);

    renderizarTudo();

    document.getElementById("granularidade-backlog").addEventListener("change", renderizarTudo);

    document.getElementById("filtro-periodo").addEventListener("change", function (evento) {
        filtrosAtuais.dias = Number(evento.target.value);
        renderizarTudo();
    });

    document.getElementById("btn-aplicar-filtros").addEventListener("click", function () {
        filtrosAtuais.projeto = document.getElementById("filtro-projeto").value;
        filtrosAtuais.responsavel = document.getElementById("filtro-responsavel").value;
        filtrosAtuais.status = document.getElementById("filtro-status").value;
        filtrosAtuais.prioridade = document.getElementById("filtro-prioridade").value;
        renderizarTudo();
    });

    document.getElementById("btn-limpar-filtros").addEventListener("click", function () {
        filtrosAtuais.projeto = "todos";
        filtrosAtuais.responsavel = "todos";
        filtrosAtuais.status = "todos";
        filtrosAtuais.prioridade = "todos";

        document.getElementById("filtro-projeto").value = "todos";
        document.getElementById("filtro-responsavel").value = "todos";
        document.getElementById("filtro-status").value = "todos";
        document.getElementById("filtro-prioridade").value = "todos";

        renderizarTudo();
    });

    document.getElementById("btn-exportar").addEventListener("click", exportarCsv);

});
import Chart from "chart.js/auto";
import { FeriadoApi } from "../services/feriadoApi";
import { Formato } from "./formato";
import {
    STATUS_FINAIS, baixarArquivo, calcularBacklog, chaveDoDia, dataDaChave, diaLocal, formatarDia, formatarNumero, somarDias
} from "./relatorios";

/* Exportação do relatório em Excel, Power BI e PDF.
   As bibliotecas (write-excel-file e jsPDF) só são baixadas quando alguém exporta.

   "relatorio" vem da tela de Relatórios:
   { periodo, filtros, granularidade, estatistica, tarefas (as do período, com os filtros),
     tarefasFiltradas (todas com os filtros, para o backlog), backlog, tempo, resumo } */

const COR_MARCA = "#6F0049";
const COR_MARCA_RGB = [111, 0, 73];
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const DIAS_DA_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/* =====================================================
   1. DADOS COMUNS
===================================================== */

// Datas puras vão ao Excel em UTC: assim a célula mostra o mesmo dia em qualquer fuso
function dataExcel(chave) {
    if (!chave) return null;
    const [ano, mes, dia] = chave.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
}

function diasParaConcluir(tarefa) {
    if (tarefa.status !== "concluido" || !tarefa.criado_em || !tarefa.finalizado_em) return null;
    const dias = (new Date(tarefa.finalizado_em) - new Date(tarefa.criado_em)) / UM_DIA_MS;
    return Math.round(Math.max(0, dias) * 10) / 10;
}

function dentroDoPeriodo(chave, periodo) {
    return Boolean(chave) && chave >= periodo.inicio && chave <= periodo.fim;
}

function descreverPeriodo(periodo) {
    return formatarDia(periodo.inicio) + " a " + formatarDia(periodo.fim);
}

function descreverFiltros(filtros) {
    return [
        "Responsável: " + (filtros.responsavel === "todos" ? "todos" : filtros.responsavel),
        "Status: " + (filtros.status === "todos" ? "todos" : Formato.rotuloStatus(filtros.status)),
        "Prioridade: " + (filtros.prioridade === "todos" ? "todas" : Formato.rotuloPrioridade(filtros.prioridade))
    ].join(" · ");
}

function agora() {
    return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function nomeDoArquivo(relatorio, sufixo, extensao) {
    return `relatorio-atividades${sufixo}_${relatorio.periodo.inicio}_${relatorio.periodo.fim}.${extensao}`;
}

// [rótulo, valor, decimal]; o valor é número quando existe, ou um texto explicando a ausência
function indicadores(relatorio) {
    const { tarefas, periodo, resumo } = relatorio;
    const concluidas = tarefas.filter(tarefa =>
        tarefa.status === "concluido" && dentroDoPeriodo(diaLocal(tarefa.finalizado_em), periodo)
    ).length;
    return [
        ["Atividades no período (com os filtros)", tarefas.length],
        ["Criadas no período", resumo.criadas],
        ["Concluídas no período", concluidas],
        ["Em aberto no fim do período", resumo.emAberto],
        ["Dias úteis", resumo.diasUteis ?? "indisponível (feriados não carregados)"],
        ["Média de atividades criadas por dia útil", resumo.mediaPorDia ?? "indisponível", true]
    ];
}

function textoDoValor(valor, decimal) {
    if (typeof valor !== "number") return valor;
    return decimal || !Number.isInteger(valor) ? formatarNumero(valor) : String(valor);
}

function rotuloEstatistica(estatistica) {
    return estatistica === "mediana" ? "Mediana (dias)" : "Média (dias)";
}

/* =====================================================
   2. EXCEL (relatório para ler)
===================================================== */

const cabecalho = texto => ({ value: texto, fontWeight: "bold", textColor: "#FFFFFF", backgroundColor: COR_MARCA });

export async function exportarExcel(relatorio) {
    const { default: escreverExcel } = await import("write-excel-file/browser");
    const { periodo, filtros, tarefas, backlog, tempo, granularidade, estatistica } = relatorio;

    const resumo = [
        [{ value: "Relatório de atividades - Expresso", fontWeight: "bold", fontSize: 14 }],
        ["Período", descreverPeriodo(periodo)],
        ["Filtros", descreverFiltros(filtros)],
        ["Gerado em", agora()],
        [null],
        [cabecalho("Indicador"), cabecalho("Valor")],
        ...indicadores(relatorio).map(([rotulo, valor, decimal]) => [
            rotulo,
            typeof valor === "number" ? { value: valor, format: decimal || !Number.isInteger(valor) ? "0.0" : "0" } : valor
        ])
    ];

    const atividades = [
        ["Código", "Título", "Responsável", "Participantes", "Status", "Prioridade", "Atrasada",
            "Criada em", "Início", "Vencimento", "Finalizada em", "Dias para concluir"].map(cabecalho),
        ...tarefas.map(tarefa => [
            Formato.codigo(tarefa.id),
            tarefa.titulo,
            tarefa.responsavel || "",
            tarefa.participantes || "",
            Formato.rotuloStatus(tarefa.status),
            Formato.rotuloPrioridade(tarefa.prioridade),
            tarefa.atrasada ? "Sim" : "Não",
            dataExcel(diaLocal(tarefa.criado_em)),
            dataExcel(tarefa.data_inicio),
            dataExcel(tarefa.data_conclusao),
            dataExcel(diaLocal(tarefa.finalizado_em)),
            diasParaConcluir(tarefa)
        ])
    ];

    const linhasBacklog = [
        [cabecalho(granularidade === "semana" ? "Semana até" : "Dia"), cabecalho("Atividades em aberto")],
        ...backlog.dias.map((dia, indice) => [dataExcel(dia), backlog.valores[indice]])
    ];

    const linhasTempo = [
        [cabecalho("Mês"), cabecalho(rotuloEstatistica(estatistica)), cabecalho("Atividades concluídas")],
        ...tempo.titulos.map((titulo, indice) => [titulo, tempo.valores[indice], tempo.quantidades[indice]])
    ];

    const blob = await escreverExcel([
        { data: resumo, sheet: "Resumo", columns: [{ width: 42 }, { width: 70 }] },
        {
            data: atividades, sheet: "Atividades", stickyRowsCount: 1, dateFormat: "dd/mm/yyyy",
            columns: [{ width: 9 }, { width: 40 }, { width: 22 }, { width: 30 }, { width: 14 }, { width: 11 }, { width: 9 },
                { width: 12 }, { width: 12 }, { width: 12 }, { width: 13 }, { width: 10 }]
        },
        { data: linhasBacklog, sheet: "Backlog", stickyRowsCount: 1, dateFormat: "dd/mm/yyyy", columns: [{ width: 14 }, { width: 20 }] },
        { data: linhasTempo, sheet: "Tempo de conclusão", stickyRowsCount: 1, columns: [{ width: 20 }, { width: 16 }, { width: 22 }] }
    ], { fontFamily: "Calibri", fontSize: 11 }).toBlob();

    baixarArquivo(blob, nomeDoArquivo(relatorio, "", "xlsx"));
}

/* =====================================================
   3. POWER BI (tabelas prontas para o modelo de dados)
===================================================== */

// Uma linha por dia, cobrindo o período e todas as datas das atividades exportadas
async function montarCalendario(relatorio) {
    const { periodo, tarefas } = relatorio;
    const datas = [
        periodo.inicio, periodo.fim,
        ...tarefas.flatMap(tarefa => [diaLocal(tarefa.criado_em), tarefa.data_inicio, tarefa.data_conclusao, diaLocal(tarefa.finalizado_em)])
    ].filter(Boolean).sort();
    const inicio = datas[0];
    const fim = datas[datas.length - 1];

    const anos = [];
    for (let ano = Number(inicio.slice(0, 4)); ano <= Number(fim.slice(0, 4)); ano++) anos.push(String(ano));
    const feriados = new Map();
    const anosSemFeriados = [];
    await Promise.all(anos.map(async ano => {
        try {
            (await FeriadoApi.listarFeriados(ano)).forEach(feriado => feriados.set(feriado.date, feriado.name));
        } catch {
            anosSemFeriados.push(ano);
        }
    }));

    const linhas = [];
    for (let dia = inicio; dia <= fim; dia = somarDias(dia, 1)) {
        const data = dataDaChave(dia);
        const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
        const feriado = feriados.has(dia);
        linhas.push([
            dataExcel(dia),
            data.getFullYear(),
            data.getMonth() + 1,
            MESES[data.getMonth()],
            Math.floor(data.getMonth() / 3) + 1,
            dia.slice(0, 7),
            data.getDay() + 1,
            DIAS_DA_SEMANA[data.getDay()],
            fimDeSemana,
            feriado,
            feriados.get(dia) || null,
            !fimDeSemana && !feriado
        ]);
    }
    return { linhas, anosSemFeriados: anosSemFeriados.sort() };
}

const COLUNAS_ATIVIDADES = [
    ["id", "Número da atividade (chave)"],
    ["codigo", "Código mostrado no sistema, ex.: #007"],
    ["titulo", "Título"],
    ["responsavel", "Nome do responsável"],
    ["usuario_id", "Número do usuário responsável"],
    ["participantes", "Nomes dos participantes"],
    ["status", "pendente, em andamento, concluido ou cancelado"],
    ["status_rotulo", "Status como aparece na tela"],
    ["prioridade", "baixo, medio, alto ou urgente"],
    ["prioridade_rotulo", "Prioridade como aparece na tela"],
    ["atrasada", "Prazo vencido sem conclusão (VERDADEIRO/FALSO)"],
    ["data_criacao", "Dia em que foi criada (ligar ao Calendario)"],
    ["data_inicio", "Início planejado"],
    ["data_vencimento", "Prazo de entrega (ligar ao Calendario)"],
    ["data_finalizacao", "Dia em que foi concluída ou cancelada"],
    ["dias_para_concluir", "Dias entre a criação e a conclusão (só concluídas)"],
    ["criada_no_periodo", "Criada dentro do período exportado"],
    ["concluida_no_periodo", "Concluída dentro do período exportado"]
];

export async function exportarPowerBi(relatorio) {
    const { default: escreverExcel } = await import("write-excel-file/browser");
    const { periodo, filtros, tarefas, tarefasFiltradas } = relatorio;

    const atividades = [
        COLUNAS_ATIVIDADES.map(([coluna]) => coluna),
        ...tarefas.map(tarefa => {
            const criada = diaLocal(tarefa.criado_em) || tarefa.data_inicio;
            const finalizada = diaLocal(tarefa.finalizado_em);
            return [
                tarefa.id,
                Formato.codigo(tarefa.id),
                tarefa.titulo,
                tarefa.responsavel || null,
                tarefa.usuario_id ?? null,
                tarefa.participantes || null,
                tarefa.status,
                Formato.rotuloStatus(tarefa.status),
                tarefa.prioridade,
                Formato.rotuloPrioridade(tarefa.prioridade),
                Boolean(tarefa.atrasada),
                dataExcel(criada),
                dataExcel(tarefa.data_inicio),
                dataExcel(tarefa.data_conclusao),
                dataExcel(finalizada),
                diasParaConcluir(tarefa),
                dentroDoPeriodo(criada, periodo),
                tarefa.status === "concluido" && dentroDoPeriodo(finalizada, periodo)
            ];
        })
    ];

    const { linhas, anosSemFeriados } = await montarCalendario(relatorio);
    const calendario = [
        ["data", "ano", "mes", "nome_mes", "trimestre", "ano_mes", "dia_semana", "nome_dia_semana",
            "fim_de_semana", "feriado", "nome_feriado", "dia_util"],
        ...linhas
    ];

    // Backlog sempre por dia, com o que entrou e saiu em cada dia
    const backlog = calcularBacklog(tarefasFiltradas, periodo, "dia");
    const contarNoDia = (dia, campo) => tarefasFiltradas.filter(tarefa =>
        (campo === "criada" ? diaLocal(tarefa.criado_em) || tarefa.data_inicio : diaLocal(tarefa.finalizado_em)) === dia &&
        (campo === "criada" || STATUS_FINAIS.includes(tarefa.status))
    ).length;
    const backlogDiario = [
        ["data", "atividades_em_aberto", "criadas", "encerradas"],
        ...backlog.dias.map((dia, indice) => [dataExcel(dia), backlog.valores[indice], contarNoDia(dia, "criada"), contarNoDia(dia, "encerrada")])
    ];

    const leiaMe = [
        [{ value: "Expresso - dados para o Power BI", fontWeight: "bold", fontSize: 14 }],
        ["Período", descreverPeriodo(periodo)],
        ["Filtros", descreverFiltros(filtros)],
        ["Gerado em", agora()],
        ["Feriados", anosSemFeriados.length
            ? "Não foi possível carregar os feriados de " + anosSemFeriados.join(", ") + ": nesses anos, feriado = FALSO."
            : "Feriados nacionais da BrasilAPI, conferidos pelo Expresso."],
        [null],
        [{ value: "Como importar", fontWeight: "bold" }],
        ["1", "No Power BI Desktop: Obter dados > Pasta de trabalho do Excel > escolha este arquivo."],
        ["2", "Marque Atividades, Calendario e BacklogDiario e clique em Carregar."],
        ["3", "Em Exibição de modelo, ligue Calendario[data] a Atividades[data_vencimento] (ou data_criacao) e a BacklogDiario[data]."],
        ["4", "Em Ferramentas de tabela, marque Calendario como tabela de datas, usando a coluna data."],
        [null],
        [cabecalho("Coluna de Atividades"), cabecalho("Significado")],
        ...COLUNAS_ATIVIDADES
    ];

    const blob = await escreverExcel([
        { data: atividades, sheet: "Atividades", stickyRowsCount: 1, dateFormat: "yyyy-mm-dd" },
        { data: calendario, sheet: "Calendario", stickyRowsCount: 1, dateFormat: "yyyy-mm-dd" },
        { data: backlogDiario, sheet: "BacklogDiario", stickyRowsCount: 1, dateFormat: "yyyy-mm-dd" },
        { data: leiaMe, sheet: "LeiaMe", columns: [{ width: 24 }, { width: 100 }] }
    ]).toBlob();

    baixarArquivo(blob, nomeDoArquivo(relatorio, "_powerbi", "xlsx"));
}

/* =====================================================
   4. PDF
===================================================== */

// Os gráficos da tela seguem o tema (no escuro, o texto é claro). No PDF, o fundo é branco:
// por isso eles são desenhados de novo, fora da tela, com cores fixas
function desenharGrafico(config, largura = 1000, altura = 360) {
    const area = document.createElement("div");
    area.style.position = "fixed";
    area.style.left = "-10000px";
    area.style.top = "0";
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    area.appendChild(canvas);
    document.body.appendChild(area);
    try {
        const grafico = new Chart(canvas, config);
        const imagem = grafico.toBase64Image("image/png", 1);
        grafico.destroy();
        return imagem;
    } finally {
        area.remove();
    }
}

const EIXO_PDF = {
    grid: { color: "#E6E6E6" },
    border: { display: false },
    ticks: { color: "#555555", font: { size: 14 } }
};

const valoresNasBarras = {
    id: "valoresNasBarras",
    afterDatasetsDraw(grafico) {
        const { ctx } = grafico;
        ctx.save();
        ctx.font = "600 14px sans-serif";
        ctx.fillStyle = "#333333";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        grafico.getDatasetMeta(0).data.forEach((barra, indice) => {
            const valor = grafico.data.datasets[0].data[indice];
            if (valor != null) ctx.fillText(formatarNumero(valor), barra.x, barra.y - 4);
        });
        ctx.restore();
    }
};

function opcoesFixas(extra) {
    return { responsive: false, animation: false, devicePixelRatio: 2, plugins: { legend: { display: false }, tooltip: { enabled: false } }, ...extra };
}

export async function exportarPdf(relatorio) {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const { periodo, filtros, tarefas, backlog, tempo, granularidade, estatistica } = relatorio;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margem = 15;
    const larguraPagina = doc.internal.pageSize.getWidth();
    const alturaPagina = doc.internal.pageSize.getHeight();
    const largura = larguraPagina - 2 * margem;
    const tabela = {
        theme: "grid",
        margin: { left: margem, right: margem, bottom: 16 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 1.8, lineColor: [225, 225, 225], textColor: [40, 40, 40] },
        headStyles: { fillColor: COR_MARCA_RGB, textColor: 255, fontStyle: "bold" }
    };
    let y = 20;
    const garantirEspaco = altura => {
        if (y + altura > alturaPagina - 18) {
            doc.addPage();
            y = 20;
        }
    };
    const subtitulo = texto => {
        garantirEspaco(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(COR_MARCA);
        doc.text(texto, margem, y);
        y += 4;
    };

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(COR_MARCA);
    doc.text("Relatório de atividades", margem, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("Expresso · Período: " + descreverPeriodo(periodo) + " · Gerado em " + agora(), margem, y + 6);
    doc.text("Filtros: " + descreverFiltros(filtros), margem, y + 11);
    y += 18;

    // Resumo
    subtitulo("Resumo do período");
    autoTable(doc, {
        ...tabela,
        startY: y,
        head: [["Indicador", "Valor"]],
        body: indicadores(relatorio).map(([rotulo, valor, decimal]) => [rotulo, textoDoValor(valor, decimal)]),
        columnStyles: { 1: { halign: "right", cellWidth: 60 } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // Gráficos
    const alturaGrafico = largura * 0.36;
    const imagemBacklog = desenharGrafico({
        type: "line",
        data: {
            labels: backlog.rotulos,
            datasets: [{
                data: backlog.valores,
                borderColor: COR_MARCA,
                borderWidth: 2.5,
                backgroundColor: "rgba(111, 0, 73, 0.12)",
                fill: "origin",
                pointRadius: backlog.valores.length > 31 ? 0 : 4,
                pointBackgroundColor: COR_MARCA
            }]
        },
        options: opcoesFixas({
            scales: {
                x: { ...EIXO_PDF, ticks: { ...EIXO_PDF.ticks, maxRotation: 0, autoSkipPadding: 16 } },
                y: { ...EIXO_PDF, beginAtZero: true, grace: "20%", ticks: { ...EIXO_PDF.ticks, precision: 0, maxTicksLimit: 7 } }
            }
        })
    });
    subtitulo("Evolução do backlog" + (granularidade === "semana" ? " (por semana)" : " (por dia)"));
    garantirEspaco(alturaGrafico);
    doc.addImage(imagemBacklog, "PNG", margem, y, largura, alturaGrafico);
    y += alturaGrafico + 10;

    const imagemTempo = desenharGrafico({
        type: "bar",
        data: { labels: tempo.rotulos, datasets: [{ data: tempo.valores, backgroundColor: COR_MARCA, maxBarThickness: 60, borderRadius: 2 }] },
        options: opcoesFixas({
            layout: { padding: { top: 24 } },
            scales: {
                x: { ...EIXO_PDF, grid: { display: false } },
                y: { ...EIXO_PDF, beginAtZero: true, grace: "25%", ticks: { ...EIXO_PDF.ticks, maxTicksLimit: 6 } }
            }
        }),
        plugins: [valoresNasBarras]
    });
    // Gráfico e tabela dos 6 meses ficam juntos na mesma página
    garantirEspaco(alturaGrafico + 70);
    subtitulo("Tempo para conclusão: " + rotuloEstatistica(estatistica).toLowerCase() + " por mês");
    doc.addImage(imagemTempo, "PNG", margem, y, largura, alturaGrafico);
    y += alturaGrafico + 4;
    autoTable(doc, {
        ...tabela,
        startY: y,
        head: [["Mês", rotuloEstatistica(estatistica), "Atividades concluídas"]],
        body: tempo.titulos.map((titulo, indice) => [
            titulo, tempo.valores[indice] == null ? "-" : formatarNumero(tempo.valores[indice]), String(tempo.quantidades[indice])
        ]),
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } }
    });
    y = doc.lastAutoTable.finalY + 10;

    // Atividades
    subtitulo("Atividades do período (" + tarefas.length + ")");
    autoTable(doc, {
        ...tabela,
        startY: y,
        styles: { ...tabela.styles, fontSize: 8 },
        head: [["Código", "Título", "Responsável", "Status", "Prioridade", "Criada", "Vencimento", "Finalizada"]],
        body: tarefas.map(tarefa => [
            Formato.codigo(tarefa.id),
            tarefa.titulo,
            tarefa.responsavel || "",
            Formato.rotuloStatus(tarefa.status),
            Formato.rotuloPrioridade(tarefa.prioridade),
            formatarDia(diaLocal(tarefa.criado_em)),
            formatarDia(tarefa.data_conclusao),
            formatarDia(diaLocal(tarefa.finalizado_em))
        ]),
        columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 52 } }
    });

    // Rodapé com o número da página
    const totalDePaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalDePaginas; pagina++) {
        doc.setPage(pagina);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text("Expresso · " + chaveDoDia(new Date()).split("-").reverse().join("/"), margem, alturaPagina - 8);
        doc.text("Página " + pagina + " de " + totalDePaginas, larguraPagina - margem, alturaPagina - 8, { align: "right" });
    }

    baixarArquivo(doc.output("blob"), nomeDoArquivo(relatorio, "", "pdf"));
}

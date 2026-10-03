import { Formato } from "./formato";

/* Relatórios: cálculos dos gráficos e do resumo a partir das tarefas do banco */

export const CORES = {
    vinho: "#6F0049",
    grade: "#ececef"
};

// Status que encerram a tarefa (o banco guarda quando isso aconteceu em "finalizado_em")
export const STATUS_FINAIS = ["concluido", "cancelado"];

export const FILTROS_PADRAO = {
    responsavel: "todos",
    status: "todos",
    prioridade: "todos"
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_COMPLETOS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/* =====================================================
   1. DATAS
   Os dias são tratados como texto "AAAA-MM-DD" no fuso local,
   o que permite comparar direto com < e >.
===================================================== */

export function chaveDoDia(data) {
    return data.getFullYear() + "-" +
        String(data.getMonth() + 1).padStart(2, "0") + "-" +
        String(data.getDate()).padStart(2, "0");
}

function dataDaChave(chave) {
    const [ano, mes, dia] = chave.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

function somarDias(chave, dias) {
    const data = dataDaChave(chave);
    data.setDate(data.getDate() + dias);
    return chaveDoDia(data);
}

// criado_em/finalizado_em chegam como "2026-09-27T14:41:49.000Z"
function diaLocal(valor) {
    return valor ? chaveDoDia(new Date(valor)) : null;
}

// "2026-09-27" -> "27/09/2026"
export function formatarDia(chave) {
    if (!chave) return "";
    const [ano, mes, dia] = chave.split("-");
    return dia + "/" + mes + "/" + ano;
}

// "2026-09-27" -> "27/09"
function formatarDiaCurto(chave) {
    return formatarDia(chave).slice(0, 5);
}

// 2.4 -> "2,4"
export function formatarNumero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

/* =====================================================
   2. PERÍODOS PRONTOS (seletor de período)
===================================================== */

export function periodoUltimosDias(dias) {
    const fim = chaveDoDia(new Date());
    return { inicio: somarDias(fim, -(dias - 1)), fim };
}

export function periodoEsteMes() {
    const hoje = new Date();
    return {
        inicio: chaveDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        fim: chaveDoDia(hoje)
    };
}

export function periodoUltimosMeses(meses) {
    const hoje = new Date();
    return {
        inicio: chaveDoDia(new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)),
        fim: chaveDoDia(hoje)
    };
}

export function anosDoPeriodo(periodo) {
    const anos = [];
    for (let ano = Number(periodo.inicio.slice(0, 4)); ano <= Number(periodo.fim.slice(0, 4)); ano++) {
        anos.push(String(ano));
    }
    return anos;
}

/* =====================================================
   3. TAREFAS
===================================================== */

function diasDaTarefa(tarefa) {
    return {
        criada: diaLocal(tarefa.criado_em) || tarefa.data_inicio,
        finalizada: diaLocal(tarefa.finalizado_em),
        encerrada: STATUS_FINAIS.includes(tarefa.status)
    };
}

// A tarefa estava em aberto no fim desse dia?
function estavaAberta(tarefa, dia) {
    const { criada, finalizada, encerrada } = diasDaTarefa(tarefa);
    if (!criada || criada > dia) return false;
    if (!encerrada) return true;
    // Encerradas antes de existir "finalizado_em" não têm a data: ficam fora do backlog
    return Boolean(finalizada) && finalizada > dia;
}

// Criada, aberta ou encerrada dentro do período (o que entra na exportação)
function participouDoPeriodo(tarefa, periodo) {
    const { criada, finalizada, encerrada } = diasDaTarefa(tarefa);
    if (!criada || criada > periodo.fim) return false;
    if (criada >= periodo.inicio || !encerrada) return true;
    return Boolean(finalizada) && finalizada >= periodo.inicio;
}

export function aplicarFiltros(tarefas, filtros) {
    return tarefas.filter(tarefa =>
        (filtros.responsavel === "todos" || tarefa.responsavel === filtros.responsavel) &&
        (filtros.status === "todos" || tarefa.status === filtros.status) &&
        (filtros.prioridade === "todos" || tarefa.prioridade === filtros.prioridade)
    );
}

export function responsaveisDasTarefas(tarefas) {
    const nomes = new Set(tarefas.map(tarefa => tarefa.responsavel).filter(Boolean));
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function tarefasDoPeriodo(tarefas, periodo) {
    return tarefas.filter(tarefa => participouDoPeriodo(tarefa, periodo));
}

/* =====================================================
   4. GRÁFICOS
===================================================== */

// Evolução do backlog: quantas tarefas estavam em aberto em cada dia (ou semana)
export function calcularBacklog(tarefas, periodo, granularidade) {
    const passo = granularidade === "semana" ? 7 : 1;
    const limite = somarDias(periodo.inicio, -(passo - 1));

    const dias = [];
    for (let dia = periodo.fim; dia >= limite; dia = somarDias(dia, -passo)) {
        dias.unshift(dia);
    }

    return {
        rotulos: dias.map(formatarDiaCurto),
        titulos: dias.map(dia => (passo === 7 ? "Semana até " : "") + formatarDia(dia)),
        valores: dias.map(dia => tarefas.filter(tarefa => estavaAberta(tarefa, dia)).length)
    };
}

function media(valores) {
    return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

function mediana(valores) {
    const ordenados = [...valores].sort((a, b) => a - b);
    const meio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

// Tempo para conclusão: dias entre a criação e a conclusão,
// agrupados pelo mês da conclusão (6 meses até o fim do período)
export function calcularTempoConclusao(tarefas, fimPeriodo, estatistica) {
    const concluidas = tarefas.filter(tarefa =>
        tarefa.status === "concluido" && tarefa.finalizado_em && tarefa.criado_em
    );
    const fim = dataDaChave(fimPeriodo);

    const rotulos = [];
    const titulos = [];
    const valores = [];
    const quantidades = [];

    for (let i = 5; i >= 0; i--) {
        const mes = new Date(fim.getFullYear(), fim.getMonth() - i, 1);

        const duracoes = concluidas
            .filter(tarefa => {
                const finalizada = new Date(tarefa.finalizado_em);
                return finalizada.getFullYear() === mes.getFullYear() &&
                    finalizada.getMonth() === mes.getMonth();
            })
            .map(tarefa =>
                Math.max(0, (new Date(tarefa.finalizado_em) - new Date(tarefa.criado_em)) / UM_DIA_MS)
            );

        let valor = null;
        if (duracoes.length > 0) {
            const resultado = estatistica === "mediana" ? mediana(duracoes) : media(duracoes);
            valor = Math.round(resultado * 10) / 10;
        }

        rotulos.push(MESES[mes.getMonth()]);
        titulos.push(MESES_COMPLETOS[mes.getMonth()] + " de " + mes.getFullYear());
        valores.push(valor);
        quantidades.push(duracoes.length);
    }

    return { rotulos, titulos, valores, quantidades };
}

/* =====================================================
   5. RESUMO DO PERÍODO
===================================================== */

// Segunda a sexta, tirando os feriados nacionais ("AAAA-MM-DD")
export function calcularDiasUteis(periodo, feriados) {
    let total = 0;
    for (let dia = periodo.inicio; dia <= periodo.fim; dia = somarDias(dia, 1)) {
        const diaDaSemana = dataDaChave(dia).getDay();
        if (diaDaSemana !== 0 && diaDaSemana !== 6 && !feriados.has(dia)) total++;
    }
    return total;
}

export function contarCriadasNoPeriodo(tarefas, periodo) {
    return tarefas.filter(tarefa => {
        const { criada } = diasDaTarefa(tarefa);
        return criada && criada >= periodo.inicio && criada <= periodo.fim;
    }).length;
}

/* =====================================================
   6. EXPORTAR CSV
===================================================== */

function celulaCsv(valor) {
    return '"' + String(valor == null ? "" : valor).replace(/"/g, '""') + '"';
}

export function exportarCsv(tarefas, periodo) {
    const cabecalho = [
        "Código", "Título", "Responsável", "Status", "Prioridade",
        "Criada em", "Início", "Vencimento", "Finalizada em"
    ];

    const linhas = tarefas.map(tarefa => [
        Formato.codigo(tarefa.id),
        tarefa.titulo,
        tarefa.responsavel || "",
        Formato.rotuloStatus(tarefa.status),
        Formato.rotuloPrioridade(tarefa.prioridade),
        formatarDia(diaLocal(tarefa.criado_em)),
        formatarDia(tarefa.data_inicio),
        formatarDia(tarefa.data_conclusao),
        formatarDia(diaLocal(tarefa.finalizado_em))
    ]);

    // O "﻿" faz o Excel reconhecer os acentos
    const csv = "﻿" + [cabecalho, ...linhas]
        .map(linha => linha.map(celulaCsv).join(";"))
        .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-atividades_${periodo.inicio}_${periodo.fim}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

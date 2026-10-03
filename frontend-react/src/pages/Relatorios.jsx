import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";
import Grafico from "../components/Grafico";
import SeletorPeriodo from "../components/SeletorPeriodo";
import { IconeBaixar, IconeFunil, IconeSetaBaixo } from "../components/Icones";
import {
    CORES, FILTROS_PADRAO, anosDoPeriodo, aplicarFiltros, calcularBacklog,
    calcularDiasUteis, calcularTempoConclusao, contarCriadasNoPeriodo, exportarCsv,
    formatarDia, formatarNumero, periodoUltimosDias, responsaveisDasTarefas, tarefasDoPeriodo
} from "../utils/relatorios";

/* Escreve o valor em cima de cada barra ("4,2") */
const rotulosNasBarras = {
    id: "rotulosNasBarras",
    afterDatasetsDraw(grafico) {
        const { ctx } = grafico;
        const valores = grafico.data.datasets[0].data;
        ctx.save();
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = "#1c1c1e";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        grafico.getDatasetMeta(0).data.forEach((barra, indice) => {
            if (valores[indice] == null) return;
            ctx.fillText(formatarNumero(valores[indice]), barra.x, barra.y - 4);
        });
        ctx.restore();
    }
};
const PLUGINS_BARRAS = [rotulosNasBarras];

// Preenchimento do backlog: vinho clarinho em cima, sumindo até o eixo
function degradeVinho(contexto) {
    const { ctx, chartArea } = contexto.chart;
    if (!chartArea) return "transparent";
    const degrade = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    degrade.addColorStop(0, "rgba(111, 0, 73, 0.16)");
    degrade.addColorStop(1, "rgba(111, 0, 73, 0)");
    return degrade;
}

const EIXO = { grid: { color: CORES.grade }, border: { display: false } };

function Selecao({ valor, aoMudar, rotulo, className = "", children }) {
    return (
        <div className={"relative " + className}>
            <select
                aria-label={rotulo}
                value={valor}
                onChange={evento => aoMudar(evento.target.value)}
                className="w-full h-[32px] appearance-none bg-white border border-[#d1d1d6] rounded-md pl-3 pr-8 text-xs text-[#1c1c1e] cursor-pointer outline-none focus:border-[#6F0049] transition-colors"
            >
                {children}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3a3a3c]">
                <IconeSetaBaixo />
            </span>
        </div>
    );
}

function CartaoGrafico({ titulo, descricao, controle, aviso, children }) {
    return (
        <article className="bg-white border border-[#d1d1d6] rounded-xl shadow-sm p-4 xl:p-5 flex flex-col gap-3 min-w-0">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm xl:text-base font-bold text-[#1c1c1e]">{titulo}</h2>
                    <p className="text-xs text-[#6e6e73] mt-0.5">{descricao}</p>
                </div>
                {controle}
            </div>
            <div className="relative">
                {children}
                {aviso && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white/90 px-3 py-1.5 rounded-md text-xs text-[#6e6e73] text-center">
                            {aviso}
                        </span>
                    </div>
                )}
            </div>
        </article>
    );
}

function CampoFiltro({ rotulo, children }) {
    return (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[#3a3a3c]">
            {rotulo}
            {children}
        </label>
    );
}

function LinhaResumo({ rotulo, valor }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <dt className="font-semibold text-[#1c1c1e]">{rotulo}</dt>
            <dd className="text-[#3a3a3c] text-right whitespace-nowrap">{valor}</dd>
        </div>
    );
}

export default function Relatorios() {
    const [tarefas, setTarefas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    const [periodo, setPeriodo] = useState(() => periodoUltimosDias(7));
    const [granularidade, setGranularidade] = useState("dia");
    const [estatistica, setEstatistica] = useState("media");

    // Os filtros só valem depois de "Aplicar filtros"
    const [selecao, setSelecao] = useState(FILTROS_PADRAO);
    const [filtros, setFiltros] = useState(FILTROS_PADRAO);

    // { "2026": ["2026-01-01", ...] } — feriados nacionais, para os dias úteis
    const [feriadosPorAno, setFeriadosPorAno] = useState({});

    useEffect(() => {
        let ativo = true;
        async function carregar() {
            try {
                const lista = await Api.listarTarefas();
                if (ativo) setTarefas(lista);
            } catch (erroApi) {
                if (ativo) setErro(erroApi.message);
            } finally {
                if (ativo) setCarregando(false);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, []);

    const anos = anosDoPeriodo(periodo);
    const chaveAnos = anos.join(",");

    useEffect(() => {
        const faltando = chaveAnos.split(",").filter(ano => !(ano in feriadosPorAno));
        if (faltando.length === 0) return;

        let ativo = true;
        Promise.all(faltando.map(ano =>
            Api.listarFeriados(ano)
                .then(lista => lista.map(feriado => feriado.date))
                .catch(erroApi => {
                    // Sem a lista de feriados, os dias úteis contam só os fins de semana
                    console.warn("Não foi possível carregar os feriados de " + ano + ":", erroApi.message);
                    return [];
                })
        )).then(listas => {
            if (!ativo) return;
            setFeriadosPorAno(atuais => {
                const novos = { ...atuais };
                faltando.forEach((ano, indice) => { novos[ano] = listas[indice]; });
                return novos;
            });
        });
        return () => { ativo = false; };
    }, [chaveAnos, feriadosPorAno]);

    const tarefasFiltradas = useMemo(() => aplicarFiltros(tarefas, filtros), [tarefas, filtros]);
    const responsaveis = useMemo(() => responsaveisDasTarefas(tarefas), [tarefas]);

    /* RESUMO DO PERÍODO */
    const feriadosProntos = anos.every(ano => ano in feriadosPorAno);
    const diasUteis = useMemo(() => {
        const feriados = new Set(Object.values(feriadosPorAno).flat());
        return calcularDiasUteis(periodo, feriados);
    }, [periodo, feriadosPorAno]);
    const criadasNoPeriodo = contarCriadasNoPeriodo(tarefasFiltradas, periodo);
    const mediaPorDia = diasUteis > 0 ? criadasNoPeriodo / diasUteis : 0;

    /* EVOLUÇÃO DO BACKLOG */
    const backlog = useMemo(
        () => calcularBacklog(tarefasFiltradas, periodo, granularidade),
        [tarefasFiltradas, periodo, granularidade]
    );

    const dadosBacklog = useMemo(() => ({
        labels: backlog.rotulos,
        datasets: [{
            label: "Atividades em aberto",
            data: backlog.valores,
            borderColor: CORES.vinho,
            borderWidth: 1.5,
            backgroundColor: degradeVinho,
            fill: "origin",
            tension: 0,
            pointRadius: backlog.valores.length > 31 ? 0 : 3,
            pointHoverRadius: 5,
            pointBackgroundColor: CORES.vinho,
            pointBorderWidth: 0
        }]
    }), [backlog]);

    const opcoesBacklog = useMemo(() => ({
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: itens => backlog.titulos[itens[0].dataIndex],
                    label: item => ` ${item.raw} em aberto`
                }
            }
        },
        scales: {
            x: { ...EIXO, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
            y: { ...EIXO, beginAtZero: true, grace: "20%", ticks: { precision: 0, maxTicksLimit: 7 } }
        }
    }), [backlog]);

    /* TEMPO MÉDIO PARA CONCLUSÃO */
    const tempo = useMemo(
        () => calcularTempoConclusao(tarefasFiltradas, periodo.fim, estatistica),
        [tarefasFiltradas, periodo.fim, estatistica]
    );
    const temConcluidas = tempo.quantidades.some(quantidade => quantidade > 0);

    const dadosTempo = useMemo(() => ({
        labels: tempo.rotulos,
        datasets: [{
            label: estatistica === "mediana" ? "Mediana (dias)" : "Média (dias)",
            data: tempo.valores,
            backgroundColor: CORES.vinho,
            maxBarThickness: 42,
            borderRadius: 2
        }]
    }), [tempo, estatistica]);

    const opcoesTempo = useMemo(() => ({
        layout: { padding: { top: 18 } },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: itens => tempo.titulos[itens[0].dataIndex],
                    label: item => {
                        const quantidade = tempo.quantidades[item.dataIndex];
                        return ` ${formatarNumero(item.raw)} dias · ${quantidade} ` +
                            (quantidade === 1 ? "atividade concluída" : "atividades concluídas");
                    }
                }
            }
        },
        scales: {
            x: { ...EIXO, grid: { display: false } },
            y: temConcluidas
                ? { ...EIXO, beginAtZero: true, grace: "25%", ticks: { maxTicksLimit: 6 } }
                : { ...EIXO, min: 0, max: 8, ticks: { stepSize: 2 } }
        }
    }), [tempo, temConcluidas]);

    function avisoDoGrafico(semDados) {
        if (carregando) return "Carregando dados...";
        if (erro) return "Não foi possível carregar os dados.";
        return semDados;
    }

    function mudarSelecao(campo) {
        return valor => setSelecao(atual => ({ ...atual, [campo]: valor }));
    }

    function limparFiltros() {
        setSelecao(FILTROS_PADRAO);
        setFiltros(FILTROS_PADRAO);
    }

    const tarefasParaExportar = tarefasDoPeriodo(tarefasFiltradas, periodo);

    return (
        <div className="flex flex-col gap-4">

            {/* TOPO: VOLTAR + PERÍODO + EXPORTAR */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/" className="text-[#6F0049] text-base font-semibold no-underline hover:underline">
                    &lt; Voltar
                </Link>
                <div className="flex items-center gap-3">
                    <SeletorPeriodo periodo={periodo} aoMudar={setPeriodo} />
                    <button
                        type="button"
                        onClick={() => exportarCsv(tarefasParaExportar, periodo)}
                        disabled={carregando || tarefasParaExportar.length === 0}
                        title="Baixa em CSV as atividades do período com os filtros aplicados"
                        className="h-[32px] bg-white border border-[#6F0049] text-[#6F0049] hover:bg-[#f4e8f0] rounded-md px-4 flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconeBaixar tamanho={13} />
                        <span>Exportar</span>
                    </button>
                </div>
            </div>

            {erro && (
                <div className="w-full rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
                    {erro}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_290px] gap-4 items-start">

                {/* GRÁFICOS */}
                <div className="flex flex-col gap-4 min-w-0">
                    <CartaoGrafico
                        titulo="Evolução do backlog"
                        descricao="Quantidade de atividades em aberto ao longo do período."
                        aviso={avisoDoGrafico(
                            tarefasFiltradas.length === 0 ? "Nenhuma atividade encontrada com esses filtros." : null
                        )}
                        controle={
                            <Selecao
                                rotulo="Agrupar backlog"
                                valor={granularidade}
                                aoMudar={setGranularidade}
                                className="w-[110px] shrink-0"
                            >
                                <option value="dia">Por dia</option>
                                <option value="semana">Por semana</option>
                            </Selecao>
                        }
                    >
                        <Grafico
                            tipo="line"
                            dados={dadosBacklog}
                            opcoes={opcoesBacklog}
                            descricao="Gráfico de linha com a quantidade de atividades em aberto em cada dia do período"
                        />
                    </CartaoGrafico>

                    <CartaoGrafico
                        titulo="Tempo médio para conclusão"
                        descricao={
                            (estatistica === "mediana" ? "Mediana" : "Média") +
                            " de dias para finalizar as atividades por período."
                        }
                        aviso={avisoDoGrafico(
                            temConcluidas ? null : "Nenhuma atividade concluída nesses meses."
                        )}
                        controle={
                            <Selecao
                                rotulo="Estatística do tempo de conclusão"
                                valor={estatistica}
                                aoMudar={setEstatistica}
                                className="w-[125px] shrink-0"
                            >
                                <option value="media">Média (dias)</option>
                                <option value="mediana">Mediana (dias)</option>
                            </Selecao>
                        }
                    >
                        <Grafico
                            tipo="bar"
                            dados={dadosTempo}
                            opcoes={opcoesTempo}
                            plugins={PLUGINS_BARRAS}
                            descricao="Gráfico de barras com o tempo para concluir as atividades em cada mês"
                        />
                    </CartaoGrafico>
                </div>

                {/* LATERAL: FILTROS + RESUMO */}
                <div className="flex flex-col gap-4">
                    <section className="bg-white border border-[#d1d1d6] rounded-xl shadow-sm p-4 flex flex-col gap-3.5">
                        <h2 className="text-base font-bold text-[#1c1c1e]">Filtros</h2>

                        <CampoFiltro rotulo="Responsável">
                            <Selecao valor={selecao.responsavel} aoMudar={mudarSelecao("responsavel")}>
                                <option value="todos">Todos</option>
                                {responsaveis.map(nome => (
                                    <option key={nome} value={nome}>{nome}</option>
                                ))}
                            </Selecao>
                        </CampoFiltro>

                        <CampoFiltro rotulo="Status">
                            <Selecao valor={selecao.status} aoMudar={mudarSelecao("status")}>
                                <option value="todos">Todos</option>
                                {Object.entries(Formato.status.rotulo).map(([valor, rotulo]) => (
                                    <option key={valor} value={valor}>{rotulo}</option>
                                ))}
                            </Selecao>
                        </CampoFiltro>

                        <CampoFiltro rotulo="Prioridade">
                            <Selecao valor={selecao.prioridade} aoMudar={mudarSelecao("prioridade")}>
                                <option value="todos">Todos</option>
                                {Object.entries(Formato.prioridade.rotulo).map(([valor, rotulo]) => (
                                    <option key={valor} value={valor}>{rotulo}</option>
                                ))}
                            </Selecao>
                        </CampoFiltro>

                        <button
                            type="button"
                            onClick={() => setFiltros(selecao)}
                            className="mt-1 w-full h-[34px] bg-[#6F0049] hover:bg-[#560039] text-white text-xs font-medium rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                            <IconeFunil />
                            <span>Aplicar filtros</span>
                        </button>
                        <button
                            type="button"
                            onClick={limparFiltros}
                            className="bg-transparent border-0 text-[#6F0049] text-xs font-semibold cursor-pointer hover:underline"
                        >
                            Limpar filtros
                        </button>
                    </section>

                    <section className="bg-white border border-[#d1d1d6] rounded-xl shadow-sm p-4 flex flex-col gap-4">
                        <h2 className="text-sm xl:text-base font-bold text-[#1c1c1e]">Resumo do período</h2>
                        <dl className="flex flex-col gap-4 text-[11px]">
                            <LinhaResumo
                                rotulo="Período selecionado"
                                valor={formatarDia(periodo.inicio) + " - " + formatarDia(periodo.fim)}
                            />
                            <LinhaResumo rotulo="Dias úteis" valor={feriadosProntos ? diasUteis : "…"} />
                            <LinhaResumo
                                rotulo="Média de atividades por dia"
                                valor={carregando || !feriadosProntos ? "…" : formatarNumero(mediaPorDia)}
                            />
                        </dl>
                    </section>
                </div>
            </div>
        </div>
    );
}

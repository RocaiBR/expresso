import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTarefas } from "../hooks/useTarefas";
import { Formato } from "../utils/formato";
import { filtrarTarefas, pesquisarTarefas } from "../utils/tarefas";
import Abas from "../components/Abas";
import BarraSelecao from "../components/BarraSelecao";
import CampoPesquisa from "../components/CampoPesquisa";
import LinhaTarefa from "../components/LinhaTarefa";
import MensagemTabela from "../components/MensagemTabela";
import { IconeMais } from "../components/Icones";

const ABAS = [
    { rotulo: "Todas", filtro: "todas" },
    { rotulo: "Pendentes", filtro: "pendente" },
    { rotulo: "Em andamento", filtro: "em andamento" },
    { rotulo: "Concluídas", filtro: "concluido" },
    { rotulo: "Atrasadas", filtro: "atrasadas" }
];

// Aplica "acao" nas atividades, 5 por vez; devolve quantas deram certo e os erros
async function aplicarEmLote(tarefas, acao) {
    let feitas = 0;
    const erros = [];
    for (let inicio = 0; inicio < tarefas.length; inicio += 5) {
        const parte = tarefas.slice(inicio, inicio + 5);
        const resultados = await Promise.allSettled(parte.map(acao));
        resultados.forEach((resultado, indice) => {
            if (resultado.status === "fulfilled") feitas++;
            else erros.push(Formato.codigo(parte[indice].id) + ": " + resultado.reason.message);
        });
    }
    return { feitas, erros };
}

// O que deu certo, o que o cargo não permitia e o que falhou
function resumo(feitas, verbo, ignoradas, erros) {
    const linhas = [feitas + " atividade(s) " + verbo + "."];
    if (ignoradas > 0) linhas.push(ignoradas + " ignorada(s): seu cargo não permite essa ação nelas.");
    if (erros.length > 0) linhas.push("Não foi possível em " + erros.length + ":\n" + erros.join("\n"));
    return linhas.join("\n");
}

export default function Atividades() {
    const { usuario } = useAuth();
    const { tarefas, carregando, erro, recarregar } = useTarefas();
    const [verificandoPrazos, setVerificandoPrazos] = useState(false);
    const [filtro, setFiltro] = useState("todas");
    const [pesquisa, setPesquisa] = useState("");

    const lista = pesquisarTarefas(filtrarTarefas(tarefas, filtro), pesquisa);

    /* SELEÇÃO DE VÁRIAS ATIVIDADES (só valem as que estão visíveis na aba e na pesquisa atuais) */
    const [modoSelecao, setModoSelecao] = useState(false);
    const [selecionados, setSelecionados] = useState(() => new Set());
    const [pessoas, setPessoas] = useState([]);
    const [ocupado, setOcupado] = useState(false);

    const selecionadas = lista.filter(tarefa => selecionados.has(tarefa.id));
    const todasMarcadas = lista.length > 0 && selecionadas.length === lista.length;

    // Caixinha do cabeçalho fica "pela metade" quando só parte está marcada
    const caixaTodas = useRef(null);
    useEffect(() => {
        if (caixaTodas.current) caixaTodas.current.indeterminate = selecionadas.length > 0 && !todasMarcadas;
    });

    function entrarNoModoSelecao() {
        setModoSelecao(true);
        if (pessoas.length === 0) Api.listarAtribuiveis().then(setPessoas).catch(() => setPessoas([]));
    }

    function sairDoModoSelecao() {
        setModoSelecao(false);
        setSelecionados(new Set());
    }

    function alternar(id) {
        setSelecionados(atuais => {
            const novos = new Set(atuais);
            if (novos.has(id)) novos.delete(id);
            else novos.add(id);
            return novos;
        });
    }

    function alternarTodas() {
        setSelecionados(todasMarcadas ? new Set() : new Set(lista.map(tarefa => tarefa.id)));
    }

    async function executar(alvos, acao, verbo) {
        setOcupado(true);
        const { feitas, erros } = await aplicarEmLote(alvos, acao);
        setOcupado(false);
        alert(resumo(feitas, verbo, selecionadas.length - alvos.length, erros));
        setSelecionados(new Set());
        recarregar();
    }

    function moverPara(status) {
        const alvos = selecionadas.filter(tarefa => tarefa.permissoes?.status);
        executar(alvos, tarefa => Api.atualizarTarefa(tarefa.id, { status }),
            "movida(s) para \"" + Formato.rotuloStatus(status) + "\"");
    }

    function passarPara(usuarioId) {
        const pessoa = pessoas.find(item => item.id === usuarioId);
        const alvos = selecionadas.filter(tarefa => tarefa.permissoes?.editar);
        executar(alvos, tarefa => Api.atualizarTarefa(tarefa.id, { usuario_id: usuarioId }),
            "passada(s) para " + (pessoa ? pessoa.nome : "o novo responsável"));
    }

    // Só TI: a mesma verificação que roda sozinha toda madrugada
    async function verificarPrazos() {
        setVerificandoPrazos(true);
        try {
            const resultado = await Api.verificarPrazos();
            alert(
                "Prazos verificados (" + resultado.abertas + " atividade(s) em aberto).\n" +
                resultado.viraram_urgentes + " passaram do prazo e viraram Urgente.\n" +
                resultado.voltaram_ao_normal + " tiveram o prazo adiado e voltaram à prioridade de antes."
            );
            recarregar();
        } catch (erroApi) {
            alert("Não foi possível verificar os prazos: " + erroApi.message);
        } finally {
            setVerificandoPrazos(false);
        }
    }

    function excluirSelecionadas() {
        const alvos = selecionadas.filter(tarefa => tarefa.permissoes?.excluir);
        if (!confirm("Excluir " + alvos.length + " atividade(s) e todos os arquivos delas? Essa ação não pode ser desfeita.")) return;
        executar(alvos, tarefa => Api.excluirTarefa(tarefa.id), "excluída(s)");
    }

    return (
        <>
            {/* PESQUISA */}
            <div className="w-full">
                <CampoPesquisa
                    valor={pesquisa}
                    aoMudar={setPesquisa}
                    className="w-full max-w-[750px]"
                />
            </div>

            {/* TÍTULO E BOTÃO */}
            <div className="w-full flex items-center justify-between mt-1">
                <h1 className="text-lg xl:text-xl font-bold text-texto">
                    Atividades
                </h1>
                <div className="flex items-center gap-2">
                    {usuario?.funcao === "ti" && (
                        <button
                            type="button"
                            onClick={verificarPrazos}
                            disabled={verificandoPrazos}
                            title="Atividades com o prazo vencido viram Urgente (isso também roda sozinho toda madrugada)"
                            className="border border-borda text-texto-2 hover:bg-superficie-hover text-xs xl:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer bg-superficie disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {verificandoPrazos ? "Verificando..." : "Verificar prazos"}
                        </button>
                    )}
                    {!modoSelecao && (
                        <button
                            type="button"
                            onClick={entrarNoModoSelecao}
                            className="border border-marca-texto text-marca-texto hover:bg-marca-texto/10 text-xs xl:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer bg-superficie"
                        >
                            Selecionar
                        </button>
                    )}
                    <Link
                        to="/atividades/nova"
                        className="bg-marca hover:bg-marca-escura text-white text-xs xl:text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer no-underline"
                    >
                        <IconeMais />
                        <span>Nova Atividade</span>
                    </Link>
                </div>
            </div>

            {/* AÇÕES EM VÁRIAS ATIVIDADES */}
            {modoSelecao && (
                <BarraSelecao
                    selecionadas={selecionadas}
                    pessoas={pessoas}
                    ocupado={ocupado}
                    aoMover={moverPara}
                    aoPassar={passarPara}
                    aoExcluir={excluirSelecionadas}
                    aoCancelar={sairDoModoSelecao}
                />
            )}

            {/* SEÇÃO DAS ATIVIDADES */}
            <section className="w-full flex flex-col">

                {/* ABAS */}
                <Abas abas={ABAS} filtroAtivo={filtro} aoSelecionar={aba => setFiltro(aba.filtro)} />

                {/* TABELA */}
                <div className="w-full bg-superficie border border-borda border-t-0 rounded-b-xl divide-y divide-borda-suave shadow-sm">

                    {/* CABEÇALHO */}
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center p-3 px-5 text-xs font-semibold text-texto-suave bg-superficie-2 border-b border-borda-suave">
                        <div className="flex items-center gap-3">
                            {modoSelecao ? (
                                <input
                                    ref={caixaTodas}
                                    type="checkbox"
                                    checked={todasMarcadas}
                                    onChange={alternarTodas}
                                    title="Selecionar todas as atividades visíveis"
                                    className="w-4 h-4 rounded border-borda accent-marca-texto cursor-pointer"
                                />
                            ) : (
                                <input
                                    type="checkbox"
                                    readOnly
                                    className="w-4 h-4 rounded border-borda text-marca-texto focus:ring-marca-texto cursor-pointer invisible"
                                />
                            )}
                            <span>Atividade</span>
                        </div>
                        <div>Responsável</div>
                        <div>Prioridade</div>
                        <div>Data de Entrega</div>
                    </div>

                    {/* LINHAS */}
                    <div className="divide-y divide-borda-suave">
                        {carregando && <MensagemTabela>Carregando atividades...</MensagemTabela>}
                        {!carregando && erro && tarefas.length === 0 && (
                            <MensagemTabela>{erro}</MensagemTabela>
                        )}
                        {!carregando && !(erro && tarefas.length === 0) && lista.length === 0 && (
                            <MensagemTabela>
                                {pesquisa.trim()
                                    ? `Nenhuma atividade encontrada para "${pesquisa.trim()}".`
                                    : "Nenhuma atividade por aqui."}
                            </MensagemTabela>
                        )}
                        {lista.map(tarefa => (
                            <LinhaTarefa
                                key={tarefa.id}
                                tarefa={tarefa}
                                clicavel
                                aoAlterar={recarregar}
                                selecionavel={modoSelecao}
                                selecionada={selecionados.has(tarefa.id)}
                                aoSelecionar={alternar}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

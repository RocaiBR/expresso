import { useState } from "react";
import { Link } from "react-router-dom";
import { useTarefas } from "../hooks/useTarefas";
import { filtrarTarefas, pesquisarTarefas } from "../utils/tarefas";
import Abas from "../components/Abas";
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

export default function Atividades() {
    const { tarefas, carregando, erro, recarregar } = useTarefas();
    const [filtro, setFiltro] = useState("todas");
    const [pesquisa, setPesquisa] = useState("");

    const lista = pesquisarTarefas(filtrarTarefas(tarefas, filtro), pesquisa);

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
                <h1 className="text-lg xl:text-xl font-bold text-[#1c1c1e]">
                    Atividades
                </h1>
                <Link
                    to="/atividades/nova"
                    className="bg-[#6F0049] hover:bg-[#560039] text-white text-xs xl:text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer no-underline"
                >
                    <IconeMais />
                    <span>Nova Atividade</span>
                </Link>
            </div>

            {/* SEÇÃO DAS ATIVIDADES */}
            <section className="w-full flex flex-col">

                {/* ABAS */}
                <Abas abas={ABAS} filtroAtivo={filtro} aoSelecionar={aba => setFiltro(aba.filtro)} />

                {/* TABELA */}
                <div className="w-full bg-white border border-[#d1d1d6] border-t-0 rounded-b-xl divide-y divide-gray-100 shadow-sm">

                    {/* CABEÇALHO */}
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center p-3 px-5 text-xs font-semibold text-[#6e6e73] bg-[#f9f9fb] border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                readOnly
                                className="w-4 h-4 rounded border-gray-300 text-[#6F0049] focus:ring-[#6F0049] cursor-pointer invisible"
                            />
                            <span>Atividade</span>
                        </div>
                        <div>Responsável</div>
                        <div>Prioridade</div>
                        <div>Data de Entrega</div>
                    </div>

                    {/* LINHAS */}
                    <div className="divide-y divide-gray-100">
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
                            <LinhaTarefa key={tarefa.id} tarefa={tarefa} clicavel aoAlterar={recarregar} />
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

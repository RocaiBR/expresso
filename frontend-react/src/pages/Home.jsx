import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTarefas } from "../hooks/useTarefas";
import { filtrarTarefas, pesquisarTarefas } from "../utils/tarefas";
import Abas from "../components/Abas";
import Calendario from "../components/Calendario";
import CampoPesquisa from "../components/CampoPesquisa";
import LinhaTarefa from "../components/LinhaTarefa";
import MensagemTabela from "../components/MensagemTabela";
import { IconeAtividades, IconeCheck, IconeRelogio, IconeCalendario } from "../components/Icones";

const ABAS = [
    { rotulo: "Todas", filtro: "todas" },
    { rotulo: "Pendentes", filtro: "pendente" },
    { rotulo: "Em andamento", filtro: "em andamento" },
    { rotulo: "Concluídas", filtro: "concluido" },
    { rotulo: "Atividades", filtro: null } // leva para a página completa
];

function CartaoContagem({ valor, rotulo, corIcone, children }) {
    return (
        <div className="bg-white border border-[#d1d1d6] rounded-xl px-3 py-3 xl:px-4 xl:py-3.5 flex items-center justify-center gap-3.5 shadow-sm max-w-[200px] w-full mx-auto">
            <div className={`w-9 h-9 xl:w-10 xl:h-10 rounded-full ${corIcone} flex items-center justify-center text-white shrink-0`}>
                {children}
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-lg xl:text-xl font-bold text-[#1c1c1e] leading-none">{valor}</span>
                <span className="text-[11px] xl:text-xs text-[#6e6e73] mt-1 font-medium leading-tight whitespace-nowrap">
                    {rotulo}
                </span>
            </div>
        </div>
    );
}

export default function Home() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const { tarefas, carregando, erro, recarregar } = useTarefas();

    const [filtro, setFiltro] = useState("todas");
    const [pesquisa, setPesquisa] = useState("");

    const ativas = filtrarTarefas(tarefas, "todas");
    const contar = status => ativas.filter(t => t.status === status).length;

    const lista = pesquisarTarefas(filtrarTarefas(tarefas, filtro), pesquisa);

    function aoSelecionarAba(aba) {
        if (!aba.filtro) {
            navigate("/atividades");
            return;
        }
        setFiltro(aba.filtro);
    }

    return (
        <div className="flex flex-col gap-6">

            {/* CABEÇALHO */}
            <div className="w-full flex items-center gap-6">
                <div className="text-base text-[#6F0049] whitespace-nowrap">
                    <span>{usuario?.nome || "Usuário"}</span>
                    {usuario?.setor && (
                        <>
                            <span> : </span>
                            <strong className="text-[#1c1c1e]">{usuario.setor}</strong>
                        </>
                    )}
                </div>

                {/* PESQUISA */}
                <CampoPesquisa
                    valor={pesquisa}
                    aoMudar={setPesquisa}
                    className="w-full max-w-[450px] 2xl:max-w-[550px]"
                />
            </div>

            {/* DASHBOARD */}
            <section className="flex flex-col gap-6">

                {/* CARDS + CALENDÁRIO */}
                <div className="w-full grid grid-cols-1 xl:grid-cols-[1fr_260px] 2xl:grid-cols-[1fr_280px] gap-6 items-stretch">

                    {/* CARDS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 xl:gap-5">
                        <CartaoContagem valor={ativas.length} rotulo="Total de atividades" corIcone="bg-[#6F0049]">
                            <IconeAtividades tamanho={20} />
                        </CartaoContagem>
                        <CartaoContagem valor={contar("concluido")} rotulo="Concluído" corIcone="bg-[#54565B]">
                            <IconeCheck />
                        </CartaoContagem>
                        <CartaoContagem valor={contar("em andamento")} rotulo="Em andamento" corIcone="bg-[#6F0049]">
                            <IconeRelogio />
                        </CartaoContagem>
                        <CartaoContagem valor={contar("pendente")} rotulo="Pendente" corIcone="bg-[#54565B]">
                            <IconeCalendario />
                        </CartaoContagem>
                    </div>

                    {/* CALENDÁRIO */}
                    <Calendario />
                </div>

                {/* MINHAS ATIVIDADES */}
                <section className="w-full flex flex-col">
                    <h2 className="text-base font-bold text-[#1c1c1e] mb-3">
                        Minhas atividades
                    </h2>

                    {/* ABAS */}
                    <Abas abas={ABAS} filtroAtivo={filtro} aoSelecionar={aoSelecionarAba} />

                    {/* TABELA */}
                    <div className="w-full bg-white border border-[#d1d1d6] border-t-0 rounded-b-xl divide-y divide-gray-100 shadow-sm">
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
                            <LinhaTarefa key={tarefa.id} tarefa={tarefa} aoAlterar={recarregar} />
                        ))}
                    </div>
                </section>
            </section>
        </div>
    );
}

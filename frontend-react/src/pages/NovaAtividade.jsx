import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";
import { IconeClipe, IconeX } from "../components/Icones";

const PESSOAS = [
    "Isadora Cabral dos Santos",
    "Maiko Fernandes",
    "Ícaro Guminiak de Godoy"
];

function dataDeHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

const classesCampo =
    "w-full border border-[#d1d1d6] rounded-lg p-2.5 text-xs xl:text-sm outline-none focus:border-[#6F0049] transition-colors bg-white";

export default function NovaAtividade() {
    const navigate = useNavigate();

    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [responsavel, setResponsavel] = useState("");
    const [participantes, setParticipantes] = useState("");
    const [dataVencimento, setDataVencimento] = useState("");
    const [prioridade, setPrioridade] = useState("Alta");
    const [arquivos, setArquivos] = useState([]);
    const [salvando, setSalvando] = useState(false);

    const dataInicio = dataDeHoje();

    function adicionarArquivos(evento) {
        setArquivos(atuais => [...atuais, ...Array.from(evento.target.files)]);
        evento.target.value = "";
    }

    function removerArquivo(indice) {
        setArquivos(atuais => atuais.filter((_, i) => i !== indice));
    }

    async function salvar(evento) {
        evento.preventDefault();

        /* MONTA A TAREFA NO FORMATO DO BANCO (tabela tarefas) */
        const novaTarefa = {
            titulo,
            descricao,
            responsavel,
            participantes,
            data_inicio: dataInicio,
            data_conclusao: dataVencimento,
            prioridade: Formato.prioridade.doFormulario[prioridade] || "medio",
            status: "pendente"
        };

        /* ENVIA PARA A API -> MySQL */
        setSalvando(true);
        try {
            const salva = await Api.criarTarefa(novaTarefa);

            // A tela de confirmação só mostra o resumo do que foi gravado
            localStorage.setItem("ultima_atividade_criada", JSON.stringify({
                id: salva.id,
                codigo: Formato.codigo(salva.id),
                titulo: salva.titulo,
                responsavel: salva.responsavel,
                participantes: salva.participantes,
                dataInicio: salva.data_inicio,
                dataVencimento: salva.data_conclusao,
                prioridade
            }));

            navigate("/atividades/confirmacao");
        } catch (erro) {
            alert("Não foi possível salvar a atividade: " + erro.message);
            setSalvando(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">

            {/* BOTÃO VOLTAR */}
            <div>
                <Link
                    to="/atividades"
                    className="inline-flex items-center gap-1.5 text-[#6F0049] font-semibold text-sm hover:underline no-underline"
                >
                    <span>&lt; Voltar</span>
                </Link>
            </div>

            {/* TÍTULO E SUBTÍTULO */}
            <div>
                <h1 className="text-xl font-bold text-[#1c1c1e]">Nova Atividade</h1>
                <p className="text-xs text-[#6e6e73] mt-0.5">
                    Preencha as informações para cadastrar uma nova atividade
                </p>
            </div>

            {/* FORMULÁRIO */}
            <form onSubmit={salvar} className="w-full flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">

                    {/* COLUNA ESQUERDA */}
                    <div className="flex flex-col gap-6">

                        {/* CARD 1: INFORMAÇÕES BÁSICAS */}
                        <div className="bg-white border border-[#d1d1d6] rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-[#1c1c1e]">Informações básicas</h2>

                            {/* TÍTULO */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="titulo" className="text-xs font-semibold text-[#3a3a3c]">
                                    Título da atividade <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="titulo"
                                    required
                                    value={titulo}
                                    onChange={evento => setTitulo(evento.target.value)}
                                    className={classesCampo}
                                />
                            </div>

                            {/* DESCRIÇÃO */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="descricao" className="text-xs font-semibold text-[#3a3a3c]">
                                    Descrição <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="descricao"
                                    required
                                    rows={4}
                                    value={descricao}
                                    onChange={evento => setDescricao(evento.target.value)}
                                    className={classesCampo + " resize-none"}
                                ></textarea>
                            </div>

                            {/* ARQUIVOS */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-[#3a3a3c]">
                                    Arquivos <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col gap-2.5">
                                    <div>
                                        <label className="border border-[#d1d1d6] hover:bg-gray-50 text-[#3a3a3c] rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
                                            <span>Adicionar arquivos</span>
                                            <IconeClipe />
                                            <input
                                                type="file"
                                                multiple
                                                onChange={adicionarArquivos}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* LISTA DE ARQUIVOS */}
                                    <div className="flex flex-wrap gap-2">
                                        {arquivos.map((arquivo, indice) => (
                                            <div
                                                key={arquivo.name + indice}
                                                className="flex items-center gap-2 bg-[#f2f2f4] border border-[#d1d1d6] text-[#1c1c1e] text-xs px-3 py-1.5 rounded-lg shadow-sm"
                                            >
                                                <span className="truncate max-w-[180px] font-medium">
                                                    {arquivo.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removerArquivo(indice)}
                                                    className="text-[#6e6e73] hover:text-red-600 transition-colors cursor-pointer flex items-center justify-center"
                                                >
                                                    <IconeX />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: ATRIBUIÇÕES */}
                        <div className="bg-white border border-[#d1d1d6] rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-[#1c1c1e]">Atribuições</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* RESPONSÁVEL */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="responsavel" className="text-xs font-semibold text-[#3a3a3c]">
                                        Responsável <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="responsavel"
                                        required
                                        value={responsavel}
                                        onChange={evento => setResponsavel(evento.target.value)}
                                        className={classesCampo + " text-[#3a3a3c] cursor-pointer"}
                                    >
                                        <option value="" disabled>Selecione um responsável</option>
                                        {PESSOAS.map(pessoa => (
                                            <option key={pessoa} value={pessoa}>{pessoa}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* PARTICIPANTES */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="participantes" className="text-xs font-semibold text-[#3a3a3c]">
                                        Participantes
                                    </label>
                                    <select
                                        id="participantes"
                                        value={participantes}
                                        onChange={evento => setParticipantes(evento.target.value)}
                                        className={classesCampo + " text-[#3a3a3c] cursor-pointer"}
                                    >
                                        <option value="" disabled>Selecione participantes (opcional)</option>
                                        {PESSOAS.map(pessoa => (
                                            <option key={pessoa} value={pessoa}>{pessoa}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA */}
                    <div className="flex flex-col gap-6">

                        {/* CARD 3: DATA E PRAZO */}
                        <div className="bg-white border border-[#d1d1d6] rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-[#1c1c1e]">Data e prazo</h2>

                            {/* DATA DE INÍCIO (HOJE) */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="dataInicio" className="text-xs font-semibold text-[#3a3a3c]">
                                    Data de início
                                </label>
                                <input
                                    type="date"
                                    id="dataInicio"
                                    readOnly
                                    value={dataInicio}
                                    className="w-full border border-[#d1d1d6] rounded-lg p-2.5 text-xs xl:text-sm text-[#3a3a3c] outline-none bg-[#f2f2f4] cursor-not-allowed"
                                />
                            </div>

                            {/* DATA DE VENCIMENTO */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="dataVencimento" className="text-xs font-semibold text-[#3a3a3c]">
                                    Data de vencimento
                                </label>
                                <input
                                    type="date"
                                    id="dataVencimento"
                                    value={dataVencimento}
                                    onChange={evento => setDataVencimento(evento.target.value)}
                                    className={classesCampo + " text-[#3a3a3c]"}
                                />
                            </div>

                            {/* PRIORIDADE */}
                            <div className="flex flex-col gap-2 pt-1">
                                <label className="text-xs font-semibold text-[#3a3a3c]">Prioridade</label>
                                <div className="flex flex-col gap-2">
                                    {["Alta", "Média", "Baixa"].map(opcao => (
                                        <label
                                            key={opcao}
                                            className="inline-flex items-center gap-2.5 text-xs text-[#3a3a3c] cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name="prioridade"
                                                value={opcao}
                                                checked={prioridade === opcao}
                                                onChange={() => setPrioridade(opcao)}
                                                className="w-4 h-4 accent-[#6F0049] cursor-pointer"
                                            />
                                            <span>{opcao}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* BOTÕES */}
                        <div className="flex items-center justify-end gap-3 mt-2">
                            <Link
                                to="/atividades"
                                className="border border-[#6F0049] text-[#6F0049] hover:bg-[#6F0049]/5 font-medium text-xs xl:text-sm px-6 py-2.5 rounded-lg transition-colors no-underline"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={salvando}
                                className="bg-[#6F0049] hover:bg-[#560039] text-white font-medium text-xs xl:text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Salvar Atividade
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

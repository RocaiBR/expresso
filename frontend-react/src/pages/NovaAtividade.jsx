import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Api } from "../services/api";
import { Formato } from "../utils/formato";
import { ACEITOS, validarArquivo } from "../utils/anexos";
import { IconeClipe, IconeX } from "../components/Icones";
import SeletorParticipantes from "../components/SeletorParticipantes";

function dataDeHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

const classesCampo =
    "w-full border border-borda rounded-lg p-2.5 text-xs xl:text-sm outline-none focus:border-marca-texto transition-colors bg-superficie";

export default function NovaAtividade() {
    const navigate = useNavigate();

    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    // Quem pode ser responsável depende do cargo (a API devolve a lista; o primeiro é quem está logado)
    const [pessoas, setPessoas] = useState([]);
    const [responsavel, setResponsavel] = useState("");
    // Participantes: só usuários cadastrados (a API grava os nomes a partir dos ids)
    const [usuariosParticipantes, setUsuariosParticipantes] = useState([]);
    const [participantesIds, setParticipantesIds] = useState([]);
    const [dataVencimento, setDataVencimento] = useState("");
    const [prioridade, setPrioridade] = useState("Alta");
    const [arquivos, setArquivos] = useState([]);
    const [salvando, setSalvando] = useState(false);
    // Envio dos anexos depois de criar a tarefa: { atual, total, progresso (0 a 1) }
    const [envio, setEnvio] = useState(null);

    const dataInicio = dataDeHoje();

    useEffect(() => {
        let ativo = true;
        Api.listarAtribuiveis()
            .then(lista => {
                if (!ativo) return;
                setPessoas(lista);
                if (lista.length > 0) setResponsavel(String(lista[0].id));
            })
            .catch(erro => alert("Não foi possível carregar os responsáveis: " + erro.message));
        Api.listarParticipantes()
            .then(lista => {
                if (ativo) setUsuariosParticipantes(lista);
            })
            .catch(erro => console.warn("Não foi possível carregar os participantes:", erro.message));
        return () => { ativo = false; };
    }, []);

    function adicionarArquivos(evento) {
        const escolhidos = Array.from(evento.target.files);
        const recusados = escolhidos.map(validarArquivo).filter(Boolean);
        if (recusados.length > 0) alert("Arquivos não adicionados:\n" + recusados.join("\n"));

        setArquivos(atuais => [...atuais, ...escolhidos.filter(arquivo => !validarArquivo(arquivo))]);
        evento.target.value = "";
    }

    // Envia um arquivo por vez; devolve os nomes dos que falharam
    async function enviarArquivos(tarefaId) {
        const falhas = [];
        for (let indice = 0; indice < arquivos.length; indice++) {
            setEnvio({ atual: indice + 1, total: arquivos.length, progresso: 0 });
            try {
                await Api.anexarArquivo(tarefaId, arquivos[indice], progresso => {
                    setEnvio({ atual: indice + 1, total: arquivos.length, progresso });
                });
            } catch (erro) {
                falhas.push(arquivos[indice].name + " (" + erro.message + ")");
            }
        }
        return falhas;
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
            usuario_id: Number(responsavel),
            participantes_ids: participantesIds,
            data_inicio: dataInicio,
            data_conclusao: dataVencimento,
            prioridade: Formato.prioridade.doFormulario[prioridade] || "medio",
            status: "pendente"
        };

        /* ENVIA PARA A API -> Firestore */
        setSalvando(true);
        try {
            const salva = await Api.criarTarefa(novaTarefa);

            /* ENVIA OS ARQUIVOS -> Storage (a tarefa já existe, então uma falha não desfaz o cadastro) */
            const falhas = await enviarArquivos(salva.id);
            if (falhas.length > 0) {
                alert(
                    "A atividade foi criada, mas estes arquivos não foram enviados:\n" + falhas.join("\n") +
                    "\n\nVocê pode anexá-los de novo na tela de detalhes da atividade."
                );
            }

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
            setEnvio(null);
        }
    }

    function textoDoBotao() {
        if (envio) {
            return "Enviando arquivo " + envio.atual + " de " + envio.total + "... " + Math.round(envio.progresso * 100) + "%";
        }
        return salvando ? "Salvando..." : "Salvar Atividade";
    }

    return (
        <div className="flex flex-col gap-4">

            {/* BOTÃO VOLTAR */}
            <div>
                <Link
                    to="/atividades"
                    className="inline-flex items-center gap-1.5 text-marca-texto font-semibold text-sm hover:underline no-underline"
                >
                    <span>&lt; Voltar</span>
                </Link>
            </div>

            {/* TÍTULO E SUBTÍTULO */}
            <div>
                <h1 className="text-xl font-bold text-texto">Nova Atividade</h1>
                <p className="text-xs text-texto-suave mt-0.5">
                    Preencha as informações para cadastrar uma nova atividade
                </p>
            </div>

            {/* FORMULÁRIO */}
            <form onSubmit={salvar} className="w-full flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">

                    {/* COLUNA ESQUERDA */}
                    <div className="flex flex-col gap-6">

                        {/* CARD 1: INFORMAÇÕES BÁSICAS */}
                        <div className="bg-superficie border border-borda rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-texto">Informações básicas</h2>

                            {/* TÍTULO */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="titulo" className="text-xs font-semibold text-texto-2">
                                    Título da atividade <span className="text-perigo">*</span>
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
                                <label htmlFor="descricao" className="text-xs font-semibold text-texto-2">
                                    Descrição <span className="text-perigo">*</span>
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
                                <label className="text-xs font-semibold text-texto-2">
                                    Arquivos <span className="text-perigo">*</span>
                                </label>
                                <div className="flex flex-col gap-2.5">
                                    <div>
                                        <label className="border border-borda hover:bg-superficie-hover text-texto-2 rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
                                            <span>Adicionar arquivos</span>
                                            <IconeClipe />
                                            <input
                                                type="file"
                                                multiple
                                                accept={ACEITOS}
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
                                                className="flex items-center gap-2 bg-fundo border border-borda text-texto text-xs px-3 py-1.5 rounded-lg shadow-sm"
                                            >
                                                <span className="truncate max-w-[180px] font-medium">
                                                    {arquivo.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removerArquivo(indice)}
                                                    className="text-texto-suave hover:text-perigo transition-colors cursor-pointer flex items-center justify-center"
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
                        <div className="bg-superficie border border-borda rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-texto">Atribuições</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* RESPONSÁVEL */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="responsavel" className="text-xs font-semibold text-texto-2">
                                        Responsável <span className="text-perigo">*</span>
                                    </label>
                                    <select
                                        id="responsavel"
                                        required
                                        value={responsavel}
                                        onChange={evento => {
                                            // Quem vira responsável deixa de ser participante
                                            setResponsavel(evento.target.value);
                                            setParticipantesIds(atuais => atuais.filter(id => id !== Number(evento.target.value)));
                                        }}
                                        disabled={pessoas.length <= 1}
                                        className={classesCampo + " text-texto-2 cursor-pointer disabled:bg-fundo disabled:cursor-not-allowed"}
                                    >
                                        <option value="" disabled>Selecione um responsável</option>
                                        {pessoas.map((pessoa, indice) => (
                                            <option key={pessoa.id} value={pessoa.id}>
                                                {pessoa.nome}{indice === 0 ? " (você)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* PARTICIPANTES */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="participantes" className="text-xs font-semibold text-texto-2">
                                        Participantes
                                    </label>
                                    <SeletorParticipantes
                                        id="participantes"
                                        opcoes={usuariosParticipantes}
                                        selecionados={participantesIds}
                                        aoMudar={setParticipantesIds}
                                        excluirId={Number(responsavel)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA */}
                    <div className="flex flex-col gap-6">

                        {/* CARD 3: DATA E PRAZO */}
                        <div className="bg-superficie border border-borda rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <h2 className="text-sm font-bold text-texto">Data e prazo</h2>

                            {/* DATA DE INÍCIO (HOJE) */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="dataInicio" className="text-xs font-semibold text-texto-2">
                                    Data de início
                                </label>
                                <input
                                    type="date"
                                    id="dataInicio"
                                    readOnly
                                    value={dataInicio}
                                    className="w-full border border-borda rounded-lg p-2.5 text-xs xl:text-sm text-texto-2 outline-none bg-fundo cursor-not-allowed"
                                />
                            </div>

                            {/* DATA DE VENCIMENTO */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="dataVencimento" className="text-xs font-semibold text-texto-2">
                                    Data de vencimento
                                </label>
                                <input
                                    type="date"
                                    id="dataVencimento"
                                    value={dataVencimento}
                                    onChange={evento => setDataVencimento(evento.target.value)}
                                    className={classesCampo + " text-texto-2"}
                                />
                            </div>

                            {/* PRIORIDADE */}
                            <div className="flex flex-col gap-2 pt-1">
                                <label className="text-xs font-semibold text-texto-2">Prioridade</label>
                                <div className="flex flex-col gap-2">
                                    {["Alta", "Média", "Baixa"].map(opcao => (
                                        <label
                                            key={opcao}
                                            className="inline-flex items-center gap-2.5 text-xs text-texto-2 cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name="prioridade"
                                                value={opcao}
                                                checked={prioridade === opcao}
                                                onChange={() => setPrioridade(opcao)}
                                                className="w-4 h-4 accent-marca-texto cursor-pointer"
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
                                className="border border-marca-texto text-marca-texto hover:bg-marca-texto/10 font-medium text-xs xl:text-sm px-6 py-2.5 rounded-lg transition-colors no-underline"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={salvando}
                                className="bg-marca hover:bg-marca-escura text-white font-medium text-xs xl:text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {textoDoBotao()}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

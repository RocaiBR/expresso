import { useCallback, useRef, useState } from "react";
import { useFecharAoClicarFora } from "../hooks/useFecharAoClicarFora";
import { normalizarTexto } from "../utils/tarefas";
import { IconeX } from "./Icones";

/* Escolha de participantes entre os usuários cadastrados: etiquetas com os escolhidos,
   busca pelo nome e lista com caixinhas. "excluirId" (o responsável) não aparece na lista. */
export default function SeletorParticipantes({ id, opcoes, selecionados, aoMudar, excluirId }) {
    const [aberto, setAberto] = useState(false);
    const [busca, setBusca] = useState("");
    const areaRef = useRef(null);
    const entradaRef = useRef(null);

    useFecharAoClicarFora(areaRef, useCallback(() => setAberto(false), []));

    const escolhidos = selecionados
        .map(idUsuario => opcoes.find(opcao => opcao.id === idUsuario))
        .filter(Boolean);
    const termo = normalizarTexto(busca);
    const disponiveis = opcoes.filter(opcao =>
        opcao.id !== excluirId && normalizarTexto(opcao.nome).includes(termo)
    );

    function alternar(idUsuario) {
        aoMudar(selecionados.includes(idUsuario)
            ? selecionados.filter(item => item !== idUsuario)
            : [...selecionados, idUsuario]);
    }

    function aoTeclar(evento) {
        // Apagar com o campo vazio tira o último escolhido; Esc fecha a lista
        if (evento.key === "Backspace" && !busca && selecionados.length > 0) {
            aoMudar(selecionados.slice(0, -1));
        }
        if (evento.key === "Escape") setAberto(false);
    }

    return (
        <div className="relative" ref={areaRef}>
            <div
                onClick={() => {
                    setAberto(true);
                    entradaRef.current.focus();
                }}
                className={
                    "w-full min-h-[42px] border rounded-lg px-2 py-1.5 bg-superficie flex flex-wrap items-center gap-1.5 cursor-text transition-colors " +
                    (aberto ? "border-marca-texto" : "border-borda")
                }
            >
                {escolhidos.map(pessoa => (
                    <span
                        key={pessoa.id}
                        className="flex items-center gap-1.5 bg-realce text-texto text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-md"
                    >
                        {pessoa.nome}
                        <button
                            type="button"
                            onClick={evento => {
                                evento.stopPropagation();
                                alternar(pessoa.id);
                            }}
                            title={"Tirar " + pessoa.nome}
                            className="text-texto-suave hover:text-perigo cursor-pointer flex items-center"
                        >
                            <IconeX tamanho={11} />
                        </button>
                    </span>
                ))}
                <input
                    id={id}
                    ref={entradaRef}
                    type="text"
                    value={busca}
                    onChange={evento => {
                        setBusca(evento.target.value);
                        setAberto(true);
                    }}
                    onFocus={() => setAberto(true)}
                    onKeyDown={aoTeclar}
                    placeholder={escolhidos.length === 0 ? "Escolha entre os usuários (opcional)" : ""}
                    autoComplete="off"
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-xs xl:text-sm text-texto-2 py-1 px-1"
                />
            </div>

            {aberto && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto bg-superficie border border-borda rounded-lg shadow-[0_8px_24px_rgba(0,0,0,.12)]">
                    {disponiveis.length === 0 && (
                        <p className="px-3 py-3 text-xs text-texto-suave text-center">
                            {opcoes.length === 0 ? "Carregando usuários..." : "Nenhum usuário encontrado."}
                        </p>
                    )}
                    {disponiveis.map(pessoa => (
                        <label
                            key={pessoa.id}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs xl:text-sm text-texto cursor-pointer hover:bg-superficie-hover"
                        >
                            <input
                                type="checkbox"
                                checked={selecionados.includes(pessoa.id)}
                                onChange={() => alternar(pessoa.id)}
                                className="w-4 h-4 accent-marca-texto cursor-pointer"
                            />
                            <span>{pessoa.nome}</span>
                            {pessoa.setor && <span className="ml-auto text-[11px] text-texto-fraco">{pessoa.setor}</span>}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

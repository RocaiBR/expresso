import { IconePesquisa } from "./Icones";

/* Campo de pesquisa (Esc limpa o texto) */
export default function CampoPesquisa({ valor, aoMudar, className = "" }) {
    return (
        <div className={"h-[40px] bg-superficie border border-borda rounded-[10px] flex items-center px-3.5 gap-2.5 shadow-sm " + className}>
            <span className="text-texto-fraco">
                <IconePesquisa />
            </span>
            <input
                type="search"
                autoComplete="off"
                placeholder="Pesquisar por código, título, responsável..."
                className="border-none outline-none w-full text-sm bg-transparent"
                value={valor}
                onChange={evento => aoMudar(evento.target.value)}
                onKeyDown={evento => {
                    if (evento.key === "Escape") aoMudar("");
                }}
            />
        </div>
    );
}

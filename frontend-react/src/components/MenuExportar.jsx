import { useCallback, useRef, useState } from "react";
import { IconeBaixar, IconeSetaBaixo } from "./Icones";
import { useFecharAoClicarFora } from "../hooks/useFecharAoClicarFora";

const FORMATOS = [
    { valor: "csv", rotulo: "CSV", detalhe: "Planilha simples, abre em qualquer programa" },
    { valor: "excel", rotulo: "Excel", detalhe: "Resumo, atividades, backlog e tempo de conclusão" },
    { valor: "powerbi", rotulo: "Power BI", detalhe: "Tabelas com calendário, prontas para importar" },
    { valor: "pdf", rotulo: "PDF", detalhe: "Relatório com os gráficos, para imprimir ou enviar" }
];

/* Botão "Exportar" dos relatórios, com a escolha do formato */
export default function MenuExportar({ desabilitado, gerando, aoEscolher }) {
    const [aberto, setAberto] = useState(false);
    const areaRef = useRef(null);
    useFecharAoClicarFora(areaRef, useCallback(() => setAberto(false), []));

    function escolher(formato) {
        setAberto(false);
        aoEscolher(formato);
    }

    return (
        <div className="relative" ref={areaRef}>
            <button
                type="button"
                onClick={() => setAberto(atual => !atual)}
                disabled={desabilitado || Boolean(gerando)}
                aria-haspopup="menu"
                aria-expanded={aberto}
                title="Baixa as atividades do período com os filtros aplicados"
                className="h-[32px] bg-superficie border border-marca-texto text-marca-texto hover:bg-realce rounded-md px-4 flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <IconeBaixar tamanho={13} />
                <span>{gerando ? "Gerando..." : "Exportar"}</span>
                <IconeSetaBaixo tamanho={10} />
            </button>

            {aberto && (
                <div
                    role="menu"
                    aria-label="Formato do arquivo"
                    className="absolute right-0 top-[calc(100%+6px)] w-[270px] bg-superficie border border-borda rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.12)] p-1.5 z-50"
                >
                    {FORMATOS.map(formato => (
                        <button
                            key={formato.valor}
                            type="button"
                            role="menuitem"
                            onClick={() => escolher(formato.valor)}
                            className="w-full text-left bg-transparent border-0 rounded-lg px-3 py-2 cursor-pointer hover:bg-superficie-hover flex flex-col gap-0.5"
                        >
                            <span className="text-sm font-semibold text-texto">{formato.rotulo}</span>
                            <span className="text-[11px] text-texto-suave">{formato.detalhe}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useCallback, useRef, useState } from "react";
import { useFecharAoClicarFora } from "../hooks/useFecharAoClicarFora";
import { IconeCalendarioVazado, IconeSetaBaixo } from "./Icones";
import {
    chaveDoDia, formatarDia, periodoEsteMes, periodoUltimosDias, periodoUltimosMeses
} from "../utils/relatorios";

const ATALHOS = [
    { rotulo: "Últimos 7 dias", gerar: () => periodoUltimosDias(7) },
    { rotulo: "Últimos 30 dias", gerar: () => periodoUltimosDias(30) },
    { rotulo: "Este mês", gerar: periodoEsteMes },
    { rotulo: "Últimos 6 meses", gerar: () => periodoUltimosMeses(6) }
];

const classesData =
    "h-[30px] w-full border border-[#d1d1d6] rounded-md px-2 text-xs text-[#1c1c1e] outline-none focus:border-[#6F0049] bg-white";

/* Botão "dd/mm/aaaa - dd/mm/aaaa" que abre atalhos e um intervalo personalizado */
export default function SeletorPeriodo({ periodo, aoMudar }) {
    const [aberto, setAberto] = useState(false);
    const [inicio, setInicio] = useState(periodo.inicio);
    const [fim, setFim] = useState(periodo.fim);
    const areaRef = useRef(null);

    useFecharAoClicarFora(areaRef, useCallback(() => setAberto(false), []));

    const hoje = chaveDoDia(new Date());
    const intervaloValido = Boolean(inicio && fim) && inicio <= fim && fim <= hoje;

    function abrirOuFechar() {
        if (!aberto) {
            setInicio(periodo.inicio);
            setFim(periodo.fim);
        }
        setAberto(!aberto);
    }

    function escolher(novoPeriodo) {
        aoMudar(novoPeriodo);
        setAberto(false);
    }

    function aplicarPersonalizado(evento) {
        evento.preventDefault();
        if (intervaloValido) escolher({ inicio, fim });
    }

    return (
        <div className="relative" ref={areaRef}>
            <button
                type="button"
                onClick={abrirOuFechar}
                aria-expanded={aberto}
                aria-label="Período do relatório"
                className="h-[32px] bg-white border border-[#d1d1d6] rounded-md px-3 flex items-center gap-2.5 text-xs text-[#1c1c1e] cursor-pointer hover:border-[#b9b9be] transition-colors whitespace-nowrap"
            >
                <IconeCalendarioVazado />
                <span>{formatarDia(periodo.inicio)} - {formatarDia(periodo.fim)}</span>
                <IconeSetaBaixo />
            </button>

            {aberto && (
                <div className="absolute right-0 top-[calc(100%+6px)] w-[300px] max-w-[calc(100vw-2rem)] bg-white border border-[#d1d1d6] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,.12)] p-3 z-20 flex flex-col gap-3">

                    {/* ATALHOS */}
                    <div className="flex flex-col">
                        {ATALHOS.map(atalho => (
                            <button
                                key={atalho.rotulo}
                                type="button"
                                onClick={() => escolher(atalho.gerar())}
                                className="text-left text-xs text-[#1c1c1e] px-2.5 py-2 rounded-md bg-transparent border-0 cursor-pointer hover:bg-[#f4e8f0] transition-colors"
                            >
                                {atalho.rotulo}
                            </button>
                        ))}
                    </div>

                    <hr className="border-0 border-t border-[#e2e2e7]" />

                    {/* PERSONALIZADO */}
                    <form onSubmit={aplicarPersonalizado} className="flex flex-col gap-2.5">
                        <span className="text-xs font-semibold text-[#3a3a3c]">Personalizado</span>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex flex-col gap-1 text-[11px] text-[#6e6e73]">
                                De
                                <input
                                    type="date"
                                    value={inicio}
                                    max={fim || hoje}
                                    onChange={evento => setInicio(evento.target.value)}
                                    className={classesData}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] text-[#6e6e73]">
                                Até
                                <input
                                    type="date"
                                    value={fim}
                                    min={inicio}
                                    max={hoje}
                                    onChange={evento => setFim(evento.target.value)}
                                    className={classesData}
                                />
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={!intervaloValido}
                            className="h-[30px] bg-[#6F0049] hover:bg-[#560039] text-white text-xs font-medium rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Aplicar período
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

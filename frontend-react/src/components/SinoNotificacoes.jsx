import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Api } from "../services/api";
import { useFecharAoClicarFora } from "../hooks/useFecharAoClicarFora";
import { abreAtividade, tempoRelativo, textoDaNotificacao } from "../utils/notificacoes";
import { IconeSino } from "./Icones";

const INTERVALO_MS = 30000;

/* Sino da navbar: número de não lidas (consultado a cada 30 s) e a lista, carregada ao abrir */
export default function SinoNotificacoes() {
    const navigate = useNavigate();
    const [naoLidas, setNaoLidas] = useState(0);
    const [aberto, setAberto] = useState(false);
    const [lista, setLista] = useState(null);
    const [erro, setErro] = useState(null);
    const areaRef = useRef(null);

    useFecharAoClicarFora(areaRef, useCallback(() => setAberto(false), []));

    const atualizarContagem = useCallback(async function () {
        try {
            const resposta = await Api.contarNotificacoes();
            setNaoLidas(resposta.nao_lidas);
        } catch (erroApi) {
            console.warn("Não foi possível consultar as notificações:", erroApi.message);
        }
    }, []);

    // Consulta a contagem ao entrar, a cada 30 s (só com a aba visível) e ao voltar para a aba
    useEffect(() => {
        atualizarContagem();
        const intervalo = setInterval(() => {
            if (!document.hidden) atualizarContagem();
        }, INTERVALO_MS);
        function aoVoltarParaAba() {
            if (!document.hidden) atualizarContagem();
        }
        document.addEventListener("visibilitychange", aoVoltarParaAba);
        return () => {
            clearInterval(intervalo);
            document.removeEventListener("visibilitychange", aoVoltarParaAba);
        };
    }, [atualizarContagem]);

    async function abrirOuFechar() {
        if (aberto) {
            setAberto(false);
            return;
        }
        setAberto(true);
        setErro(null);
        try {
            const notificacoes = await Api.listarNotificacoes();
            setLista(notificacoes);
            setNaoLidas(notificacoes.filter(item => !item.lida).length);
        } catch (erroApi) {
            setErro(erroApi.message);
        }
    }

    async function clicarNotificacao(notificacao) {
        if (!notificacao.lida) {
            setLista(atual => atual.map(item => (item.id === notificacao.id ? { ...item, lida: true } : item)));
            setNaoLidas(atual => Math.max(0, atual - 1));
            Api.marcarNotificacaoLida(notificacao.id).catch(() => atualizarContagem());
        }
        if (abreAtividade(notificacao)) {
            setAberto(false);
            navigate("/atividades/" + notificacao.tarefa_id);
        }
    }

    async function marcarTodas() {
        setLista(atual => atual.map(item => ({ ...item, lida: true })));
        setNaoLidas(0);
        try {
            await Api.marcarTodasNotificacoesLidas();
        } catch (erroApi) {
            setErro(erroApi.message);
            atualizarContagem();
        }
    }

    return (
        <div className="relative" ref={areaRef}>
            <button
                className="relative bg-transparent border-0 text-white cursor-pointer flex items-center hover:opacity-80 transition-opacity"
                type="button"
                aria-label={naoLidas > 0 ? naoLidas + " notificações não lidas" : "Notificações"}
                title="Notificações"
                onClick={abrirOuFechar}
            >
                <IconeSino />
                {naoLidas > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-white text-[#6F0049] text-[10px] font-bold flex items-center justify-center leading-none">
                        {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                )}
            </button>

            {aberto && (
                <div className="absolute right-0 top-[calc(100%+12px)] w-[340px] bg-superficie border border-borda rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.12)] z-50 text-texto overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-borda-suave">
                        <span className="text-sm font-semibold">Notificações</span>
                        {lista && lista.some(item => !item.lida) && (
                            <button
                                type="button"
                                onClick={marcarTodas}
                                className="bg-transparent border-0 text-xs text-marca-texto font-semibold cursor-pointer hover:underline"
                            >
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto">
                        {erro && <p className="px-4 py-6 text-xs text-perigo text-center">{erro}</p>}
                        {!erro && lista === null && (
                            <p className="px-4 py-6 text-xs text-texto-suave text-center">Carregando...</p>
                        )}
                        {!erro && lista && lista.length === 0 && (
                            <p className="px-4 py-6 text-xs text-texto-suave text-center">Nenhuma notificação por enquanto.</p>
                        )}
                        {!erro && lista && lista.map(notificacao => (
                            <button
                                key={notificacao.id}
                                type="button"
                                onClick={() => clicarNotificacao(notificacao)}
                                className={
                                    "w-full text-left border-0 border-b border-borda-suave last:border-b-0 px-4 py-3 flex gap-2.5 cursor-pointer transition-colors " +
                                    (notificacao.lida ? "bg-superficie hover:bg-superficie-hover" : "bg-realce-suave hover:bg-realce")
                                }
                            >
                                <span
                                    className={"mt-1.5 w-2 h-2 rounded-full shrink-0 " + (notificacao.lida ? "bg-transparent" : "bg-marca")}
                                ></span>
                                <span className="flex flex-col gap-0.5">
                                    <span className={"text-xs leading-snug " + (notificacao.lida ? "text-texto-2" : "text-texto font-medium")}>
                                        {textoDaNotificacao(notificacao)}
                                    </span>
                                    <span className="text-[11px] text-texto-fraco">{tempoRelativo(notificacao.criada_em)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

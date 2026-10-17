import { useEffect, useState } from "react";
import { Api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ACEITOS, validarArquivo, formatarTamanho } from "../utils/anexos";
import { IconeClipe, IconeX } from "./Icones";

/* Arquivos da atividade: abre em outra aba, envia novos e remove.
   podeAnexar: pode enviar arquivos | podeRemoverTodos: remove qualquer um (senão só os que enviou) */
export default function Anexos({ tarefaId, podeAnexar = false, podeRemoverTodos = false }) {
    const { usuario } = useAuth();
    const [anexos, setAnexos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    // Arquivo sendo enviado agora: { nome, progresso (0 a 1) }
    const [envio, setEnvio] = useState(null);

    useEffect(() => {
        let ativo = true;
        async function carregar() {
            try {
                const lista = await Api.listarAnexos(tarefaId);
                if (ativo) setAnexos(lista);
            } catch (erroApi) {
                if (ativo) setErro(erroApi.message);
            } finally {
                if (ativo) setCarregando(false);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, [tarefaId]);

    async function adicionar(evento) {
        const escolhidos = Array.from(evento.target.files);
        evento.target.value = "";

        const recusados = escolhidos.map(validarArquivo).filter(Boolean);
        if (recusados.length > 0) alert("Arquivos não adicionados:\n" + recusados.join("\n"));

        for (const arquivo of escolhidos.filter(arquivo => !validarArquivo(arquivo))) {
            setEnvio({ nome: arquivo.name, progresso: 0 });
            try {
                const anexo = await Api.anexarArquivo(tarefaId, arquivo, progresso => {
                    setEnvio({ nome: arquivo.name, progresso });
                });
                setAnexos(atuais => [...atuais, anexo]);
            } catch (erroApi) {
                alert("Não foi possível enviar " + arquivo.name + ": " + erroApi.message);
            }
        }
        setEnvio(null);
    }

    async function remover(anexo) {
        if (!confirm('Remover o arquivo "' + anexo.nome + '"?')) return;
        try {
            await Api.excluirAnexo(tarefaId, anexo.id);
            setAnexos(atuais => atuais.filter(item => item.id !== anexo.id));
        } catch (erroApi) {
            alert("Não foi possível remover: " + erroApi.message);
        }
    }

    return (
        <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-xs font-semibold text-texto-suave">Arquivos</label>

                {/* ADICIONAR */}
                {podeAnexar && (
                    <label
                        className={
                            "border border-borda hover:bg-superficie-hover text-texto-2 rounded-full px-4 py-1.5 text-xs font-medium inline-flex items-center gap-2 transition-colors shadow-sm " +
                            (envio ? "opacity-50 pointer-events-none" : "cursor-pointer")
                        }
                    >
                        <span>Adicionar arquivos</span>
                        <IconeClipe />
                        <input type="file" multiple accept={ACEITOS} onChange={adicionar} className="hidden" />
                    </label>
                )}
            </div>

            <div className="w-full bg-superficie-2 border border-borda-suave rounded-[10px] px-3 py-2.5 min-h-[42px] flex flex-wrap items-center gap-2 text-sm">
                {carregando && <span className="text-texto-suave">Carregando arquivos...</span>}
                {!carregando && erro && <span className="text-perigo">{erro}</span>}
                {!carregando && !erro && anexos.length === 0 && !envio && (
                    <span className="text-texto-suave">Nenhum arquivo anexado.</span>
                )}

                {/* LISTA */}
                {anexos.map(anexo => (
                    <div
                        key={anexo.id}
                        className="flex items-center gap-2 bg-superficie border border-borda text-texto text-xs px-3 py-1.5 rounded-lg shadow-sm"
                    >
                        <a
                            href={anexo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={"Abrir " + anexo.nome}
                            className="truncate max-w-[220px] font-medium text-marca-texto no-underline hover:underline"
                        >
                            {anexo.nome}
                        </a>
                        <span className="text-texto-fraco">{formatarTamanho(anexo.tamanho)}</span>
                        {(podeRemoverTodos || (podeAnexar && anexo.enviado_por === usuario?.id)) && (
                            <button
                                type="button"
                                onClick={() => remover(anexo)}
                                title="Remover arquivo"
                                className="text-texto-suave hover:text-perigo transition-colors cursor-pointer flex items-center justify-center"
                            >
                                <IconeX />
                            </button>
                        )}
                    </div>
                ))}

                {/* ENVIO EM ANDAMENTO */}
                {envio && (
                    <span className="text-xs text-texto-suave">
                        Enviando {envio.nome}... {Math.round(envio.progresso * 100)}%
                    </span>
                )}
            </div>
        </div>
    );
}

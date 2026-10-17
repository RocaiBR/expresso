import { Formato } from "../utils/formato";

const classesSelect =
    "h-[32px] border border-[#d1d1d6] rounded-lg px-2 text-xs bg-white text-[#3a3a3c] cursor-pointer outline-none focus:border-[#6F0049] disabled:opacity-50 disabled:cursor-not-allowed";

/* Ações em várias atividades de uma vez. Cada ação vale só para as selecionadas em que
   o cargo permite (o número entre parênteses); as outras são ignoradas. */
export default function BarraSelecao({ selecionadas, pessoas, ocupado, aoMover, aoPassar, aoExcluir, aoCancelar }) {
    const podemMudarStatus = selecionadas.filter(tarefa => tarefa.permissoes?.status).length;
    const podemEditar = selecionadas.filter(tarefa => tarefa.permissoes?.editar).length;
    const podemExcluir = selecionadas.filter(tarefa => tarefa.permissoes?.excluir).length;
    const nada = selecionadas.length === 0 || ocupado;

    return (
        <div className="w-full bg-white border border-[#d1d1d6] rounded-xl shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-[#1c1c1e] min-w-[110px]">
                {ocupado ? "Aplicando..." : selecionadas.length + " selecionada(s)"}
            </span>

            {/* MOVER DE ETAPA */}
            <select
                value=""
                onChange={evento => aoMover(evento.target.value)}
                disabled={nada || podemMudarStatus === 0}
                className={classesSelect}
                title="Muda a etapa das selecionadas"
            >
                <option value="" disabled>Mover para... ({podemMudarStatus})</option>
                {Object.entries(Formato.status.rotulo).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                ))}
            </select>

            {/* TROCAR RESPONSÁVEL (só aparece se houver para quem passar) */}
            {pessoas.length > 1 && (
                <select
                    value=""
                    onChange={evento => aoPassar(Number(evento.target.value))}
                    disabled={nada || podemEditar === 0}
                    className={classesSelect}
                    title="Passa as selecionadas para outro responsável"
                >
                    <option value="" disabled>Passar para... ({podemEditar})</option>
                    {pessoas.map(pessoa => (
                        <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
                    ))}
                </select>
            )}

            {/* EXCLUIR */}
            <button
                type="button"
                onClick={aoExcluir}
                disabled={nada || podemExcluir === 0}
                className="h-[32px] px-3 rounded-lg border border-red-600 bg-white text-red-600 font-medium hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Excluir ({podemExcluir})
            </button>

            <button
                type="button"
                onClick={aoCancelar}
                disabled={ocupado}
                className="ml-auto h-[32px] px-3 rounded-lg text-[#6e6e73] hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
            >
                Cancelar seleção
            </button>
        </div>
    );
}

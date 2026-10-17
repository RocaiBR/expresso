/* Abas de filtro das listas de atividades */
export default function Abas({ abas, filtroAtivo, aoSelecionar }) {
    return (
        <div className="w-full h-[40px] flex bg-superficie border border-borda rounded-t-xl overflow-hidden">
            {abas.map(aba => {
                const ativa = aba.filtro === filtroAtivo;
                return (
                    <button
                        key={aba.rotulo}
                        type="button"
                        onClick={() => aoSelecionar(aba)}
                        className={
                            "flex-1 h-full border-0 bg-transparent text-xs xl:text-[13px] font-semibold relative flex items-center justify-center cursor-pointer transition-colors " +
                            (ativa ? "text-marca-texto" : "text-texto hover:bg-superficie-hover")
                        }
                    >
                        <span>{aba.rotulo}</span>
                        {ativa && (
                            <span className="absolute bottom-0 w-10 h-[2.5px] bg-marca rounded-full"></span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

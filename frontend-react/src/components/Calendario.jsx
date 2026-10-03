const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

/* Calendário do mês atual com o dia de hoje destacado */
export default function Calendario() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const diaAtual = hoje.getDate();

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();

    const celulas = [];
    for (let i = 0; i < primeiroDiaSemana; i++) {
        celulas.push(<span key={"vazio-" + i}></span>);
    }
    for (let dia = 1; dia <= totalDiasNoMes; dia++) {
        celulas.push(
            <span
                key={dia}
                className={
                    dia === diaAtual
                        ? "bg-[#6F0049] text-white rounded-full flex items-center justify-center w-5 h-5 mx-auto font-medium"
                        : undefined
                }
            >
                {dia}
            </span>
        );
    }

    return (
        <div className="bg-white border border-[#d1d1d6] rounded-xl p-3 xl:p-4 flex flex-col justify-between shadow-sm min-h-[170px]">
            <div className="text-center text-xs xl:text-sm font-bold text-[#54565B] mb-1 capitalize">
                {MESES[mes]} de {ano}
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] xl:text-xs font-bold text-[#8e8e93]">
                <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] xl:text-xs text-[#3a3a3c] gap-y-1 items-center">
                {celulas}
            </div>
        </div>
    );
}

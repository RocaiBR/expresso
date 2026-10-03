import { Link } from "react-router-dom";
import { Formato } from "../utils/formato";

function lerUltimaAtividade() {
    try {
        return JSON.parse(localStorage.getItem("ultima_atividade_criada") || "null");
    } catch (erro) {
        return null;
    }
}

function CampoLeitura({ rotulo, valor }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#3a3a3c]">{rotulo}</label>
            <input
                type="text"
                readOnly
                value={valor || ""}
                className="w-full border border-[#d1d1d6] rounded-lg p-2.5 text-xs xl:text-sm text-[#3a3a3c] bg-white outline-none"
            />
        </div>
    );
}

export default function Confirmacao() {
    const atividade = lerUltimaAtividade();

    return (
        <div className="flex flex-col gap-4">

            {/* BOTÃO VOLTAR */}
            <div>
                <Link
                    to="/atividades"
                    className="inline-flex items-center gap-1.5 text-[#6F0049] font-semibold text-sm hover:underline no-underline"
                >
                    <span>&lt; Voltar</span>
                </Link>
            </div>

            {/* TÍTULO E SUBTÍTULO */}
            <div>
                <h1 className="text-xl font-bold text-[#1c1c1e]">Atividade Criada</h1>
                <p className="text-xs text-[#6e6e73] mt-0.5">
                    Confira as informações da atividade cadastrada
                </p>
            </div>

            {/* CARD CENTRAL DE CONFIRMAÇÃO */}
            <div className="w-full max-w-[720px] mx-auto bg-white border border-[#d1d1d6] rounded-xl p-8 shadow-sm flex flex-col items-center gap-6 mt-2">

                {/* ÍCONE DE CHECK E MENSAGEM */}
                <div className="flex flex-col items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" fill="none" viewBox="0 0 24 24" stroke="#1c1c1e" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <h2 className="text-lg font-bold text-[#3a3a3c]">Atividade criada com sucesso!</h2>
                </div>

                {/* INFORMAÇÕES CADASTRADAS */}
                <div className="w-full flex flex-col gap-4">
                    <CampoLeitura rotulo="Título da atividade" valor={atividade?.titulo} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CampoLeitura rotulo="Data de início" valor={Formato.data(atividade?.dataInicio)} />
                        <CampoLeitura rotulo="Data de vencimento" valor={Formato.data(atividade?.dataVencimento)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CampoLeitura rotulo="Responsável" valor={atividade?.responsavel} />
                        <CampoLeitura rotulo="Participantes" valor={atividade?.participantes} />
                    </div>

                    <div className="pt-1">
                        <p className="text-xs font-semibold text-[#3a3a3c]">
                            Prioridade:{" "}
                            <span className="font-normal text-[#1c1c1e]">
                                {atividade?.prioridade || "—"}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-center gap-4 mt-2">
                <Link
                    to="/atividades/nova"
                    className="bg-[#6F0049] hover:bg-[#560039] text-white font-medium text-xs xl:text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors no-underline"
                >
                    Criar Nova
                </Link>
                <Link
                    to="/atividades"
                    className="border border-[#6F0049] text-[#6F0049] hover:bg-[#6F0049]/5 font-medium text-xs xl:text-sm px-6 py-2.5 rounded-lg transition-colors no-underline"
                >
                    Ver Atividade
                </Link>
            </div>
        </div>
    );
}

import { NavLink } from "react-router-dom";
import { IconeHome, IconeAtividades, IconeRelatorios, IconeUsuarios } from "./Icones";

const LINKS = [
    { para: "/", rotulo: "Home", Icone: IconeHome, exato: true },
    { para: "/atividades", rotulo: "Atividades", Icone: IconeAtividades },
    { para: "/relatorios", rotulo: "Relatórios", Icone: IconeRelatorios },
    { para: "/usuarios", rotulo: "Usuários", Icone: IconeUsuarios }
];

function classesDoLink({ isActive }) {
    const base = "flex items-center gap-3 px-[14px] py-[10px] rounded-[10px] text-sm no-underline transition-colors ";
    return isActive
        ? base + "bg-[#e8d0e0] text-[#1c1c1e] font-semibold hover:bg-[#e1c4d7]"
        : base + "text-[#3a3a3c] font-medium hover:bg-[#f4e8f0]";
}

export default function Sidebar() {
    return (
        <aside className="w-[200px] h-full bg-white border-r border-[#e2e2e7] p-3 py-5 shrink-0">
            <nav className="flex flex-col gap-[6px]">
                {LINKS.map(({ para, rotulo, Icone, exato }) => (
                    <NavLink key={para} to={para} end={exato} className={classesDoLink}>
                        <span className="flex items-center justify-center">
                            <Icone />
                        </span>
                        <span>{rotulo}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

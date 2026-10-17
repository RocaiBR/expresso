import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconeHome, IconeAtividades, IconeRelatorios, IconeUsuarios } from "./Icones";

// "somenteTI": o cadastro de usuários só aparece para o TI (a API também bloqueia)
const LINKS = [
    { para: "/", rotulo: "Home", Icone: IconeHome, exato: true },
    { para: "/atividades", rotulo: "Atividades", Icone: IconeAtividades },
    { para: "/relatorios", rotulo: "Relatórios", Icone: IconeRelatorios },
    { para: "/usuarios", rotulo: "Usuários", Icone: IconeUsuarios, somenteTI: true }
];

function classesDoLink({ isActive }) {
    const base = "flex items-center gap-3 px-[14px] py-[10px] rounded-[10px] text-sm no-underline transition-colors ";
    return isActive
        ? base + "bg-realce-forte text-texto font-semibold hover:bg-realce-forte-hover"
        : base + "text-texto-2 font-medium hover:bg-realce";
}

export default function Sidebar() {
    const { usuario } = useAuth();
    const links = LINKS.filter(link => !link.somenteTI || usuario?.funcao === "ti");

    return (
        <aside className="w-[200px] h-full bg-superficie border-r border-borda-suave p-3 py-5 shrink-0">
            <nav className="flex flex-col gap-[6px]">
                {links.map(({ para, rotulo, Icone, exato }) => (
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

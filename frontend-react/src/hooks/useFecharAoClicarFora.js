import { useEffect } from "react";

/* Chama "aoFechar" quando o usuário clica fora do elemento
   apontado por "ref" ou aperta Esc (menus e caixas suspensas). */
export function useFecharAoClicarFora(ref, aoFechar) {
    useEffect(() => {
        function aoClicarFora(evento) {
            if (ref.current && !ref.current.contains(evento.target)) aoFechar();
        }
        function aoApertarTecla(evento) {
            if (evento.key === "Escape") aoFechar();
        }
        document.addEventListener("click", aoClicarFora);
        document.addEventListener("keydown", aoApertarTecla);
        return () => {
            document.removeEventListener("click", aoClicarFora);
            document.removeEventListener("keydown", aoApertarTecla);
        };
    }, [ref, aoFechar]);
}

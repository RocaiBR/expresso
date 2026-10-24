import { useEffect, useState } from "react";

/* Tema do site: fica em <html data-tema="..."> e é lembrado neste navegador (localStorage)
   e na conta da pessoa (PUT /perfil/tema), para valer em qualquer aparelho. */

export const TEMAS = [
    { valor: "claro", rotulo: "Claro" },
    { valor: "escuro", rotulo: "Escuro" },
    { valor: "profundo", rotulo: "Escuro profundo" }
];

const CHAVE = "tema";
const EVENTO = "tema-mudou";

export function temaAtual() {
    return document.documentElement.dataset.tema || "claro";
}

export function aplicarTema(tema) {
    if (!TEMAS.some(opcao => opcao.valor === tema)) return;
    document.documentElement.dataset.tema = tema;
    try {
        localStorage.setItem(CHAVE, tema);
    } catch (erro) {
        // Navegador sem localStorage (ex.: modo privado restrito): vale só nesta aba
    }
    window.dispatchEvent(new Event(EVENTO));
}

// Para quem desenha com JavaScript (os gráficos): o valor atual de uma cor do tema
export function corDoTema(nome) {
    return getComputedStyle(document.documentElement).getPropertyValue("--cor-" + nome).trim();
}

// "#e892c6" + 0.16 -> "rgba(232, 146, 198, 0.16)"
export function comTransparencia(hex, alfa) {
    const valor = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map(inicio => parseInt(valor.slice(inicio, inicio + 2), 16));
    return "rgba(" + r + ", " + g + ", " + b + ", " + alfa + ")";
}

// Faz o componente redesenhar quando o tema muda
export function useTema() {
    const [tema, setTema] = useState(temaAtual);
    useEffect(() => {
        function aoMudar() {
            setTema(temaAtual());
        }
        window.addEventListener(EVENTO, aoMudar);
        return () => window.removeEventListener(EVENTO, aoMudar);
    }, []);
    return tema;
}

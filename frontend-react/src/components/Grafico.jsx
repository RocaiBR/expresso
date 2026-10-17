import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { corDoTema, useTema } from "../utils/tema";

// Mesma fonte do restante das telas (a cor do texto vem do tema, a cada desenho)
Chart.defaults.font.family =
    'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
Chart.defaults.font.size = 11;

/* Gráfico do Chart.js dentro de um <canvas>.
   É recriado sempre que os dados ou o tema mudam e destruído ao sair da tela. */
export default function Grafico({ tipo, dados, opcoes, plugins = [], descricao, className = "h-[220px]" }) {
    const canvasRef = useRef(null);
    const tema = useTema();

    useEffect(() => {
        Chart.defaults.color = corDoTema("texto-suave");
        const grafico = new Chart(canvasRef.current, {
            type: tipo,
            data: dados,
            options: { responsive: true, maintainAspectRatio: false, ...opcoes },
            plugins
        });
        return () => grafico.destroy();
    }, [tipo, dados, opcoes, plugins, tema]);

    return (
        <div className={"relative w-full " + className}>
            <canvas ref={canvasRef} role="img" aria-label={descricao}></canvas>
        </div>
    );
}

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

// Mesma fonte e cor de texto do restante das telas
Chart.defaults.font.family =
    'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
Chart.defaults.font.size = 11;
Chart.defaults.color = "#6e6e73";

/* Gráfico do Chart.js dentro de um <canvas>.
   É recriado sempre que os dados mudam e destruído ao sair da tela. */
export default function Grafico({ tipo, dados, opcoes, plugins = [], descricao, className = "h-[220px]" }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const grafico = new Chart(canvasRef.current, {
            type: tipo,
            data: dados,
            options: { responsive: true, maintainAspectRatio: false, ...opcoes },
            plugins
        });
        return () => grafico.destroy();
    }, [tipo, dados, opcoes, plugins]);

    return (
        <div className={"relative w-full " + className}>
            <canvas ref={canvasRef} role="img" aria-label={descricao}></canvas>
        </div>
    );
}

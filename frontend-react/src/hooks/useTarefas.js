import { useCallback, useEffect, useState } from "react";
import { Api } from "../services/api";

/* Carrega as tarefas da API e atualiza sozinho:
   a cada 15 segundos e quando a aba volta a ficar visível. */
export function useTarefas() {
    const [tarefas, setTarefas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    const recarregar = useCallback(async function () {
        try {
            const lista = await Api.listarTarefas();
            setTarefas(lista);
            setErro(null);
        } catch (erroApi) {
            // Só mostra o erro se ainda não temos nada na tela
            setErro(erroApi.message);
            console.warn("Não foi possível atualizar:", erroApi.message);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        recarregar();

        const intervalo = setInterval(recarregar, 15000);
        function aoVoltarParaAba() {
            if (!document.hidden) recarregar();
        }
        document.addEventListener("visibilitychange", aoVoltarParaAba);

        return () => {
            clearInterval(intervalo);
            document.removeEventListener("visibilitychange", aoVoltarParaAba);
        };
    }, [recarregar]);

    return { tarefas, carregando, erro, recarregar };
}

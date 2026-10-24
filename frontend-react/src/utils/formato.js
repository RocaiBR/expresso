/* Conversões entre o banco e a tela */

export const Formato = {
    // 7 -> "#007"
    codigo(id) {
        return "#" + String(id).padStart(3, "0");
    },

    // "2026-06-09" (ou "2026-06-09T03:00:00.000Z") -> "09/06/2026"
    data(valor) {
        if (!valor) return "—";
        const [ano, mes, dia] = String(valor).split("T")[0].split("-");
        if (!dia) return valor;
        return dia + "/" + mes + "/" + ano;
    },

    prioridade: {
        // valor do banco -> texto na tela
        rotulo: { baixo: "Baixo", medio: "Médio", alto: "Alto", urgente: "Urgente" },
        cor: {
            baixo: "bg-cinza-claro",
            medio: "bg-cinza",
            alto: "bg-marca",
            urgente: "bg-marca"
        },
        // texto do formulário -> valor do banco
        doFormulario: { "Baixa": "baixo", "Média": "medio", "Alta": "alto", "Urgente": "urgente" }
    },

    status: {
        rotulo: {
            "pendente": "Pendente",
            "em andamento": "Em andamento",
            "concluido": "Concluída",
            "cancelado": "Cancelada"
        }
    },

    // Usuários: valor do banco -> texto na tela
    setores: { "PCP": "PCP", "ENGENHARIA": "ENGENHARIA", "TI": "TI" },
    funcoes: { "usuario": "USUÁRIO PADRÃO", "gestor": "GESTOR", "ti": "TI" },

    rotuloPrioridade(valor) {
        return this.prioridade.rotulo[valor] || "Médio";
    },
    corPrioridade(valor) {
        return this.prioridade.cor[valor] || "bg-cinza";
    },
    rotuloStatus(valor) {
        return this.status.rotulo[valor] || "Pendente";
    }
};

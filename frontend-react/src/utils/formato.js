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
            baixo: "bg-[#AEB0B7]",
            medio: "bg-[#54565B]",
            alto: "bg-[#6F0049]",
            urgente: "bg-[#6F0049]"
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
    setores: { "PCP": "PCP", "ENGENHARIA": "ENGENHARIA" },
    funcoes: { "usuario": "USUÁRIO COMUM", "gestor": "GESTOR" },

    rotuloPrioridade(valor) {
        return this.prioridade.rotulo[valor] || "Médio";
    },
    corPrioridade(valor) {
        return this.prioridade.cor[valor] || "bg-[#54565B]";
    },
    rotuloStatus(valor) {
        return this.status.rotulo[valor] || "Pendente";
    }
};

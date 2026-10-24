const STATUS_VALIDOS = ['pendente', 'em andamento', 'concluido', 'cancelado'];
const STATUS_ABERTOS = ['pendente', 'em andamento'];
const STATUS_FINAIS = ['concluido', 'cancelado'];
const PRIORIDADES_VALIDAS = ['baixo', 'medio', 'alto', 'urgente'];
const SETORES_VALIDOS = ['PCP', 'ENGENHARIA', 'TI'];
const FUNCOES = ['usuario', 'gestor', 'ti']; // cargos: ver utils/permissoes.js

const TAMANHO_MINIMO_SENHA = 6;
const LIMITES_TAREFA = { titulo: 150, descricao: 2000 };
const LIMITES_USUARIO = { nome: 150, usuario: 50, email: 150 };

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_LOGIN = /^[A-Za-z0-9._-]+$/;

// "" e só espaços viram null; o texto perde os espaços das pontas
function vazioParaNulo(valor) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor === 'string') return valor.trim() === '' ? null : valor.trim();
    return valor;
}

// E-mail sempre em minúsculas: "Maria@Empresa.com" e "maria@empresa.com" são a mesma pessoa
function normalizarEmail(email) {
    return String(email).trim().toLowerCase();
}

function dataValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(valor + 'T00:00:00Z');
    return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function conferirOrdemDasDatas(inicio, fim) {
    if (inicio && fim && fim < inicio) return 'A data de vencimento não pode ser antes da data de início.';
    return null;
}
function normalizarOpcao(texto) {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase().replace(/\s+/g, ' ');
}

module.exports = {
    STATUS_VALIDOS, STATUS_ABERTOS, STATUS_FINAIS, PRIORIDADES_VALIDAS, SETORES_VALIDOS, FUNCOES,
    TAMANHO_MINIMO_SENHA, LIMITES_TAREFA, LIMITES_USUARIO, FORMATO_EMAIL, FORMATO_LOGIN,
    vazioParaNulo, normalizarEmail, dataValida, conferirOrdemDasDatas, normalizarOpcao,
};

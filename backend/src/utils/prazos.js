const { db } = require('../config/firebase');
const { avisarAtraso } = require('../controllers/notificacaoController');
const { STATUS_ABERTOS } = require('./validacoes');

// "2026-10-17": o dia de hoje em São Paulo
function hojeEmSaoPaulo() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// "2026-10-16" -> "2026-10-17":
function diaSeguinte(data) {
    const dia = new Date(data + 'T12:00:00Z');
    dia.setUTCDate(dia.getUTCDate() + 1);
    return dia.toISOString().slice(0, 10);
}

function estaAtrasada(tarefa, hoje) {
    return STATUS_ABERTOS.includes(tarefa.status) && Boolean(tarefa.data_conclusao) && tarefa.data_conclusao < hoje;
}

function camposDoPrazo(tarefa, hoje = hojeEmSaoPaulo()) {
    if (estaAtrasada(tarefa, hoje) && !tarefa.atrasada) {
        return {
            atrasada: true,
            atrasada_desde: diaSeguinte(tarefa.data_conclusao),
            prioridade_original: tarefa.prioridade || 'medio',
            prioridade: 'urgente',
        };
    }
    if (tarefa.atrasada && STATUS_ABERTOS.includes(tarefa.status) && !estaAtrasada(tarefa, hoje)) {
        return {
            atrasada: false,
            atrasada_desde: null,
            prioridade: tarefa.prioridade_original || tarefa.prioridade || 'medio',
            prioridade_original: null,
        };
    }
    return null;
}


async function aplicarRegraDoPrazo(doc, autor, manterPrioridade = false) {
    const campos = camposDoPrazo(doc.data());
    if (!campos) return null;
    if (manterPrioridade && !campos.atrasada) delete campos.prioridade;
    await doc.ref.update(campos);
    if (campos.atrasada) await avisarAtraso({ ...doc.data(), ...campos }, autor ? autor.id : null);
    return campos;
}

async function verificarPrazos() {
    const hoje = hojeEmSaoPaulo();
    const abertas = await db.collection('tarefas').where('status', 'in', STATUS_ABERTOS).get();
    let viraramUrgentes = 0;
    let voltaramAoNormal = 0;
    for (const doc of abertas.docs) {
        const campos = camposDoPrazo(doc.data(), hoje);
        if (!campos) continue;
        await doc.ref.update(campos);
        if (campos.atrasada) {
            viraramUrgentes++;
            await avisarAtraso({ ...doc.data(), ...campos }, null);
        } else {
            voltaramAoNormal++;
        }
    }
    console.log(`[PRAZOS] ${hoje}: ${abertas.size} abertas, ${viraramUrgentes} passaram do prazo e viraram urgentes, ${voltaramAoNormal} voltaram ao normal`);
    return { hoje, abertas: abertas.size, viraram_urgentes: viraramUrgentes, voltaram_ao_normal: voltaramAoNormal };
}

module.exports = { hojeEmSaoPaulo, camposDoPrazo, aplicarRegraDoPrazo, verificarPrazos };

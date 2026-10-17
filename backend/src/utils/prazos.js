/* Urgência automática por prazo vencido.
  - Passou o dia da entrega (data_conclusao) e a atividade ainda está aberta: vira "urgente",
 fica marcada como atrasada e guarda a prioridade que tinha antes.
   - O prazo foi adiado (hoje ou depois): volta à prioridade de antes.
  - Concluída/cancelada não muda. Depois de marcada, uma prioridade trocada à mão é respeitada.
 Roda todo dia às 00:05 (index.js), ao criar/alterar uma atividade e no botão do TI.*/
const { db } = require('../config/firebase');
const { avisarAtraso } = require('../controllers/notificacaoController');

const STATUS_ABERTOS = ['pendente', 'em andamento'];

// "2026-10-17": o dia de hoje em São Paulo (o prazo vence quando esse dia acaba)
function hojeEmSaoPaulo() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// "2026-10-16" -> "2026-10-17": o primeiro dia de atraso é o dia seguinte ao prazo
function diaSeguinte(data) {
    const dia = new Date(data + 'T12:00:00Z');
    dia.setUTCDate(dia.getUTCDate() + 1);
    return dia.toISOString().slice(0, 10);
}

function estaAtrasada(tarefa, hoje) {
    return STATUS_ABERTOS.includes(tarefa.status) && Boolean(tarefa.data_conclusao) && tarefa.data_conclusao < hoje;
}

// O que gravar para a atividade ficar de acordo com o prazo; null se nada muda
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

// Varredura de todas as atividades abertas (a função agendada e o botão do TI)
async function verificarPrazos() {
    const hoje = hojeEmSaoPaulo();
    // Só as abertas: as concluídas/canceladas nunca mudam, então não precisam ser lidas
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

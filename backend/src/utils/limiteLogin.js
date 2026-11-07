const crypto = require('crypto');
const { db, Timestamp } = require('../config/firebase');

const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;
const tentativas = db.collection('tentativas_login');

// Conta por pessoa, não pelo texto digitado: e-mail, login e nome da mesma conta somam juntos.
// Quem não tem cadastro conta pelo hash do texto, e recebe as mesmas respostas de quem tem
function chaveDoLogin(digitado, usuarioId) {
    return usuarioId !== undefined
        ? `usuario_${usuarioId}`
        : crypto.createHash('sha256').update(digitado.toLowerCase()).digest('hex');
}

// Conta antes de conferir a senha, numa transação: tentativas simultâneas não burlam o limite.
// Devolve os minutos que faltam se estiver bloqueado, ou 0 se puder tentar
async function reservarTentativa(chave) {
    const ref = tentativas.doc(chave);
    return db.runTransaction(async (transacao) => {
        const atual = await transacao.get(ref);
        const restante = atual.exists ? atual.data().expira_em.toMillis() - Date.now() : 0;
        const feitas = restante > 0 ? atual.data().tentativas : 0;
        if (feitas >= MAX_TENTATIVAS) return Math.ceil(restante / 60000);

        transacao.set(ref, { tentativas: feitas + 1, expira_em: Timestamp.fromMillis(Date.now() + JANELA_MS) });
        return 0;
    });
}

async function liberarLogin(chave) {
    await tentativas.doc(chave).delete();
}

module.exports = { chaveDoLogin, reservarTentativa, liberarLogin, MAX_TENTATIVAS };

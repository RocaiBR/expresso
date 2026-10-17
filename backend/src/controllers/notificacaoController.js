const { db, FieldValue, paraJson } = require('../config/firebase');

/* Avisos do sino. Tipos:
  "atribuida": criaram uma atividade para a pessoa
  "recebida":  passaram para ela uma atividade que era de outra pessoa
  "removida":  a atividade dela foi passada para outra pessoa
  "atrasada":  a atividade passou do prazo e virou urgente (aviso automático, do "Sistema")
 O texto é montado no frontend (utils/notificacoes.js) a partir destes campos.
 */
const notificacoes = db.collection('notificacoes');
const LIMITE_LISTA = 30;

async function criar(usuarioId, tipo, autor, tarefa, extras = {}) {
    await notificacoes.add({
        usuario_id: usuarioId,
        tipo,
        tarefa_id: tarefa.id,
        tarefa_titulo: tarefa.titulo,
        autor_id: autor.id,
        autor_nome: autor.nome,
        ...extras,
        lida: false,
        criada_em: FieldValue.serverTimestamp(),
    });
    console.log(`[NOTIFICACOES] Usuário #${usuarioId} avisado (${tipo}) sobre a tarefa #${tarefa.id}`);
}

// Quem fez a ação nunca é avisado de si mesmo. Se o aviso falhar, a atividade continua salva.
async function avisarNovaAtividade(autor, tarefa) {
    try {
        if (tarefa.usuario_id && tarefa.usuario_id !== autor.id) {
            await criar(tarefa.usuario_id, 'atribuida', autor, tarefa);
        }
    } catch (error) {
        console.error('[NOTIFICACOES] Falha ao avisar sobre a atividade nova:', error.message);
    }
}

async function avisarTrocaDeResponsavel(autor, tarefa, anteriorId) {
    try {
        const novoId = tarefa.usuario_id;
        if (novoId === anteriorId) return;
        const avisos = [];
        if (novoId && novoId !== autor.id) {
            avisos.push(criar(novoId, 'recebida', autor, tarefa));
        }
        if (anteriorId && anteriorId !== autor.id) {
            avisos.push(criar(anteriorId, 'removida', autor, tarefa, { novo_responsavel: tarefa.responsavel }));
        }
        await Promise.all(avisos);
    } catch (error) {
        console.error('[NOTIFICACOES] Falha ao avisar sobre a troca de responsável:', error.message);
    }
}

// Prazo vencido: avisa o responsável e quem criou a atividade (menos quem fez a ação, se houver)
async function avisarAtraso(tarefa, exceto) {
    try {
        const destinatarios = new Set([tarefa.usuario_id, tarefa.criado_por].filter((id) => id && id !== exceto));
        const sistema = { id: null, nome: 'Sistema' };
        await Promise.all([...destinatarios].map((id) => criar(id, 'atrasada', sistema, tarefa, { prazo: tarefa.data_conclusao })));
    } catch (error) {
        console.error('[NOTIFICACOES] Falha ao avisar sobre o prazo vencido:', error.message);
    }
}

// Usado ao excluir um usuário
async function excluirNotificacoesDoUsuario(usuarioId) {
    const resultado = await notificacoes.where('usuario_id', '==', Number(usuarioId)).get();
    await Promise.all(resultado.docs.map((doc) => doc.ref.delete()));
}

function naoLidasDe(usuarioId) {
    return notificacoes.where('usuario_id', '==', usuarioId).where('lida', '==', false);
}

// GET /notificacoes/contagem — só o número de não lidas (o sino consulta isso a cada 30 s;
async function contarNaoLidas(req, res, next) {
    try {
        const resultado = await naoLidasDe(req.usuario.id).count().get();
        res.status(200).json({ nao_lidas: resultado.data().count });
    } catch (error) {
        next(error);
    }
}

//notificacoes — as mais recentes, para quando a pessoa abre o sino
async function listarNotificacoes(req, res, next) {
    try {
        const resultado = await notificacoes
            .where('usuario_id', '==', req.usuario.id)
            .orderBy('criada_em', 'desc')
            .limit(LIMITE_LISTA)
            .get();
        res.status(200).json(resultado.docs.map((doc) => ({ id: doc.id, ...paraJson(doc) })));
    } catch (error) {
        next(error);
    }
}

// POST /notificacoes/:id/lida
async function marcarComoLida(req, res, next) {
    try {
        const doc = /^[A-Za-z0-9]+$/.test(req.params.id) ? await notificacoes.doc(req.params.id).get() : null;
        // Aviso de outra pessoa responde como se não existisse
        if (!doc || !doc.exists || doc.data().usuario_id !== req.usuario.id) {
            return res.status(404).json({ erro: 'Notificação não encontrada.' });
        }
        await doc.ref.update({ lida: true });
        res.status(200).json({ mensagem: 'Notificação marcada como lida.' });
    } catch (error) {
        next(error);
    }
}

// POST /notificacoes/lidas — marca todas as não lidas
async function marcarTodasComoLidas(req, res, next) {
    try {
        const resultado = await naoLidasDe(req.usuario.id).get();
        for (let inicio = 0; inicio < resultado.docs.length; inicio += 500) {
            const lote = db.batch();
            resultado.docs.slice(inicio, inicio + 500).forEach((doc) => lote.update(doc.ref, { lida: true }));
            await lote.commit();
        }
        res.status(200).json({ marcadas: resultado.size });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    contarNaoLidas,
    listarNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    avisarNovaAtividade,
    avisarTrocaDeResponsavel,
    avisarAtraso,
    excluirNotificacoesDoUsuario
};

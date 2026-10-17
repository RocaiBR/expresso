const crypto = require('crypto');
const { db, Timestamp } = require('../config/firebase');

// Sessão de login: o navegador guarda um token aleatório e o manda em toda chamada
const DURACAO_SESSAO_HORAS = 12;
const sessoes = db.collection('sessoes');

function hashDoToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function criarSessao(usuarioId) {
    const token = crypto.randomBytes(32).toString('base64url');
    await sessoes.doc(hashDoToken(token)).set({
        usuario_id: usuarioId,
        criado_em: Timestamp.now(),
        expira_em: Timestamp.fromMillis(Date.now() + DURACAO_SESSAO_HORAS * 60 * 60 * 1000),
    });
    return token;
}

async function encerrarSessao(token) {
    await sessoes.doc(hashDoToken(token)).delete();
}

// Ao trocar a senha ou excluir o usuário, derruba os logins abertos dele
async function encerrarSessoesDoUsuario(usuarioId) {
    const abertas = await sessoes.where('usuario_id', '==', Number(usuarioId)).get();
    await Promise.all(abertas.docs.map((doc) => doc.ref.delete()));
}

function tokenDaRequisicao(req) {
    const [tipo, token] = (req.get('authorization') || '').split(' ');
    return tipo === 'Bearer' && token ? token : null;
}

// Só deixa passar quem tem sessão válida. O cargo é lido do banco a cada chamada,então mudar a função ou desativar alguém vale na hora, sem esperar novo login.

async function autenticar(req, res, next) {
    try {
        const token = tokenDaRequisicao(req);
        if (!token) {
            return res.status(401).json({ erro: 'Faça login para continuar.' });
        }

        const sessao = await sessoes.doc(hashDoToken(token)).get();
        if (!sessao.exists || sessao.data().expira_em.toMillis() < Date.now()) {
            if (sessao.exists) await sessao.ref.delete();
            return res.status(401).json({ erro: 'Sua sessão expirou. Faça login de novo.' });
        }

        const doc = await db.collection('usuarios').doc(String(sessao.data().usuario_id)).get();
        if (!doc.exists || !doc.data().ativo) {
            return res.status(401).json({ erro: 'Este usuário está inativo. Fale com o TI.' });
        }

        const { id, nome, email, funcao, setor } = doc.data();
        req.usuario = { id, nome, email, funcao: funcao || 'usuario', setor: setor || null };
        req.token = token;
        next();
    } catch (error) {
        next(error);
    }
}

function somenteTI(req, res, next) {
    if (req.usuario.funcao !== 'ti') {
        return res.status(403).json({ erro: 'Apenas o TI pode fazer isso.' });
    }
    next();
}

module.exports = { autenticar, somenteTI, criarSessao, encerrarSessao, encerrarSessoesDoUsuario };

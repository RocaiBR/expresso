const { db } = require('../config/firebase');

// Aceita entrar com e-mail, nome de usuário ou nome (nessa ordem)
async function buscarPorLogin(valor) {
    for (const campo of ['email', 'usuario', 'nome']) {
        const resultado = await db.collection('usuarios').where(campo, '==', valor).limit(1).get();
        if (!resultado.empty) return resultado.docs[0].data();
    }
    return null;
}

async function login(req, res, next) {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ erro: 'Informe usuário e senha.' });
        }

        const encontrado = await buscarPorLogin(usuario.trim());
        if (!encontrado || encontrado.senha !== senha) {
            return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        }
        if (!encontrado.ativo) {
            return res.status(403).json({ erro: 'Este usuário está inativo. Fale com um gestor.' });
        }
        res.status(200).json({
            mensagem: 'Login realizado com sucesso.',
            usuario: {
                id: encontrado.id,
                nome: encontrado.nome,
                usuario: encontrado.usuario,
                email: encontrado.email,
                setor: encontrado.setor,
                funcao: encontrado.funcao,
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { login };

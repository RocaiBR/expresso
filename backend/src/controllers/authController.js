const { pool } = require('../config/db');

async function login(req, res, next) {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ erro: 'Informe usuário e senha.' });
        }

        const valor = usuario.trim();
        const [linhas] = await pool.query(
            `SELECT id, nome, usuario, email, senha, setor, funcao, ativo
             FROM usuarios
             WHERE email = ? OR usuario = ? OR nome = ?
             LIMIT 1`,
            [valor, valor, valor]
        );
        if (linhas.length === 0 || linhas[0].senha !== senha) {
            return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        }
        const encontrado = linhas[0];
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
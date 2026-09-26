const {pool} = require('../config/db');

async function login(req, res, next) {
    try{
        const {usuario, senha} = req.body;

        if (!usuario || !senha){
            return res.status(400).json({erro: 'Informe usuário e senha.'});
        }

        const [linhas] = await pool.query(
            'SELECT id, nome, email, senha FROM usuarios WHERE email = ? OR nome = ? LIMIT 1',
            [usuario.trim(), usuario.trim()]
        );

        if (linhas.length === 0 || linhas[0].senha !== senha){
            return res.status(401).json({erro: 'Usuário ou senha incorretos.'});
        }

        const encontrado = linhas[0];

        res.status(200).json({
            mensagem: 'Login realizado com sucesso.',
            usuario: {
                id: encontrado.id,
                nome: encontrado.nome,
                email: encontrado.email,
            },
        });
    } catch (error){
        next(error);
    }
}

module.exports = {login};
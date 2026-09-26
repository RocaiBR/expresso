const {pool} = require('../config/db');

async function login(req, res, next) {
    try{
        const {usuario, senha} = req.body;

        if (!usuario || !senha){
            return res.status(400).json({erro: 'Informe usuário e senha.'});
        }

        const [linhas] = await pool.query(
            'SELECT id, nome, email, senha FROM ususarios WHERE email = ? OR nome = ? LIMIT 1',
            [usuario.trim(), usuario.trim()]
        );

        if (linhas.length === 0){
            return res.status(401).json({erro: 'Usuário ou senha incorretos.'});
        }

        res.status(200).json({
            mensagem: 'Login realizado com sucesso.',
            usuario: {
                id: encotrado.id,
                nome: encotrado.nome,
                email: encotrado.email,
            },
        });
    } catch (error){
        next(error);
    }
}

module.exports = {login};
const { pool } = require('../config/db');

async function listarUsuarios(req, res, next) {
    try {
        const [linhas] = await pool.query(
            'SELECT id, nome, email, criado_em FROM usuarios ORDER BY id DESC'
        );
        res.status(200).json(linhas);
    } catch (error) {
        next(error);
    }
}

async function buscarUsuarioPorId(req, res, next) {
    try {
        const { id } = req.params;
        const [linhas] = await pool.query(
            'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
            [id]
        );

        if (linhas.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        res.status(200).json(linhas[0]);
    } catch (error) {
        next(error);
    }
}

async function criarUsuario(req, res, next) {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });
        }

        const [resultado] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            [nome.trim(), email.trim(), senha ?? null ]
        );

        res.status(201).json({ id: resultado.insertId, nome, email });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um usuário com esse email.' });
        }
        next(error);
    }
}

async function excluirUsuario(req, res, next) {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        res.status(200).json({ mensagem: 'Usuário excluído com sucesso.', id: Number(id) });
    } catch (error) {
        next(error);
    }
}
async function atualizarUsuario(req, res, next) {
    try{
        const { id } = req.params;
        const CAMPOS_PERMITIDOS = ['nome', 'email','senha'];
        const camposParaAtualizar = [];
        const valores = [];
    
        CAMPOS_PERMITIDOS.forEach((campo) =>  {
            if (req.body[campo] !== undefined){
                camposParaAtualizar.push(`${campo} = ?`);
                valores.push(req.body[campo]);
            }
        });
if (camposParaAtualizar.length == 0){
    return res.status(400).json({
        erro: 'Envie ao menos um campo para atualizar',
        campos_aceitos: CAMPOS_PERMITIDOS,
    });
} 
   
valores.push(id);

const [resultado] = await pool.query(
    `UPDATE usuarios SET ${camposParaAtualizar.json(',')} WHERE id = ?`,
    valores
);
   if (resultado.affectedRows == 0){
    return res.status(404).json({erro:'Usuário não encontrado.'});
   }
   
   const [linhas] = await pool.query(
    'SELECT id, nome, email, criado_em FROM ususarios WHERE id = ?',
    [id]
   );

   
   res.status(200).json({mensagem: 'Usuário atualizado com sucesso.', usuario: linhas[0] });
} catch (error){
    if (error.code === 'ER_DUP_ENTRY'){
        return res.status(409).json({erro: 'Já existe um usuário com esse e-mail.'});
    }
    next(error);
}}
module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario,
    atualizarUsuario,
    excluirUsuario
};

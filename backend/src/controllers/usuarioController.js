const { pool } = require('../config/db');

// Colunas devolvidas pela API
const COLUNAS = 'id, nome, usuario, email, setor, funcao, ativo, criado_em';

const SETORES_VALIDOS = ['PCP', 'ENGENHARIA'];
const FUNCOES_VALIDAS = ['usuario', 'gestor'];

// "" vira null
function vazioParaNulo(valor) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor === 'string' && valor.trim() === '') return null;
    return typeof valor === 'string' ? valor.trim() : valor;
}

function validar(dados) {
    if (dados.setor !== undefined && dados.setor !== '' && !SETORES_VALIDOS.includes(dados.setor)) {
        return `Setor inválido. Use: ${SETORES_VALIDOS.join(', ')}.`;
    }
    if (dados.funcao !== undefined && !FUNCOES_VALIDAS.includes(dados.funcao)) {
        return `Função inválida. Use: ${FUNCOES_VALIDAS.join(', ')}.`;
    }
    return null;
}

// Traduz o erro de duplicidade do MySQL para uma mensagem clara
function mensagemDuplicado(error) {
    const texto = error.sqlMessage || '';
    if (texto.includes("'usuario'") || texto.includes('usuarios.usuario')) {
        return 'Já existe alguém com esse nome de usuário.';
    }
    return 'Já existe um usuário com esse e-mail.';
}

// GET /usuarios
async function listarUsuarios(req, res, next) {
    try {
        const [linhas] = await pool.query(`SELECT ${COLUNAS} FROM usuarios ORDER BY nome`);
        res.status(200).json(linhas);
    } catch (error) {
        next(error);
    }
}

// GET /usuarios/:id
async function buscarUsuarioPorId(req, res, next) {
    try {
        const [linhas] = await pool.query(`SELECT ${COLUNAS} FROM usuarios WHERE id = ?`, [req.params.id]);

        if (linhas.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        res.status(200).json(linhas[0]);
    } catch (error) {
        next(error);
    }
}

// POST /usuarios
async function criarUsuario(req, res, next) {
    try {
        const { nome, usuario, email, senha, setor, funcao } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
        }
        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });

        const [resultado] = await pool.query(
            `INSERT INTO usuarios (nome, usuario, email, senha, setor, funcao, ativo)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
                nome.trim(),
                vazioParaNulo(usuario),
                email.trim(),
                senha,
                vazioParaNulo(setor),
                funcao || 'usuario',
            ]
        );
        const [linhas] = await pool.query(`SELECT ${COLUNAS} FROM usuarios WHERE id = ?`, [resultado.insertId]);
        res.status(201).json(linhas[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: mensagemDuplicado(error) });
        }
        next(error);
    }
}

// PUT /usuarios/:id
async function atualizarUsuario(req, res, next) {
    try {
        const { id } = req.params;

        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });

        const camposParaAtualizar = [];
        const valores = [];

        ['nome', 'usuario', 'email', 'setor', 'funcao'].forEach((campo) => {
            if (req.body[campo] !== undefined) {
                camposParaAtualizar.push(`${campo} = ?`);
                valores.push(vazioParaNulo(req.body[campo]));
            }
        });

        if (req.body.senha) {
            camposParaAtualizar.push('senha = ?');
            valores.push(req.body.senha);
        }
        if (req.body.ativo !== undefined) {
            camposParaAtualizar.push('ativo = ?');
            valores.push(req.body.ativo ? 1 : 0);
        }
        if (camposParaAtualizar.length === 0) {
            return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
        }

        valores.push(id);

        const [resultado] = await pool.query(
            `UPDATE usuarios SET ${camposParaAtualizar.join(', ')} WHERE id = ?`,
            valores
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        const [linhas] = await pool.query(`SELECT ${COLUNAS} FROM usuarios WHERE id = ?`, [id]);
        res.status(200).json({ mensagem: 'Usuário atualizado com sucesso.', usuario: linhas[0] });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: mensagemDuplicado(error) });
        }
        next(error);
    }
}

// DELETE /usuarios/:id
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

module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario,
    atualizarUsuario,
    excluirUsuario
};
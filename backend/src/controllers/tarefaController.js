const { pool } = require('../config/db');

const CAMPOS_PERMITIDOS = ['titulo', 'descricao', 'responsavel', 'usuario_id', 'status'];

// GET /tarefas
async function listarTarefas(req, res, next) {
    try {
        const { status } = req.query;
        let sql = 'SELECT * FROM tarefas';
        const valores = [];

        if (status) {
            sql += ' WHERE status = ?';
            valores.push(status);
        }

        sql += ' ORDER BY id DESC';

        const [linhas] = await pool.query(sql, valores);
        res.status(200).json(linhas);
    } catch (error) {
        next(error);
    }
}

// GET /tarefas/:id
async function buscarTarefaPorId(req, res, next) {
    try {
        const { id } = req.params;
        const [linhas] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [id]);

        if (linhas.length === 0) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }

        res.status(200).json(linhas[0]);
    } catch (error) {
        next(error);
    }
}

// POST /tarefas
async function criarTarefa(req, res, next) {
    try {
        const { titulo, descricao, responsavel, usuario_id, status } = req.body;

        if (!titulo || titulo.trim() === '') {
            return res.status(400).json({ erro: 'O campo "titulo" é obrigatório.' });
        }

        const [resultado] = await pool.query(
            `INSERT INTO tarefas (titulo, descricao, responsavel, usuario_id, status)
             VALUES (?, ?, ?, ?, ?)`,
            [
                titulo.trim(),
                descricao ?? null,
                responsavel ?? null,
                usuario_id ?? null,
                status ?? 'pendente',
            ]
        );

        const [linhas] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [resultado.insertId]);
        res.status(201).json(linhas[0]);
    } catch (error) {
        next(error);
    }
}

// PUT /tarefas/:id
async function atualizarTarefa(req, res, next) {
    try {
        const { id } = req.params;

        const camposParaAtualizar = [];
        const valores = [];

        CAMPOS_PERMITIDOS.forEach((campo) => {
            if (req.body[campo] !== undefined) {
                camposParaAtualizar.push(`${campo} = ?`);
                valores.push(req.body[campo]);
            }
        });

        if (camposParaAtualizar.length === 0) {
            return res.status(400).json({
                erro: 'Envie ao menos um campo para atualizar.',
                campos_aceitos: CAMPOS_PERMITIDOS,
            });
        }

        valores.push(id);

        const [resultado] = await pool.query(
            `UPDATE tarefas SET ${camposParaAtualizar.join(', ')} WHERE id = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }

        const [linhas] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [id]);
        res.status(200).json({ mensagem: 'Tarefa atualizada com sucesso.', tarefa: linhas[0] });
    } catch (error) {
        next(error);
    }
}

// DELETE /tarefas/:id
async function excluirTarefa(req, res, next) {
    try {
        const { id } = req.params;
        const [resultado] = await pool.query('DELETE FROM tarefas WHERE id = ?', [id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }

        res.status(200).json({ mensagem: 'Tarefa excluída com sucesso.', id: Number(id) });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listarTarefas,
    buscarTarefaPorId,
    criarTarefa,
    atualizarTarefa,
    excluirTarefa
};
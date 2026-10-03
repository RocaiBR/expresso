const { pool } = require('../config/db');

// Campos que o PUT /tarefas/:id
const CAMPOS_PERMITIDOS = [
    'titulo', 'descricao', 'responsavel', 'participantes', 'usuario_id',
    'status', 'prioridade', 'data_inicio', 'data_conclusao'
];

const STATUS_VALIDOS = ['pendente', 'em andamento', 'concluido', 'cancelado'];
const PRIORIDADES_VALIDAS = ['baixo', 'medio', 'alto', 'urgente'];

// Status que encerram a tarefa: ao entrar em um deles, "finalizado_em" guarda o momento
const STATUS_FINAIS = ['concluido', 'cancelado'];

// Converte "" em null
function vazioParaNulo(valor) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor === 'string' && valor.trim() === '') return null;
    return valor;
}

// Confere status e prioridade; devolve a mensagem de erro ou null
function validar(dados) {
    if (dados.status !== undefined && !STATUS_VALIDOS.includes(dados.status)) {
        return `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`;
    }
    if (dados.prioridade !== undefined && !PRIORIDADES_VALIDAS.includes(dados.prioridade)) {
        return `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}.`;
    }
    return null;
}

// GET /tarefas  (aceita ?status=pendente)
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
        const {
            titulo, descricao, responsavel, participantes, usuario_id,
            status, prioridade, data_inicio, data_conclusao
        } = req.body;

        if (!titulo || titulo.trim() === '') {
            return res.status(400).json({ erro: 'O campo "titulo" é obrigatório.' });
        }
        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });
        const statusInicial = status || 'pendente';
        const finalizadoEm = STATUS_FINAIS.includes(statusInicial) ? 'NOW()' : 'NULL';
        const [resultado] = await pool.query(
            `INSERT INTO tarefas
                (titulo, descricao, responsavel, participantes, usuario_id,
                 status, prioridade, data_inicio, data_conclusao, finalizado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${finalizadoEm})`,
            [
                titulo.trim(),
                vazioParaNulo(descricao),
                vazioParaNulo(responsavel),
                vazioParaNulo(participantes),
                vazioParaNulo(usuario_id),
                statusInicial,
                prioridade || 'medio',
                vazioParaNulo(data_inicio),
                vazioParaNulo(data_conclusao),
            ]
        );

        const [linhas] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [resultado.insertId]);
        console.log(`[TAREFAS] Tarefa #${resultado.insertId} gravada no MySQL: "${titulo.trim()}"`);
        res.status(201).json(linhas[0]);
    } catch (error) {
        next(error);
    }
}

// PUT /tarefas/:id
async function atualizarTarefa(req, res, next) {
    try {
        const { id } = req.params;
        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });
        const camposParaAtualizar = [];
        const valores = [];
        CAMPOS_PERMITIDOS.forEach((campo) => {
            if (req.body[campo] !== undefined) {
                camposParaAtualizar.push(`${campo} = ?`);
                valores.push(campo === 'titulo' ? req.body[campo] : vazioParaNulo(req.body[campo]));
            }
        });

        if (camposParaAtualizar.length === 0) {
            return res.status(400).json({
                erro: 'Envie ao menos um campo para atualizar.',
                campos_aceitos: CAMPOS_PERMITIDOS,
            });
        }

        // Concluir/cancelar registra o momento; reabrir apaga
        if (req.body.status !== undefined) {
            const [atual] = await pool.query('SELECT status FROM tarefas WHERE id = ?', [id]);
            if (atual.length === 0) {
                return res.status(404).json({ erro: 'Tarefa não encontrada.' });
            }
            if (!STATUS_FINAIS.includes(req.body.status)) {
                camposParaAtualizar.push('finalizado_em = NULL');
            } else if (atual[0].status !== req.body.status) {
                camposParaAtualizar.push('finalizado_em = NOW()');
            }
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
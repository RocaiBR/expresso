const { db, FieldValue, proximoId, buscarDoc, paraJson } = require('../config/firebase');
const { excluirArquivosDaTarefa } = require('./anexoController');

const tarefas = db.collection('tarefas');

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

// Prepara o valor de um campo para gravar (usuario_id é número, como era no MySQL)
function valorDoCampo(campo, valor) {
    if (campo === 'titulo') return valor;
    const limpo = vazioParaNulo(valor);
    return campo === 'usuario_id' && limpo !== null ? Number(limpo) : limpo;
}

// Confere status, prioridade e datas; devolve a mensagem de erro ou null
function validar(dados) {
    if (dados.status !== undefined && !STATUS_VALIDOS.includes(dados.status)) {
        return `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`;
    }
    if (dados.prioridade !== undefined && !PRIORIDADES_VALIDAS.includes(dados.prioridade)) {
        return `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}.`;
    }
    // O MySQL recusava datas fora do formato; o Firestore aceita qualquer texto
    for (const campo of ['data_inicio', 'data_conclusao']) {
        const valor = vazioParaNulo(dados[campo]);
        if (valor !== null && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            return `O campo "${campo}" deve estar no formato AAAA-MM-DD.`;
        }
    }
    return null;
}

// GET /tarefas  (aceita ?status=pendente)
async function listarTarefas(req, res, next) {
    try {
        const { status } = req.query;
        const consulta = status ? tarefas.where('status', '==', status) : tarefas;
        const resultado = await consulta.get();

        // Ordena aqui (id DESC) para não precisar de índice composto no Firestore
        const lista = resultado.docs.map(paraJson).sort((a, b) => b.id - a.id);
        res.status(200).json(lista);
    } catch (error) {
        next(error);
    }
}

// GET /tarefas/:id
async function buscarTarefaPorId(req, res, next) {
    try {
        const doc = await buscarDoc('tarefas', req.params.id);
        if (!doc) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }
        res.status(200).json(paraJson(doc));
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

        const id = await db.runTransaction(async (transacao) => {
            const novoId = await proximoId(transacao, 'tarefas');
            transacao.set(tarefas.doc(String(novoId)), {
                id: novoId,
                titulo: titulo.trim(),
                descricao: vazioParaNulo(descricao),
                responsavel: vazioParaNulo(responsavel),
                participantes: vazioParaNulo(participantes),
                usuario_id: valorDoCampo('usuario_id', usuario_id),
                status: statusInicial,
                prioridade: prioridade || 'medio',
                data_inicio: vazioParaNulo(data_inicio),
                data_conclusao: vazioParaNulo(data_conclusao),
                criado_em: FieldValue.serverTimestamp(),
                finalizado_em: STATUS_FINAIS.includes(statusInicial) ? FieldValue.serverTimestamp() : null,
            });
            return novoId;
        });

        const doc = await buscarDoc('tarefas', id);
        console.log(`[TAREFAS] Tarefa #${id} gravada no Firestore: "${titulo.trim()}"`);
        res.status(201).json(paraJson(doc));
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
        const camposParaAtualizar = {};
        CAMPOS_PERMITIDOS.forEach((campo) => {
            if (req.body[campo] !== undefined) {
                camposParaAtualizar[campo] = valorDoCampo(campo, req.body[campo]);
            }
        });

        if (Object.keys(camposParaAtualizar).length === 0) {
            return res.status(400).json({
                erro: 'Envie ao menos um campo para atualizar.',
                campos_aceitos: CAMPOS_PERMITIDOS,
            });
        }

        const atual = await buscarDoc('tarefas', id);
        if (!atual) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }

        // Concluir/cancelar registra o momento; reabrir apaga
        if (req.body.status !== undefined) {
            if (!STATUS_FINAIS.includes(req.body.status)) {
                camposParaAtualizar.finalizado_em = null;
            } else if (atual.data().status !== req.body.status) {
                camposParaAtualizar.finalizado_em = FieldValue.serverTimestamp();
            }
        }

        await atual.ref.update(camposParaAtualizar);
        const doc = await buscarDoc('tarefas', id);
        console.log(`[TAREFAS] Tarefa #${id} atualizada: ${Object.keys(camposParaAtualizar).join(', ')}`);
        res.status(200).json({ mensagem: 'Tarefa atualizada com sucesso.', tarefa: paraJson(doc) });
    } catch (error) {
        next(error);
    }
}

// DELETE /tarefas/:id
async function excluirTarefa(req, res, next) {
    try {
        const { id } = req.params;
        const doc = await buscarDoc('tarefas', id);
        if (!doc) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }
        // Apaga os arquivos no Storage e a tarefa junto com a subcoleção "anexos"
        await excluirArquivosDaTarefa(id);
        await db.recursiveDelete(doc.ref);

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

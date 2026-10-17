const { db, FieldValue, proximoId, buscarDoc, paraJson } = require('../config/firebase');
const { excluirArquivosDaTarefa } = require('./anexoController');
const { avisarNovaAtividade, avisarTrocaDeResponsavel } = require('./notificacaoController');
const { permissoesDaTarefa, tarefasVisiveis, carregarTarefa, validarResponsavel } = require('../utils/permissoes');
const { aplicarRegraDoPrazo, verificarPrazos } = require('../utils/prazos');

const tarefas = db.collection('tarefas');

const CAMPOS_PERMITIDOS = [
    'titulo', 'descricao', 'participantes_ids', 'usuario_id',
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

// Prepara o valor de um campo para gravar
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
    for (const campo of ['data_inicio', 'data_conclusao']) {
        const valor = vazioParaNulo(dados[campo]);
        if (valor !== null && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            return `O campo "${campo}" deve estar no formato AAAA-MM-DD.`;
        }
    }
    return null;
}

const MAXIMO_PARTICIPANTES = 20;

/* Participantes só podem ser usuários existentes e ativos. Devolve os ids e os nomes
(o campo "participantes" guarda os nomes, para a busca, os detalhes e os relatórios)*/
async function validarParticipantes(lista) {
    if (lista === null || lista === undefined) return { ids: [], nomes: null };
    if (!Array.isArray(lista)) return { erro: 'Envie os participantes como uma lista de ids de usuários.' };
    const ids = [...new Set(lista.map(Number))];
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return { erro: 'Participante inválido.' };
    if (ids.length > MAXIMO_PARTICIPANTES) return { erro: `No máximo ${MAXIMO_PARTICIPANTES} participantes.` };
    if (ids.length === 0) return { ids: [], nomes: null };

    const docs = await db.getAll(...ids.map((id) => db.collection('usuarios').doc(String(id))));
    if (docs.some((doc) => !doc.exists || !doc.data().ativo)) {
        return { erro: 'Algum participante não existe ou está inativo.' };
    }
    return { ids, nomes: docs.map((doc) => doc.data().nome).join(', ') };
}

// A tarefa vai para a tela junto com o que o usuário logado pode fazer com ela
function paraJsonTarefa(doc, permissoes) {
    const { status, editar, excluir } = permissoes;
    return { ...paraJson(doc), permissoes: { status, editar, excluir } };
}

// GET /tarefas  (aceita ?status=pendente) — só as que o usuário logado pode ver
async function listarTarefas(req, res, next) {
    try {
        const { status } = req.query;
        const { docs, equipe } = await tarefasVisiveis(req.usuario);

        // Filtra e ordena aqui (id DESC) para não precisar de índice composto no Firestore
        const lista = docs
            .filter((doc) => !status || doc.data().status === status)
            .map((doc) => paraJsonTarefa(doc, permissoesDaTarefa(req.usuario, doc.data(), equipe)))
            .sort((a, b) => b.id - a.id);
        res.status(200).json(lista);
    } catch (error) {
        next(error);
    }
}

// GET /tarefas/:id
async function buscarTarefaPorId(req, res, next) {
    try {
        // Quem não pode ver recebe 404, como se ela não existisse
        const tarefa = await carregarTarefa(req.usuario, req.params.id);
        if (!tarefa) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }
        res.status(200).json(paraJsonTarefa(tarefa.doc, tarefa.permissoes));
    } catch (error) {
        next(error);
    }
}

// POST /tarefas

async function criarTarefa(req, res, next) {
    try {
        const {
            titulo, descricao, participantes_ids, usuario_id,
            status, prioridade, data_inicio, data_conclusao
        } = req.body;

        if (!titulo || titulo.trim() === '') {
            return res.status(400).json({ erro: 'O campo "titulo" é obrigatório.' });
        }
        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });

        // Sem responsável informado, a atividade é de quem está criando
        const alvo = await validarResponsavel(req.usuario, vazioParaNulo(usuario_id) ?? req.usuario.id);
        if (alvo.erro) return res.status(403).json({ erro: alvo.erro });

        const participantes = await validarParticipantes(participantes_ids);
        if (participantes.erro) return res.status(400).json({ erro: participantes.erro });

        const statusInicial = status || 'pendente';

        const id = await db.runTransaction(async (transacao) => {
            const novoId = await proximoId(transacao, 'tarefas');
            transacao.set(tarefas.doc(String(novoId)), {
                id: novoId,
                titulo: titulo.trim(),
                descricao: vazioParaNulo(descricao),
                responsavel: alvo.responsavel.nome,
                participantes: participantes.nomes,
                participantes_ids: participantes.ids,
                usuario_id: alvo.responsavel.id,
                criado_por: req.usuario.id,
                status: statusInicial,
                prioridade: prioridade || 'medio',
                data_inicio: vazioParaNulo(data_inicio),
                data_conclusao: vazioParaNulo(data_conclusao),
                criado_em: FieldValue.serverTimestamp(),
                finalizado_em: STATUS_FINAIS.includes(statusInicial) ? FieldValue.serverTimestamp() : null,
            });
            return novoId;
        });

        let doc = await buscarDoc('tarefas', id);
        console.log(`[TAREFAS] Tarefa #${id} gravada no Firestore por #${req.usuario.id}: "${titulo.trim()}"`);
        await avisarNovaAtividade(req.usuario, doc.data());
      
        // Criada com o prazo já vencido: já nasce urgente
        if (await aplicarRegraDoPrazo(doc, req.usuario)) doc = await buscarDoc('tarefas', id);
        res.status(201).json(paraJsonTarefa(doc, permissoesDaTarefa(req.usuario, doc.data())));
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

        const tarefa = await carregarTarefa(req.usuario, id);
        if (!tarefa) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }

        // Mudar só o status pede a permissão "status"; qualquer outro campo pede "editar"
        const soStatus = Object.keys(camposParaAtualizar).every((campo) => campo === 'status');
        if (!(soStatus ? tarefa.permissoes.status : tarefa.permissoes.editar)) {
            return res.status(403).json({
                erro: tarefa.permissoes.status
                    ? 'Nesta atividade você só pode mudar o status e anexar arquivos.'
                    : 'Você não tem permissão para alterar esta atividade.',
            });
        }

        // Trocar o responsável segue as mesmas regras de quem pode atribuir
        if (camposParaAtualizar.usuario_id !== undefined) {
            const alvo = await validarResponsavel(req.usuario, camposParaAtualizar.usuario_id);
            if (alvo.erro) return res.status(403).json({ erro: alvo.erro });
            camposParaAtualizar.responsavel = alvo.responsavel.nome;
        }

        // Participantes: só usuários existentes; o nome de cada um vai para "participantes"
        if (camposParaAtualizar.participantes_ids !== undefined) {
            const participantes = await validarParticipantes(camposParaAtualizar.participantes_ids);
            if (participantes.erro) return res.status(400).json({ erro: participantes.erro });
            camposParaAtualizar.participantes_ids = participantes.ids;
            camposParaAtualizar.participantes = participantes.nomes;
        }

        // Concluir/cancelar registra o momento; reabrir apaga
        if (req.body.status !== undefined) {
            if (!STATUS_FINAIS.includes(req.body.status)) {
                camposParaAtualizar.finalizado_em = null;
            } else if (tarefa.doc.data().status !== req.body.status) {
                camposParaAtualizar.finalizado_em = FieldValue.serverTimestamp();
            }
        }

        await tarefa.doc.ref.update(camposParaAtualizar);
        /* Prazo vencido vira urgente; prazo adiado volta à prioridade de antes
            (se a pessoa escolheu a prioridade agora, a escolha dela vale) */
        await aplicarRegraDoPrazo(await buscarDoc('tarefas', id), req.usuario, req.body.prioridade !== undefined);
        const atualizada = await carregarTarefa(req.usuario, id);
        console.log(`[TAREFAS] Tarefa #${id} atualizada por #${req.usuario.id}: ${Object.keys(camposParaAtualizar).join(', ')}`);

        // Se a tarefa saiu do alcance de quem editou (ex.: passou para outro setor), devolve o que foi gravado
        const doc = atualizada ? atualizada.doc : await buscarDoc('tarefas', id);
        if (camposParaAtualizar.usuario_id !== undefined) {
            await avisarTrocaDeResponsavel(req.usuario, doc.data(), tarefa.doc.data().usuario_id);
        }
        const permissoes = atualizada ? atualizada.permissoes : { status: false, editar: false, excluir: false };
        res.status(200).json({ mensagem: 'Tarefa atualizada com sucesso.', tarefa: paraJsonTarefa(doc, permissoes) });
    } catch (error) {
        next(error);
    }
}

// POST /tarefas/verificar-prazos (só TI) — roda agora a mesma verificação da madrugada
async function verificarPrazosAgora(req, res, next) {
    try {
        res.status(200).json(await verificarPrazos());
    } catch (error) {
        next(error);
    }
}

// DELETE /tarefas/:id
async function excluirTarefa(req, res, next) {
    try {
        const { id } = req.params;
        const tarefa = await carregarTarefa(req.usuario, id);
        if (!tarefa) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }
        if (!tarefa.permissoes.excluir) {
            return res.status(403).json({ erro: 'Você não tem permissão para excluir esta atividade.' });
        }

        // Apaga os arquivos no Storage e a tarefa junto com a subcoleção "anexos"
        await excluirArquivosDaTarefa(id);
        await db.recursiveDelete(tarefa.doc.ref);
        console.log(`[TAREFAS] Tarefa #${id} excluída por #${req.usuario.id}`);

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
    excluirTarefa,
    verificarPrazosAgora
};

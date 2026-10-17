const { db, FieldValue, proximoId, buscarDoc, paraJson } = require('../config/firebase');
const { encerrarSessoesDoUsuario } = require('../middlewares/autenticacao');
const { FUNCOES, usuariosAtribuiveis } = require('../utils/permissoes');

const usuarios = db.collection('usuarios');

const SETORES_VALIDOS = ['PCP', 'ENGENHARIA', 'TI'];
const FUNCOES_VALIDAS = FUNCOES;

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

// A senha nunca sai da API
function semSenha(doc) {
    const { senha, ...usuario } = paraJson(doc);
    return usuario;
}

/* O Firestore não tem índice UNIQUE: confere e-mail e usuário antes de gravar.
    Roda dentro da transação, então dois cadastros iguais ao mesmo tempo não passam.
 */
async function mensagemDuplicado(transacao, dados, idAtual) {
    const unicos = [
        ['usuario', 'Já existe alguém com esse nome de usuário.'],
        ['email', 'Já existe um usuário com esse e-mail.'],
    ];
    for (const [campo, mensagem] of unicos) {
        if (!dados[campo]) continue;
        const iguais = await transacao.get(usuarios.where(campo, '==', dados[campo]));
        if (iguais.docs.some((doc) => doc.id !== String(idAtual))) return mensagem;
    }
    return null;
}

// O sistema nunca pode ficar sem um TI ativo (senão ninguém mais administra os usuários)
async function haOutroTIAtivo(idAtual) {
    const tis = await usuarios.where('funcao', '==', 'ti').get();
    return tis.docs.some((doc) => doc.id !== String(idAtual) && doc.data().ativo);
}

const MENSAGEM_ULTIMO_TI = 'É preciso manter ao menos um usuário TI ativo. Promova outra pessoa a TI antes.';

// GET /usuarios/atribuiveis — quem o usuário logado pode escolher como responsável
async function listarAtribuiveis(req, res, next) {
    try {
        res.status(200).json(await usuariosAtribuiveis(req.usuario));
    } catch (error) {
        next(error);
    }
}

// GET /usuarios (só TI)
async function listarUsuarios(req, res, next) {
    try {
        const resultado = await usuarios.get();
        const lista = resultado.docs.map(semSenha).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        res.status(200).json(lista);
    } catch (error) {
        next(error);
    }
}

// GET /usuarios/:id (TI, ou a própria pessoa)
async function buscarUsuarioPorId(req, res, next) {
    try {
        if (req.usuario.funcao !== 'ti' && String(req.usuario.id) !== String(req.params.id)) {
            return res.status(403).json({ erro: 'Apenas o TI pode ver os dados de outros usuários.' });
        }
        const doc = await buscarDoc('usuarios', req.params.id);

        if (!doc) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        res.status(200).json(semSenha(doc));
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

        const novo = {
            nome: nome.trim(),
            usuario: vazioParaNulo(usuario),
            email: email.trim(),
            senha,
            setor: vazioParaNulo(setor),
            funcao: funcao || 'usuario',
            ativo: true,
        };

        const resultado = await db.runTransaction(async (transacao) => {
            const duplicado = await mensagemDuplicado(transacao, novo, null);
            if (duplicado) return { duplicado };

            const id = await proximoId(transacao, 'usuarios');
            transacao.set(usuarios.doc(String(id)), { id, ...novo, criado_em: FieldValue.serverTimestamp() });
            return { id };
        });

        if (resultado.duplicado) {
            return res.status(409).json({ erro: resultado.duplicado });
        }
        const doc = await buscarDoc('usuarios', resultado.id);
        console.log(`[USUARIOS] Usuário #${resultado.id} gravado no Firestore: "${novo.nome}"`);
        res.status(201).json(semSenha(doc));
    } catch (error) {
        next(error);
    }
}

// PUT /usuarios/:id
async function atualizarUsuario(req, res, next) {
    try {
        const { id } = req.params;

        const erro = validar(req.body);
        if (erro) return res.status(400).json({ erro });

        const camposParaAtualizar = {};

        ['nome', 'usuario', 'email', 'setor', 'funcao'].forEach((campo) => {
            if (req.body[campo] !== undefined) {
                camposParaAtualizar[campo] = vazioParaNulo(req.body[campo]);
            }
        });

        if (req.body.senha) {
            camposParaAtualizar.senha = req.body.senha;
        }
        if (req.body.ativo !== undefined) {
            camposParaAtualizar.ativo = Boolean(req.body.ativo);
        }
        if (Object.keys(camposParaAtualizar).length === 0) {
            return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
        }

        const atual = await buscarDoc('usuarios', id);
        if (!atual) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        const deixaDeSerTI = atual.data().funcao === 'ti'
            && ((camposParaAtualizar.funcao && camposParaAtualizar.funcao !== 'ti') || camposParaAtualizar.ativo === false);
        if (deixaDeSerTI && !(await haOutroTIAtivo(id))) {
            return res.status(409).json({ erro: MENSAGEM_ULTIMO_TI });
        }

        const duplicado = await db.runTransaction(async (transacao) => {
            const mensagem = await mensagemDuplicado(transacao, camposParaAtualizar, id);
            if (!mensagem) transacao.update(atual.ref, camposParaAtualizar);
            return mensagem;
        });
        if (duplicado) {
            return res.status(409).json({ erro: duplicado });
        }

        // Senha nova derruba os logins abertos 
        if (camposParaAtualizar.senha) await encerrarSessoesDoUsuario(id);

        const doc = await buscarDoc('usuarios', id);
        console.log(`[USUARIOS] Usuário #${id} atualizado por #${req.usuario.id}: ${Object.keys(camposParaAtualizar).join(', ')}`);
        res.status(200).json({ mensagem: 'Usuário atualizado com sucesso.', usuario: semSenha(doc) });
    } catch (error) {
        next(error);
    }
}

// DELETE /usuarios/:id
async function excluirUsuario(req, res, next) {
    try {
        const { id } = req.params;
        const doc = await buscarDoc('usuarios', id);

        if (!doc) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        if (String(req.usuario.id) === String(id)) {
            return res.status(400).json({ erro: 'Você não pode excluir a própria conta. Peça a outro usuário TI.' });
        }
        if (doc.data().funcao === 'ti' && !(await haOutroTIAtivo(id))) {
            return res.status(409).json({ erro: MENSAGEM_ULTIMO_TI });
        }
        // As atividades da pessoa ficam (com o nome dela) para o histórico e os relatórios
        await doc.ref.delete();
        await encerrarSessoesDoUsuario(id);
        await db.collection('recuperacoes').doc(String(id)).delete();
        console.log(`[USUARIOS] Usuário #${id} excluído por #${req.usuario.id}`);

        res.status(200).json({ mensagem: 'Usuário excluído com sucesso.', id: Number(id) });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listarAtribuiveis,
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario,
    atualizarUsuario,
    excluirUsuario
};

const { db, FieldValue, proximoId, buscarDoc, paraJson, bucket } = require('../config/firebase');
const { encerrarSessoesDoUsuario } = require('../middlewares/autenticacao');
const { FUNCOES, usuariosAtribuiveis } = require('../utils/permissoes');
const { excluirNotificacoesDoUsuario } = require('./notificacaoController');

const usuarios = db.collection('usuarios');

const {
    SETORES_VALIDOS, TAMANHO_MINIMO_SENHA, LIMITES_USUARIO: LIMITES, FORMATO_EMAIL, FORMATO_LOGIN,
    vazioParaNulo, normalizarEmail,
} = require('../utils/validacoes');

const FUNCOES_VALIDAS = FUNCOES;

function validar(dados) {
    for (const campo of ['nome', 'usuario', 'email', 'setor']) {
        if (dados[campo] !== undefined && dados[campo] !== null && typeof dados[campo] !== 'string') {
            return `O campo "${campo}" deve ser um texto.`;
        }
    }
    if (dados.ativo !== undefined && typeof dados.ativo !== 'boolean') {
        return 'O campo "ativo" deve ser true ou false.';
    }
    if (dados.setor !== undefined && dados.setor !== '' && !SETORES_VALIDOS.includes(dados.setor)) {
        return `Setor inválido. Use: ${SETORES_VALIDOS.join(', ')}.`;
    }
    if (dados.funcao !== undefined && !FUNCOES_VALIDAS.includes(dados.funcao)) {
        return `Função inválida. Use: ${FUNCOES_VALIDAS.join(', ')}.`;
    }
    if (dados.nome !== undefined && String(dados.nome).trim() === '') {
        return 'O nome não pode ficar vazio.';
    }
    for (const [campo, limite] of Object.entries(LIMITES)) {
        if (typeof dados[campo] === 'string' && dados[campo].trim().length > limite) {
            return `O campo "${campo}" aceita até ${limite} caracteres.`;
        }
    }
    if (dados.email !== undefined && !FORMATO_EMAIL.test(String(dados.email).trim())) {
        return 'Informe um e-mail válido (ex.: nome@empresa.com).';
    }
    if (dados.usuario && !FORMATO_LOGIN.test(String(dados.usuario).trim())) {
        return 'O nome de usuário pode ter só letras, números, ponto, hífen e sublinhado (sem espaços).';
    }
    if (dados.senha !== undefined && dados.senha !== '' &&
        (typeof dados.senha !== 'string' || dados.senha.length < TAMANHO_MINIMO_SENHA)) {
        return `A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
    }
    return null;
}

function semSenha(doc) {
    const { senha, ...usuario } = paraJson(doc);
    return usuario;
}
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

async function haOutroTIAtivo(idAtual) {
    const tis = await usuarios.where('funcao', '==', 'ti').get();
    return tis.docs.some((doc) => doc.id !== String(idAtual) && doc.data().ativo);
}

const MENSAGEM_ULTIMO_TI = 'É preciso manter ao menos um usuário TI ativo. Promova outra pessoa a TI antes.';

// GET /usuarios/atribuiveis
async function listarAtribuiveis(req, res, next) {
    try {
        res.status(200).json(await usuariosAtribuiveis(req.usuario));
    } catch (error) {
        next(error);
    }
}

async function listarParticipantes(req, res, next) {
    try {
        const resultado = await usuarios.where('ativo', '==', true).get();
        const lista = resultado.docs
            .map((doc) => ({ id: doc.data().id, nome: doc.data().nome, setor: doc.data().setor || null }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        res.status(200).json(lista);
    } catch (error) {
        next(error);
    }
}

// GET /usuarios
async function listarUsuarios(req, res, next) {
    try {
        const resultado = await usuarios.get();
        const lista = resultado.docs.map(semSenha).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        res.status(200).json(lista);
    } catch (error) {
        next(error);
    }
}

// GET /usuarios/:id
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
            email: normalizarEmail(email),
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
        if (camposParaAtualizar.email) camposParaAtualizar.email = normalizarEmail(camposParaAtualizar.email);

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
        await doc.ref.delete();
        await encerrarSessoesDoUsuario(id);
        await db.collection('recuperacoes').doc(String(id)).delete();
        await excluirNotificacoesDoUsuario(id);
        if (doc.data().foto_caminho) await bucket().file(doc.data().foto_caminho).delete({ ignoreNotFound: true });
        console.log(`[USUARIOS] Usuário #${id} excluído por #${req.usuario.id}`);

        res.status(200).json({ mensagem: 'Usuário excluído com sucesso.', id: Number(id) });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listarAtribuiveis,
    listarParticipantes,
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario,
    atualizarUsuario,
    excluirUsuario
};

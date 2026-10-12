const { db, FieldValue, proximoId, buscarDoc, paraJson } = require('../config/firebase');

const usuarios = db.collection('usuarios');

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

// A senha nunca sai da API
function semSenha(doc) {
    const { senha, ...usuario } = paraJson(doc);
    return usuario;
}

// O Firestore não tem índice UNIQUE: confere e-mail e usuário antes de gravar.
// Roda dentro da transação, então dois cadastros iguais ao mesmo tempo não passam.
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

        const duplicado = await db.runTransaction(async (transacao) => {
            const mensagem = await mensagemDuplicado(transacao, camposParaAtualizar, id);
            if (!mensagem) transacao.update(atual.ref, camposParaAtualizar);
            return mensagem;
        });
        if (duplicado) {
            return res.status(409).json({ erro: duplicado });
        }

        const doc = await buscarDoc('usuarios', id);
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
        await doc.ref.delete();

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

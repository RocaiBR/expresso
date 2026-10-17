const crypto = require('crypto');
const { db, Timestamp } = require('../config/firebase');
const { enviarEmail, emailConfigurado, emModoLocal } = require('../config/email');
const { criarSessao, encerrarSessao, encerrarSessoesDoUsuario } = require('../middlewares/autenticacao');

// Recuperação de senha por código enviado ao e-mail
const VALIDADE_CODIGO_MIN = 15;
const INTERVALO_REENVIO_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;
const TAMANHO_MINIMO_SENHA = 6;
const MENSAGEM_ENVIO = 'Se o e-mail estiver cadastrado, você vai receber um código para criar uma nova senha.';
const MENSAGEM_CODIGO_INVALIDO = 'Código inválido ou expirado. Peça um novo código.';

// Aceita entrar com e-mail, nome de usuário ou nome (nessa ordem)
async function buscarPorLogin(valor) {
    for (const campo of ['email', 'usuario', 'nome']) {
        const resultado = await db.collection('usuarios').where(campo, '==', valor).limit(1).get();
        if (!resultado.empty) return resultado.docs[0].data();
    }
    return null;
}

async function login(req, res, next) {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ erro: 'Informe usuário e senha.' });
        }

        const encontrado = await buscarPorLogin(usuario.trim());
        if (!encontrado || encontrado.senha !== senha) {
            return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        }
        if (!encontrado.ativo) {
            return res.status(403).json({ erro: 'Este usuário está inativo. Fale com o TI.' });
        }

        // O token identifica a pessoa nas próximas chamadas (Authorization: Bearer <token>)
        const token = await criarSessao(encontrado.id);
        console.log(`[AUTH] Login do usuário #${encontrado.id} (${encontrado.funcao || 'usuario'})`);
        res.status(200).json({
            mensagem: 'Login realizado com sucesso.',
            token,
            usuario: {
                id: encontrado.id,
                nome: encontrado.nome,
                usuario: encontrado.usuario,
                email: encontrado.email,
                setor: encontrado.setor,
                funcao: encontrado.funcao || 'usuario',
                foto_url: encontrado.foto_url || null,
                tema: encontrado.tema || null,
            },
        });
    } catch (error) {
        next(error);
    }
}

// POST /auth/sair — encerra a sessão deste navegador
async function sair(req, res, next) {
    try {
        await encerrarSessao(req.token);
        res.status(200).json({ mensagem: 'Sessão encerrada.' });
    } catch (error) {
        next(error);
    }
}

function textoDoCorpo(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

async function buscarPorEmail(email) {
    const resultado = await db.collection('usuarios').where('email', '==', email).limit(1).get();
    return resultado.empty ? null : resultado.docs[0];
}

// O código nunca é salvo: fica só o hash (com um "sal" aleatório), como se faz com senhas
function hashDoCodigo(codigo, sal) {
    return crypto.createHash('sha256').update(sal + codigo).digest('hex');
}

function emailDoCodigo(nome, codigo) {
    const texto =
        `Olá, ${nome}!\n\n` +
        `Seu código para criar uma nova senha no Expresso é: ${codigo}\n\n` +
        `Ele vale por ${VALIDADE_CODIGO_MIN} minutos. Se você não pediu, pode ignorar este e-mail: sua senha continua a mesma.`;
    const html =
        `<div style="font-family:Arial,sans-serif;color:#1c1c1e;max-width:480px">` +
        `<p>Olá, ${nome.replace(/[<>&"]/g, '')}!</p>` +
        `<p>Seu código para criar uma nova senha no <b>Expresso</b> é:</p>` +
        `<p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#6F0049">${codigo}</p>` +
        `<p>Ele vale por ${VALIDADE_CODIGO_MIN} minutos. Se você não pediu, pode ignorar este e-mail: sua senha continua a mesma.</p>` +
        `</div>`;
    return { texto, html };
}

// POST /auth/recuperar-senha  { email }
async function solicitarRecuperacao(req, res, next) {
    try {
        const email = textoDoCorpo(req.body.email);
        if (!email) {
            return res.status(400).json({ erro: 'Informe o e-mail cadastrado.' });
        }
        if (!emailConfigurado() && !emModoLocal()) {
            return res.status(503).json({ erro: 'A recuperação de senha está indisponível no momento. Fale com um gestor.' });
        }

        // A resposta é a mesma exista o e-mail ou não, para ninguém descobrir quem tem cadastro
        const doc = await buscarPorEmail(email);
        if (!doc || !doc.data().ativo) {
            return res.status(200).json({ mensagem: MENSAGEM_ENVIO });
        }

        // Um pedido por minuto, para ninguém lotar a caixa de e-mail de outra pessoa
        const ref = db.collection('recuperacoes').doc(doc.id);
        const anterior = await ref.get();
        if (anterior.exists && Date.now() - anterior.data().criado_em.toMillis() < INTERVALO_REENVIO_MS) {
            return res.status(200).json({ mensagem: MENSAGEM_ENVIO });
        }

        const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        const sal = crypto.randomBytes(16).toString('hex');
        await ref.set({
            usuario_id: doc.data().id,
            sal,
            codigo_hash: hashDoCodigo(codigo, sal),
            tentativas: 0,
            criado_em: Timestamp.now(),
            expira_em: Timestamp.fromMillis(Date.now() + VALIDADE_CODIGO_MIN * 60 * 1000),
        });

        try {
            await enviarEmail({ para: email, assunto: 'Código para criar uma nova senha', ...emailDoCodigo(doc.data().nome, codigo) });
        } catch (erroEnvio) {
            await ref.delete();
            console.error(`[RECUPERACAO] Falha ao enviar o e-mail do usuário #${doc.data().id}:`, erroEnvio.message);
            return res.status(502).json({ erro: 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.' });
        }

        console.log(`[RECUPERACAO] Código enviado para o e-mail do usuário #${doc.data().id}`);
        res.status(200).json({ mensagem: MENSAGEM_ENVIO });
    } catch (error) {
        next(error);
    }
}

// POST /auth/redefinir-senha  { email, codigo, nova_senha }
async function redefinirSenha(req, res, next) {
    try {
        const email = textoDoCorpo(req.body.email);
        const codigo = textoDoCorpo(req.body.codigo);
        const novaSenha = req.body.nova_senha;

        if (!email || !/^\d{6}$/.test(codigo)) {
            return res.status(400).json({ erro: 'Informe o e-mail e o código de 6 dígitos.' });
        }
        if (typeof novaSenha !== 'string' || novaSenha.length < TAMANHO_MINIMO_SENHA) {
            return res.status(400).json({ erro: `A nova senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` });
        }

        const doc = await buscarPorEmail(email);
        if (!doc) {
            return res.status(400).json({ erro: MENSAGEM_CODIGO_INVALIDO });
        }

        // Transação: duas tentativas ao mesmo tempo não conseguem burlar o limite
        const ref = db.collection('recuperacoes').doc(doc.id);
        const resultado = await db.runTransaction(async (transacao) => {
            const pedido = await transacao.get(ref);
            if (!pedido.exists) return { erro: MENSAGEM_CODIGO_INVALIDO };

            const dados = pedido.data();
            if (dados.expira_em.toMillis() < Date.now() || dados.tentativas >= MAX_TENTATIVAS) {
                transacao.delete(ref);
                return { erro: MENSAGEM_CODIGO_INVALIDO };
            }

            const confere = crypto.timingSafeEqual(
                Buffer.from(hashDoCodigo(codigo, dados.sal), 'hex'),
                Buffer.from(dados.codigo_hash, 'hex')
            );
            if (!confere) {
                const restantes = MAX_TENTATIVAS - dados.tentativas - 1;
                transacao.update(ref, { tentativas: dados.tentativas + 1 });
                return { erro: restantes > 0 ? `Código incorreto. Restam ${restantes} tentativa(s).` : MENSAGEM_CODIGO_INVALIDO };
            }

            transacao.update(doc.ref, { senha: novaSenha });
            transacao.delete(ref);
            return {};
        });

        if (resultado.erro) {
            return res.status(400).json({ erro: resultado.erro });
        }
        // Quem estava logado com a senha antiga (inclusive um invasor) precisa entrar de novo
        await encerrarSessoesDoUsuario(doc.data().id);
        console.log(`[RECUPERACAO] Senha redefinida pelo usuário #${doc.data().id}`);
        res.status(200).json({ mensagem: 'Senha alterada com sucesso. Entre com a nova senha.' });
    } catch (error) {
        next(error);
    }
}

module.exports = { login, sair, solicitarRecuperacao, redefinirSenha };

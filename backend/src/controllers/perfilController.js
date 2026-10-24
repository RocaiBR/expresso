const { randomUUID } = require('crypto');
const { bucket, urlDeDownload, buscarDoc } = require('../config/firebase');
const { VERIFICACOES } = require('../utils/assinaturas');
const { encerrarSessoesDoUsuario } = require('../middlewares/autenticacao');
const { TAMANHO_MINIMO_SENHA } = require('../utils/validacoes');

// "Meu perfil": cada pessoa (qualquer cargo) vê os próprios dados e troca a foto e a senha
const TAMANHO_MAXIMO_FOTO = 512 * 1024; // o navegador manda 256x256, normalmente uns 30 KB
const TEMAS = ['claro', 'escuro', 'profundo'];

function dadosDoPerfil(dados) {
    const { id, nome, usuario, email, setor, funcao, foto_url, tema } = dados;
    return {
        id, nome, email,
        usuario: usuario || null,
        setor: setor || null,
        funcao: funcao || 'usuario',
        foto_url: foto_url || null,
        tema: tema || 'claro',
    };
}

// GET /perfil
async function verPerfil(req, res, next) {
    try {
        const doc = await buscarDoc('usuarios', req.usuario.id);
        res.status(200).json(dadosDoPerfil(doc.data()));
    } catch (error) {
        next(error);
    }
}

// PUT /perfil/foto  { imagem: "data:image/jpeg;base64,..." }
// A foto já vem recortada e reduzida pelo navegador (frontend-react/src/utils/imagem.js)
async function trocarFoto(req, res, next) {
    try {
        const partes = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(req.body.imagem || '');
        if (!partes) {
            return res.status(400).json({ erro: 'Envie a foto no formato JPEG.' });
        }
        const bytes = Buffer.from(partes[1], 'base64');
        if (bytes.length > TAMANHO_MAXIMO_FOTO) {
            return res.status(400).json({ erro: 'A foto deve ter até 512 KB.' });
        }
        // Mesma conferência de assinatura dos anexos: tem que ser um JPEG de verdade
        if (!VERIFICACOES.jpg(bytes)) {
            return res.status(400).json({ erro: 'O arquivo enviado não é uma imagem JPEG válida.' });
        }

        const doc = await buscarDoc('usuarios', req.usuario.id);
        const anterior = doc.data().foto_caminho;

        // Nome novo a cada troca, para o navegador não mostrar a foto antiga guardada em cache
        const caminho = `usuarios/${req.usuario.id}/foto-${randomUUID()}.jpg`;
        const token = randomUUID();
        await bucket().file(caminho).save(bytes, {
            resumable: false,
            metadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000',
                metadata: { firebaseStorageDownloadTokens: token },
            },
        });

        const fotoUrl = urlDeDownload(caminho, token);
        await doc.ref.update({ foto_url: fotoUrl, foto_caminho: caminho });
        if (anterior) await bucket().file(anterior).delete({ ignoreNotFound: true });

        console.log(`[PERFIL] Usuário #${req.usuario.id} trocou a foto (${bytes.length} bytes)`);
        res.status(200).json({ foto_url: fotoUrl });
    } catch (error) {
        next(error);
    }
}

// DELETE /perfil/foto
async function removerFoto(req, res, next) {
    try {
        const doc = await buscarDoc('usuarios', req.usuario.id);
        const caminho = doc.data().foto_caminho;
        if (caminho) await bucket().file(caminho).delete({ ignoreNotFound: true });
        await doc.ref.update({ foto_url: null, foto_caminho: null });
        res.status(200).json({ foto_url: null });
    } catch (error) {
        next(error);
    }
}

// PUT /perfil/senha  { senha_atual, nova_senha }
async function trocarSenha(req, res, next) {
    try {
        const { senha_atual: senhaAtual, nova_senha: novaSenha } = req.body;
        if (typeof novaSenha !== 'string' || novaSenha.length < TAMANHO_MINIMO_SENHA) {
            return res.status(400).json({ erro: `A nova senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` });
        }

        const doc = await buscarDoc('usuarios', req.usuario.id);
        // 400 e não 401: o 401 faria o site achar que a sessão caiu e voltar para o login
        if (senhaAtual !== doc.data().senha) {
            return res.status(400).json({ erro: 'A senha atual está incorreta.' });
        }
        if (novaSenha === senhaAtual) {
            return res.status(400).json({ erro: 'A nova senha precisa ser diferente da atual.' });
        }

        await doc.ref.update({ senha: novaSenha });
        // Derruba os logins em outros aparelhos; este continua
        await encerrarSessoesDoUsuario(req.usuario.id, req.token);
        console.log(`[PERFIL] Usuário #${req.usuario.id} trocou a própria senha`);
        res.status(200).json({ mensagem: 'Senha alterada. Se você estava conectado em outro aparelho, vai precisar entrar de novo lá.' });
    } catch (error) {
        next(error);
    }
}

// PUT /perfil/tema  { tema: "claro" | "escuro" | "profundo" } — lembrado em qualquer aparelho
async function salvarTema(req, res, next) {
    try {
        const { tema } = req.body;
        if (!TEMAS.includes(tema)) {
            return res.status(400).json({ erro: `Tema inválido. Use: ${TEMAS.join(', ')}.` });
        }
        const doc = await buscarDoc('usuarios', req.usuario.id);
        await doc.ref.update({ tema });
        res.status(200).json({ tema });
    } catch (error) {
        next(error);
    }
}

module.exports = { verPerfil, trocarFoto, removerFoto, trocarSenha, salvarTema };

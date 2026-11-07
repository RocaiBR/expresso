const express = require('express');
const cors = require('cors');

const { descreverBanco, horaDoBanco } = require('./config/firebase');
const { rotaNaoEncontrada, tratadorDeErros } = require('./middlewares/errorHandler');
const { autenticar } = require('./middlewares/autenticacao');

const tarefaRoutes = require('./routes/tarefaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const feriadoRoutes = require('./routes/feriadoRoutes');
const authRouters = require('./routes/authRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const manutencaoRoutes = require('./routes/manutencaoRoutes');

const app = express();
app.disable('x-powered-by');

// ------------ 1. MIDDLEWARES ------------
// O CORS só limita navegadores em outros sites; quem protege os dados é o token de login
const ORIGENS_PERMITIDAS = [
    'https://pi-expresso.web.app',
    'https://pi-expresso.firebaseapp.com',
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
app.use(cors({ origin: ORIGENS_PERMITIDAS }));

app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
});

const LIMITE_CORPO = 1024 * 1024;
app.use((req, res, next) => {
    const tamanho = req.rawBody ? req.rawBody.length : Number(req.get('content-length') || 0);
    if (tamanho > LIMITE_CORPO) {
        return res.status(413).json({ erro: 'A requisição passou do limite de 1 MB.' });
    }
    next();
});
app.use(express.json({ limit: LIMITE_CORPO }));

app.use((req, res, next) => {
    const inicio = Date.now();
    res.on('finish', () => {
        console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - inicio} ms)`);
    });
    next();
});

// ------------ 2. ROTAS ------------
const rotas = express.Router();

rotas.get('/', (req, res) => {
    res.status(200).json({
        mensagem: 'API do PI rodando com sucesso!',
        versao: '1.0.0',
        rotas: ['/health', '/tarefas', '/usuarios', '/feriados/:ano'],
    });
});

rotas.get('/health', async (req, res) => {
    try {
        res.status(200).json({
            api: 'ok',
            banco: 'conectado',
            banco_nome: descreverBanco(),
            hora_do_banco: await horaDoBanco(),
        });
    } catch (error) {
        console.error('[ERRO] /health:', error.message);
        res.status(503).json({ api: 'ok', banco: 'desconectado' });
    }
});

rotas.use('/tarefas', autenticar, tarefaRoutes);
rotas.use('/usuarios', autenticar, usuarioRoutes);
rotas.use('/feriados', autenticar, feriadoRoutes);
rotas.use('/notificacoes', autenticar, notificacaoRoutes);
rotas.use('/perfil', autenticar, perfilRoutes);
rotas.use('/manutencao', autenticar, manutencaoRoutes);
rotas.use('/auth', authRouters);

app.use('/api', rotas);
app.use(rotas);

//------------ 3. TRATAMENTO DE ERROS ------------
app.use(rotaNaoEncontrada);
app.use(tratadorDeErros);

module.exports = app;

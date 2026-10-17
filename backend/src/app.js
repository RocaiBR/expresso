const express = require('express');
const cors = require('cors');

const { descreverBanco, horaDoBanco } = require('./config/firebase');
const { rotaNaoEncontrada, tratadorDeErros } = require('./middlewares/errorHandler');
const { autenticar } = require('./middlewares/autenticacao');

const tarefaRoutes = require('./routes/tarefaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const feriadoRoutes = require('./routes/feriadoRoutes');
const authRouters = require('./routes/authRoutes');

const app = express();

// ------------ 1. MIDDLEWARES ------------
app.use(cors());
app.use(express.json());

// Uma linha de log por requisição (aparece no terminal, no Emulator UI e no Cloud Logging)
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
        res.status(500).json({ api: 'ok', banco: 'desconectado', erro: error.message });
    }
});

// Tudo exige login, menos o login e a recuperação de senha (em /auth)
rotas.use('/tarefas', autenticar, tarefaRoutes);
rotas.use('/usuarios', autenticar, usuarioRoutes);
rotas.use('/feriados', autenticar, feriadoRoutes);
rotas.use('/auth', authRouters);

// No Firebase Hosting as chamadas chegam com o prefixo /api (ver firebase.json)
app.use('/api', rotas);
app.use(rotas);

//------------ 3. TRATAMENTO DE ERROS ------------
app.use(rotaNaoEncontrada);
app.use(tratadorDeErros);

module.exports = app;

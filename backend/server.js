require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { pool, testConnection } = require('./src/config/db');
const { rotaNaoEncontrada, tratadorDeErros } = require('./src/middlewares/errorHandler');

const tarefaRoutes = require('./src/routes/tarefaRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const feriadoRoutes = require('./src/routes/feriadoRoutes');
const authRouters = require('./src/routes/authRoutes');

const app = express();

// ------------ 1. MIDDLEWARES ------------
app.use(cors());
app.use(express.json());

// ------------ 2. ROTAS ------------

app.get('/', (req, res) => {
    res.status(200).json({
        mensagem: 'API do PI rodando com sucesso!',
        versao: '1.0.0',
        rotas: ['/health', '/tarefas', '/usuarios', '/feriados/:ano'],
    });
});

app.get('/health', async (req, res) => {
    try {
        const [linhas] = await pool.query('SELECT NOW() AS agora');
        res.status(200).json({
            api: 'ok',
            banco: 'conectado',
            banco_nome: process.env.DB_NAME,
            hora_do_banco: linhas[0].agora,
        });
    } catch (error) {
        res.status(500).json({ api: 'ok', banco: 'desconectado', erro: error.message });
    }
});

app.use('/tarefas', tarefaRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/feriados', feriadoRoutes);
app.use('/auth', authRouters);

//------------ 3. TRATAMENTO DE ERROS ------------
app.use(rotaNaoEncontrada);
app.use(tratadorDeErros);

//------------ SOBE O SERVIDOR ------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`------------------------------`);
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    await testConnection();
    console.log(`------------------------------`);
});
const { onRequest } = require('firebase-functions/https');
const { onSchedule } = require('firebase-functions/scheduler');
const app = require('./src/app');
const { verificarPrazos } = require('./src/utils/prazos');

exports.api = onRequest(
    {
        region: 'southamerica-east1',
        maxInstances: 2,
        secrets: ['GMAIL_USUARIO', 'GMAIL_SENHA_APP'],
    },
    app
);

// Todo dia logo depois da meia-noite: atividades com o prazo vencido viram urgentes (src/utils/prazos.js)
exports.verificarPrazos = onSchedule(
    {
        schedule: 'every day 00:05',
        timeZone: 'America/Sao_Paulo',
        region: 'southamerica-east1',
    },
    async () => {
        await verificarPrazos();
    }
);

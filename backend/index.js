const { onRequest } = require('firebase-functions/https');
const { onSchedule } = require('firebase-functions/scheduler');
const app = require('./src/app');
const { executarRotinaDiaria } = require('./src/utils/manutencao');

exports.api = onRequest(
    {
        region: 'southamerica-east1',
        maxInstances: 2,
        secrets: ['GMAIL_USUARIO', 'GMAIL_SENHA_APP'],
    },
    app
);

exports.rotinaDiaria = onSchedule(
    {
        schedule: 'every day 00:05',
        timeZone: 'America/Sao_Paulo',
        region: 'southamerica-east1',
    },
    async () => {
        await executarRotinaDiaria();
    }
);

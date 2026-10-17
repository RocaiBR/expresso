const { onRequest } = require('firebase-functions/https');
const app = require('./src/app');

exports.api = onRequest(
    {
        region: 'southamerica-east1',
        maxInstances: 2,
        secrets: ['GMAIL_USUARIO', 'GMAIL_SENHA_APP'],
    },
    app
);

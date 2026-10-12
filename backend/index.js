// Ponto de entrada na nuvem: a API Express inteira roda como uma Cloud Function chamada "api".
// Endereço: https://southamerica-east1-<projeto>.cloudfunctions.net/api  (ou <site>/api pelo Hosting)
const { onRequest } = require('firebase-functions/https');
const app = require('./src/app');

exports.api = onRequest(
    {
        region: 'southamerica-east1', 
        maxInstances: 2,           
    },
    app
);

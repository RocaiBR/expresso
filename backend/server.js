// Servidor local (npm run dev). Na nuvem quem sobe a API é o index.js (Cloud Function).
require('dotenv').config({ path: require('path').join(__dirname, '.env.servidor') });

const app = require('./src/app');
const { testConnection } = require('./src/config/firebase');

//------------ SOBE O SERVIDOR ------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`------------------------------`);
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    await testConnection();
    console.log(`------------------------------`);
});

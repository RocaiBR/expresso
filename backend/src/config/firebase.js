const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Na Cloud Function o Firebase se configura sozinho. Rodando local (npm run dev),
initializeApp(process.env.PROJETO_FIREBASE
    ? { projectId: process.env.PROJETO_FIREBASE, storageBucket: process.env.BUCKET_FIREBASE }
    : undefined);

const db = getFirestore();

// Bucket do Cloud Storage onde ficam os anexos
function bucket() {
    try {
        return getStorage().bucket();
    } catch (error) {
        const erro = new Error('O Storage ainda não foi configurado (confira BUCKET_FIREBASE no .env.servidor).');
        erro.status = 503;
        throw erro;
    }
}

// Link público de download (o token funciona como senha do arquivo, igual ao do Console do Firebase)
function urlDeDownload(caminho, token) {
    const base = process.env.STORAGE_EMULATOR_HOST || 'https://firebasestorage.googleapis.com';
    return `${base}/v0/b/${bucket().name}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`;
}

function descreverBanco() {
    const projeto = db.projectId || process.env.PROJETO_FIREBASE || 'desconhecido';
    const onde = process.env.FIRESTORE_EMULATOR_HOST
        ? `emulador em ${process.env.FIRESTORE_EMULATOR_HOST}`
        : 'nuvem';
    return `Firestore ${projeto} (${onde})`;
}

// Faz uma leitura e devolve a hora do servidor do Firestore (equivalente ao SELECT NOW())
async function horaDoBanco() {
    const resultado = await db.collection('tarefas').limit(1).get();
    return resultado.readTime.toDate().toISOString();
}

async function testarConexao() {
    try {
        await horaDoBanco();
        console.log(`[DB] Conectado ao ${descreverBanco()}`);
        return true;
    } catch (error) {
        console.error('[DB] Falha ao conectar no Firestore:', error.message);
        console.error('[DB] Confira o arquivo .env.servidor e, se usar o emulador, se "npm run emuladores" está rodando.');
        return false;
    }
}

/* O Firestore não tem AUTO_INCREMENT: o último id de cada coleção fica em contadores/<colecao>.
    Precisa rodar dentro de uma transação para dois cadastros simultâneos não pegarem o mesmo id. */
async function proximoId(transacao, colecao) {
    const ref = db.collection('contadores').doc(colecao);
    const contador = await transacao.get(ref);
    const id = (contador.exists ? contador.data().ultimo : 0) + 1;
    transacao.set(ref, { ultimo: id });
    return id;
}

// Busca pelo id da URL; devolve null se não existir
async function buscarDoc(colecao, id) {
    if (!/^\d+$/.test(String(id))) return null;
    const doc = await db.collection(colecao).doc(String(id)).get();
    return doc.exists ? doc : null;
}
function paraJson(doc) {
    const dados = doc.data();
    for (const [campo, valor] of Object.entries(dados)) {
        if (valor instanceof Timestamp) dados[campo] = valor.toDate().toISOString();
    }
    return dados;
}

module.exports = {
    db,
    FieldValue,
    Timestamp,
    bucket,
    urlDeDownload,
    descreverBanco,
    horaDoBanco,
    testConnection: testarConexao,
    proximoId,
    buscarDoc,
    paraJson
};

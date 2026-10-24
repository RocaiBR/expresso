const fs = require('fs');
const path = require('path');

const SITE = 'http://127.0.0.1:5000';                                         
const API = SITE + '/api';                                                     
const API_FUNCAO = 'http://127.0.0.1:5001/demo-expresso/southamerica-east1/api'; 
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-expresso/databases/(default)/documents';
const STORAGE = 'http://127.0.0.1:9199/storage/v1/b/demo-expresso.appspot.com';
const DONO = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }; 
const SENHA = 'senha123';

const PASTA_EVIDENCIAS = path.resolve(__dirname, '..', '..', 'docs', 'evidencias');
const PASTA_PRINTS = path.join(PASTA_EVIDENCIAS, 'prints');
const ASSETS = path.resolve(__dirname, '..', '..', 'frontend-react', 'src', 'assets');

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function chamar(token, metodo, caminho, corpo) {
    const resposta = await fetch(API + caminho, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    return { status: resposta.status, dados: await resposta.json().catch(() => null) };
}

async function login(usuario, senha = SENHA) {
    return (await chamar(null, 'POST', '/auth/login', { usuario, senha })).dados;
}

async function token(usuario, senha = SENHA) {
    const resposta = await login(usuario, senha);
    if (!resposta || !resposta.token) throw new Error(`login de "${usuario}" falhou: ${resposta && resposta.erro}`);
    return resposta.token;
}

function valorFirestore(valor) {
    if (valor === null || valor === undefined) return { nullValue: null };
    if (typeof valor === 'boolean') return { booleanValue: valor };
    if (typeof valor === 'number') return Number.isInteger(valor) ? { integerValue: String(valor) } : { doubleValue: valor };
    if (valor instanceof Date) return { timestampValue: valor.toISOString() };
    if (Array.isArray(valor)) return { arrayValue: { values: valor.map(valorFirestore) } };
    return { stringValue: String(valor) };
}

async function gravarNoBanco(caminho, campos, parcial = false) {
    const mascara = parcial ? '?' + Object.keys(campos).map((c) => `updateMask.fieldPaths=${c}`).join('&') : '';
    const fields = Object.fromEntries(Object.entries(campos).map(([c, v]) => [c, valorFirestore(v)]));
    const resposta = await fetch(`${FIRESTORE}/${caminho}${mascara}`, { method: 'PATCH', headers: DONO, body: JSON.stringify({ fields }) });
    if (!resposta.ok) throw new Error(`gravarNoBanco ${caminho}: ${resposta.status}`);
}

async function consultarNoBanco(colecao, campo, valor) {
    const resposta = await fetch(`${FIRESTORE}:runQuery`, {
        method: 'POST', headers: DONO,
        body: JSON.stringify({ structuredQuery: {
            from: [{ collectionId: colecao, allDescendants: true }],
            where: { fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: valorFirestore(valor) } },
        } }),
    }).then((r) => r.json());
    return resposta.filter((linha) => linha.document).map((linha) => linha.document);
}

async function arquivosNoStorage(prefixo = '') {
    const lista = await fetch(`${STORAGE}/o?prefix=${encodeURIComponent(prefixo)}`, { headers: DONO }).then((r) => r.json());
    return (lista.items || []).map((item) => item.name);
}

async function zerarEmuladores() {
    await fetch(FIRESTORE.replace('/v1/', '/emulator/v1/'), { method: 'DELETE' });
    for (const nome of await arquivosNoStorage()) {
        await fetch(`${STORAGE}/o/${encodeURIComponent(nome)}`, { method: 'DELETE', headers: DONO });
    }
}

async function criarPrimeiroTI() {
    await gravarNoBanco('usuarios/1', {
        id: 1, nome: 'Tina TI', usuario: 'tina', email: 'tina@teste.com', senha: SENHA,
        setor: 'TI', funcao: 'ti', ativo: true,
    });
    await gravarNoBanco('contadores/usuarios', { ultimo: 1 });
    return token('tina');
}

async function criarUsuario(tokenTI, nome, usuario, setor, funcao) {
    const { status, dados } = await chamar(tokenTI, 'POST', '/usuarios', {
        nome, usuario, email: `${usuario}@teste.com`, senha: SENHA, setor, funcao,
    });
    if (status !== 201) throw new Error(`criar usuário ${usuario}: ${status} ${dados && dados.erro}`);
    return dados;
}

function diaEmSaoPaulo(deslocamento = 0) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
        .format(new Date(Date.now() + deslocamento * 86400000));
}

async function abrirNavegador() {
    let chromium;
    try {
        ({ chromium } = require('playwright-core'));
    } catch (erro) {
        return { navegador: null, motivo: 'playwright-core não instalado (rode npm install no backend)' };
    }
    for (const channel of ['msedge', 'chrome']) {
        try {
            return { navegador: await chromium.launch({ channel, headless: true }), canal: channel };
        } catch (erro) {
        }
    }
    return { navegador: null, motivo: 'nenhum navegador encontrado (Microsoft Edge ou Google Chrome)' };
}

async function entrarNoSite(navegador, usuario, senha = SENHA, viewport = { width: 1400, height: 880 }) {
    const contexto = await navegador.newContext({ viewport });
    const pagina = await contexto.newPage();
    await pagina.goto(SITE + '/login');
    await pagina.fill('#usuario', usuario);
    await pagina.fill('#senha', senha);
    await pagina.click('button[type=submit]');
    await pagina.waitForURL(SITE + '/');
    return pagina;
}

module.exports = {
    SITE, API, API_FUNCAO, FIRESTORE, STORAGE, DONO, SENHA, PASTA_EVIDENCIAS, PASTA_PRINTS, ASSETS,
    esperar, chamar, login, token, gravarNoBanco, consultarNoBanco, arquivosNoStorage, zerarEmuladores,
    criarPrimeiroTI, criarUsuario, diaEmSaoPaulo, abrirNavegador, entrarNoSite, fs, path,
};

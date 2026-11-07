// Mede o site publicado e resume os logs da nuvem. Serve de evidência de monitoramento.
// Uso: npm run medir:nuvem -- antes   (grava docs/evidencias/monitoramento/medicao-antes.json)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = process.env.SITE_MEDIDO || 'https://pi-expresso.web.app';
const PASTA = path.resolve(__dirname, '..', '..', 'docs', 'evidencias', 'monitoramento');
const CABECALHOS = [
    'cache-control', 'strict-transport-security', 'content-security-policy', 'x-frame-options',
    'x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-powered-by', 'access-control-allow-origin',
];
const REDES = {
    sem_limite: null,
    '4g_simulado_10mbps': { offline: false, latency: 40, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8 },
};

const mediana = (lista) => {
    const ordenada = [...lista].sort((a, b) => a - b);
    return ordenada[Math.floor(ordenada.length / 2)];
};
const percentil = (lista, p) => {
    const ordenada = [...lista].sort((a, b) => a - b);
    return ordenada[Math.min(ordenada.length - 1, Math.ceil((p / 100) * ordenada.length) - 1)];
};

async function medirCarregamento(contexto, rede) {
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (rede) await cdp.send('Network.emulateNetworkConditions', rede);

    let bytes = 0;
    let requisicoes = 0;
    const urls = {};
    let maior = { url: null, bytes: 0 };
    cdp.on('Network.requestWillBeSent', (e) => { urls[e.requestId] = e.request.url; });
    cdp.on('Network.loadingFinished', (e) => {
        if ((urls[e.requestId] || '').startsWith('data:')) return;
        bytes += e.encodedDataLength;
        requisicoes += 1;
        if (e.encodedDataLength > maior.bytes) maior = { url: new URL(urls[e.requestId]).pathname, bytes: e.encodedDataLength };
    });

    await pagina.addInitScript(() => {
        window.__lcp = 0;
        new PerformanceObserver((lista) => {
            for (const item of lista.getEntries()) window.__lcp = item.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    // O React insere as imagens depois do evento "load": só a rede parada garante que tudo baixou
    const inicio = Date.now();
    await pagina.goto(`${SITE}/login`, { waitUntil: 'networkidle', timeout: 180000 });
    const rede_ociosa_ms = Date.now() - inicio - 500; // o networkidle espera 500 ms de rede parada
    await pagina.waitForFunction(() => [...document.images].every((img) => img.complete), null, { timeout: 60000 });
    const tempos = await pagina.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return { dom_pronto_ms: Math.round(nav.domContentLoadedEventEnd), lcp_ms: Math.round(window.__lcp) };
    });
    await pagina.close();
    return { ...tempos, tudo_baixado_ms: rede_ociosa_ms, bytes, requisicoes, maior_arquivo: maior };
}

async function medirSite(rotulo) {
    const { chromium } = require('playwright-core');
    const navegador = await chromium.launch({ channel: 'msedge', headless: true });
    const resultado = {};
    try {
        for (const [nome, rede] of Object.entries(REDES)) {
            const rodadas = [];
            for (let i = 0; i < 3; i++) {
                const contexto = await navegador.newContext({ viewport: { width: 1366, height: 768 } });
                rodadas.push(await medirCarregamento(contexto, rede));
                await contexto.close();
            }
            resultado[nome] = {
                dom_pronto_ms: mediana(rodadas.map((r) => r.dom_pronto_ms)),
                lcp_ms: mediana(rodadas.map((r) => r.lcp_ms)),
                tudo_baixado_ms: mediana(rodadas.map((r) => r.tudo_baixado_ms)),
                bytes: mediana(rodadas.map((r) => r.bytes)),
                requisicoes: rodadas[0].requisicoes,
                maior_arquivo: rodadas[0].maior_arquivo,
            };
        }
        const contexto = await navegador.newContext({ viewport: { width: 1366, height: 768 } });
        const pagina = await contexto.newPage();
        await pagina.goto(`${SITE}/login`, { waitUntil: 'networkidle', timeout: 120000 });
        fs.mkdirSync(PASTA, { recursive: true });
        await pagina.screenshot({ path: path.join(PASTA, `login-${rotulo}.png`) });
        await contexto.close();
    } finally {
        await navegador.close();
    }
    return resultado;
}

async function lerCabecalhos() {
    const pagina = await fetch(`${SITE}/login`);
    const html = await pagina.text();
    const js = (html.match(/\/assets\/[^"]+\.js/) || [])[0];
    const escolher = (resposta) => Object.fromEntries(CABECALHOS.map((c) => [c, resposta.headers.get(c)]).filter(([, v]) => v !== null));
    const origemEstranha = { Origin: 'https://site-de-outra-pessoa.example' };
    return {
        pagina: escolher(pagina),
        arquivo_com_hash: js ? escolher(await fetch(SITE + js)) : null,
        api: escolher(await fetch(`${SITE}/api/health`, { headers: origemEstranha })),
    };
}

async function medirApi() {
    const tempos = [];
    for (let i = 0; i < 10; i++) {
        const inicio = performance.now();
        const resposta = await fetch(`${SITE}/api/health`);
        await resposta.text();
        tempos.push(Math.round(performance.now() - inicio));
    }
    return { primeira_ms: tempos[0], mediana_das_seguintes_ms: mediana(tempos.slice(1)), todas_ms: tempos };
}

// A API de logs às vezes recusa a leitura, e com mais de 1000 linhas devolve as mais antigas em vez das recentes
async function lerLogs() {
    for (let tentativa = 1; ; tentativa++) {
        try {
            return execSync('firebase functions:log --only api --lines 1000', {
                cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
            });
        } catch (erro) {
            if (tentativa === 4) throw erro;
            await new Promise((pronto) => setTimeout(pronto, 25000));
        }
    }
}

function resumirLogs(texto) {
    const chamadas = [];
    const partidas = [];
    const partidasAbertas = [];
    let iniciadas = 0;
    let erros = 0;
    for (const linha of texto.split(/\r?\n/)) {
        const hora = (linha.match(/^(\S+Z) /) || [])[1];
        const http = linha.match(/\[HTTP\] (\S+) (\S+) -> (\d+) \((\d+) ms\)/);
        if (http) chamadas.push({ hora, metodo: http[1], rota: http[2], status: Number(http[3]), ms: Number(http[4]) });
        if (linha.includes('[ERRO]')) erros += 1;
        if (linha.includes('Starting new instance')) {
            partidasAbertas.push(hora);
            iniciadas += 1;
        }
        if (linha.includes('STARTUP TCP probe succeeded') && partidasAbertas.length) {
            partidas.push(new Date(hora) - new Date(partidasAbertas.shift()));
        }
    }

    const tempos = chamadas.map((c) => c.ms);
    const porRota = {};
    for (const c of chamadas) {
        const chave = `${c.metodo} ${c.rota.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id')}`;
        (porRota[chave] = porRota[chave] || []).push(c.ms);
    }
    const contar = (faixa) => chamadas.filter((c) => Math.floor(c.status / 100) === faixa).length;
    const porDia = {};
    for (const c of chamadas) {
        const dia = new Date(new Date(c.hora).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // Brasília
        (porDia[dia] = porDia[dia] || []).push(c);
    }
    return {
        periodo: chamadas.length ? { de: chamadas[0].hora, ate: chamadas[chamadas.length - 1].hora } : null,
        requisicoes: chamadas.length,
        tempo_ms: tempos.length ? { mediana: percentil(tempos, 50), p95: percentil(tempos, 95), maximo: Math.max(...tempos) } : null,
        status: { '2xx': contar(2), '3xx': contar(3), '4xx': contar(4), '5xx': contar(5) },
        erros_registrados: erros,
        partidas_a_frio: {
            quantidade: iniciadas,
            mediana_ms: partidas.length ? percentil(partidas, 50) : null,
            maximo_ms: partidas.length ? Math.max(...partidas) : null,
        },
        rotas_mais_chamadas: Object.entries(porRota)
            .map(([rota, lista]) => ({ rota, chamadas: lista.length, media_ms: Math.round(lista.reduce((a, b) => a + b, 0) / lista.length), maximo_ms: Math.max(...lista) }))
            .sort((a, b) => b.chamadas - a.chamadas)
            .slice(0, 8),
        por_dia: Object.entries(porDia).sort().map(([dia, lista]) => ({
            dia,
            requisicoes: lista.length,
            erros_5xx: lista.filter((c) => c.status >= 500).length,
            p95_ms: percentil(lista.map((c) => c.ms), 95),
        })),
    };
}

async function principal() {
    const rotulo = process.argv[2] || new Date().toISOString().slice(0, 10);
    // A primeira chamada precisa vir antes do site, senão o site já acorda a função
    const api = await medirApi();
    const resultado = {
        rotulo,
        medido_em: new Date().toISOString(),
        site: SITE,
        api,
        cabecalhos: await lerCabecalhos(),
        carregamento_login: await medirSite(rotulo),
        logs: resumirLogs(await lerLogs()),
    };
    fs.mkdirSync(PASTA, { recursive: true });
    const arquivo = path.join(PASTA, `medicao-${rotulo}.json`);
    fs.writeFileSync(arquivo, JSON.stringify(resultado, null, 2) + '\n');
    console.log(JSON.stringify(resultado, null, 2));
    console.log(`\nGravado em ${path.relative(process.cwd(), arquivo)}`);
}

if (require.main === module) {
    principal().catch((erro) => {
        console.error(erro);
        process.exit(1);
    });
}

module.exports = { resumirLogs };

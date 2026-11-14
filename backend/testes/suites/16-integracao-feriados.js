const http = require('http');
const { FIRESTORE, DONO, chamar, criarPrimeiroTI, gravarNoBanco, comApiDireta } = require('../apoio');

// Uma BrasilAPI de mentira, rodando dentro do teste: cada ano responde de um jeito
const FERIADOS_2026 = [
    { date: '2026-04-21', name: 'Tiradentes', type: 'national', weekday: 'terça-feira' },
    { date: '2026-01-01', name: 'Confraternização mundial', type: 'national', weekday: 'quinta-feira' },
    { date: '2026-12-25', name: 'Natal', type: 'national', weekday: 'sexta-feira' },
];
const SUJOS_2027 = [
    { date: '2027-11-15', name: 'Proclamação da República', type: 'national' },
    { date: '2027-02-30', name: 'Data que não existe', type: 'national' },
    { date: '2026-12-25', name: 'Feriado de outro ano', type: 'national' },
    { date: '2027-05-01', name: '   ', type: 'national' },
    { name: 'Sem data' },
    null,
    { date: '2027-11-15', name: 'Proclamação da República', type: 'national' },
    { date: '2027-01-01', name: 'Confraternização mundial', type: 'national', extra: '<script>' },
];

function brasilApiFalsa() {
    const estado = { chamadas: 0, modo: {} };
    const servidor = http.createServer((req, res) => {
        estado.chamadas += 1;
        const ano = req.url.split('/').pop();
        const modo = estado.modo[ano] || 'ok';
        const json = (status, corpo) => {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(corpo));
        };
        if (modo === 'ok') return json(200, FERIADOS_2026);
        if (modo === 'sujo') return json(200, SUJOS_2027);
        if (modo === 'vazio') return json(200, []);
        if (modo === 'erro') return json(500, { message: 'falha interna da BrasilAPI' });
        if (modo === 'texto') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end('<html>manutenção</html>');
        }
        if (modo === 'lenta') return setTimeout(() => json(200, FERIADOS_2026), 8000);
    });
    return new Promise((pronto) => servidor.listen(0, '127.0.0.1', () => pronto({ servidor, estado })));
}

async function copiaGuardada(ano) {
    const resposta = await fetch(`${FIRESTORE}/feriados/${ano}`, { headers: DONO });
    return resposta.ok ? (await resposta.json()).fields : null;
}

module.exports = {
    nome: 'Integração com a BrasilAPI (feriados)',
    descricao: 'A API consulta a BrasilAPI com tempo limite, confere e padroniza cada feriado, guarda uma cópia por ano no Firestore e continua respondendo se a fonte cair.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const { servidor, estado } = await brasilApiFalsa();
        process.env.BRASILAPI_URL = `http://127.0.0.1:${servidor.address().port}/api/feriados/v1`;
        const cabecalho = { Authorization: `Bearer ${ti}` };

        try {
            await comApiDireta(async (api) => {
                const pedir = async (ano) => {
                    const inicio = Date.now();
                    const resposta = await fetch(`${api}/feriados/${ano}`, { headers: cabecalho });
                    return { status: resposta.status, fonte: resposta.headers.get('x-fonte-dados'), dados: await resposta.json(), ms: Date.now() - inicio };
                };

                // ---- Entrada
                const recusados = await Promise.all(['abc', '1899', '2200', '20266'].map(pedir));
                t.conferir(recusados.every((r) => r.status === 400 || r.status === 404) && recusados.slice(0, 3).every((r) => r.status === 400) && estado.chamadas === 0,
                    `ano inválido (abc, 1899, 2200) é recusado com 400 antes de chamar a BrasilAPI ("${recusados[1].dados.erro}")`);

                // ---- Primeira consulta e cópia guardada
                let r = await pedir(2026);
                t.conferir(r.status === 200 && r.fonte === 'brasilapi' && estado.chamadas === 1, '1ª consulta de 2026: busca na BrasilAPI (X-Fonte-Dados: brasilapi)');
                t.conferir(r.dados.map((f) => f.date).join() === '2026-01-01,2026-04-21,2026-12-25' &&
                    r.dados.every((f) => Object.keys(f).join() === 'date,name,type'),
                'a lista sai em ordem de data e só com os campos do contrato (date, name, type)');
                const copia = await copiaGuardada(2026);
                t.conferir(copia && copia.fonte.stringValue === 'BrasilAPI' && copia.feriados.arrayValue.values.length === 3,
                    'a lista conferida fica guardada no Firestore (feriados/2026)');
                r = await pedir(2026);
                t.conferir(r.status === 200 && r.fonte === 'cache' && estado.chamadas === 1 && r.dados.length === 3,
                    '2ª consulta: responde pela cópia, sem chamar a BrasilAPI de novo');
                const pelaFuncao = await chamar(ti, 'GET', '/feriados/2026');
                t.conferir(pelaFuncao.status === 200 && pelaFuncao.dados.length === 3, 'a Cloud Function (emulador) responde pela mesma cópia do banco');

                // ---- Dados sujos da fonte
                estado.modo['2027'] = 'sujo';
                r = await pedir(2027);
                t.conferir(r.status === 200 && r.dados.length === 2 && r.dados.map((f) => f.date).join() === '2027-01-01,2027-11-15' && !('extra' in r.dados[0]),
                    `itens da fonte com data inexistente, de outro ano, sem nome, nulos ou repetidos são descartados (8 recebidos, ${r.dados.length} aproveitados)`);

                // ---- Fonte com problema e sem cópia
                for (const [ano, modo, descricao] of [[2028, 'erro', 'responde 500'], [2029, 'texto', 'responde HTML em vez de JSON'], [2030, 'vazio', 'responde uma lista vazia']]) {
                    estado.modo[ano] = modo;
                    r = await pedir(ano);
                    t.conferir(r.status === 502 && /Tente de novo/.test(r.dados.erro) && !(await copiaGuardada(ano)),
                        `BrasilAPI ${descricao}: 502 com mensagem clara, e nada é guardado`);
                }
                estado.modo['2031'] = 'lenta';
                r = await pedir(2031);
                t.conferir(r.status === 502 && r.ms < 7000, `BrasilAPI que não responde: a API desiste em ${(r.ms / 1000).toFixed(1)} s (limite de 5 s) e responde 502`);

                // ---- Cópia vencida
                await gravarNoBanco('feriados/2026', { atualizado_em: new Date(Date.now() - 40 * 86400000) }, true);
                estado.modo['2026'] = 'erro';
                const antes = estado.chamadas;
                r = await pedir(2026);
                t.conferir(r.status === 200 && r.fonte === 'cache-vencido' && r.dados.length === 3 && estado.chamadas === antes + 1,
                    'cópia com mais de 30 dias e BrasilAPI fora do ar: tenta a fonte e responde com a cópia (X-Fonte-Dados: cache-vencido)');
                estado.modo['2026'] = 'ok';
                r = await pedir(2026);
                const renovada = await copiaGuardada(2026);
                t.conferir(r.status === 200 && r.fonte === 'brasilapi' && Date.now() - Date.parse(renovada.atualizado_em.timestampValue) < 60000,
                    'cópia vencida e BrasilAPI de volta: busca de novo e renova a cópia');
            });
        } finally {
            delete process.env.BRASILAPI_URL;
            servidor.close();
        }
    },
};

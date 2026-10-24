const { fs, path, API, PASTA_EVIDENCIAS, PASTA_PRINTS, esperar, zerarEmuladores, abrirNavegador } = require('./apoio');

const PASTA_SUITES = path.join(__dirname, 'suites');
const SUITES = fs.readdirSync(PASTA_SUITES).filter((nome) => nome.endsWith('.js')).sort()
    .map((nome) => ({ arquivo: nome, ...require(path.join(PASTA_SUITES, nome)) }));
const RELATORIO = path.join(PASTA_EVIDENCIAS, 'relatorio-de-testes.md');

async function esperarApi() {
    for (let tentativa = 0; tentativa < 60; tentativa++) {
        const ok = await fetch(API + '/health').then((r) => r.ok).catch(() => false);
        if (ok) return;
        await esperar(1000);
    }
    throw new Error('a API não respondeu em ' + API + ' (os emuladores estão no ar?)');
}

function quando() {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
}

function escreverRelatorio(resultados, canal, duracaoTotal) {
    const contar = (r) => ({ total: r.checagens.length, ok: r.checagens.filter((c) => c.ok).length });
    const geral = resultados.reduce((soma, r) => {
        const { total, ok } = contar(r);
        return { total: soma.total + total, ok: soma.ok + ok };
    }, { total: 0, ok: 0 });
    const puladas = resultados.filter((r) => r.pulada).length;
    const navegador = { msedge: 'Microsoft Edge', chrome: 'Google Chrome' }[canal] || 'nenhum (testes de tela pulados)';

    const linhas = [
        '# Relatório de testes automatizados — Expresso',
        '',
        `Gerado em ${quando()} (horário de Brasília) pelo comando \`npm run testar:tudo\` (pasta \`backend\`), em ${(duracaoTotal / 1000).toFixed(0)} s.`,
        '',
        '- **Ambiente:** emuladores do Firebase (Firestore, Storage, Cloud Functions e Hosting), projeto `demo-expresso`. O banco e o Storage são zerados antes de cada grupo.',
        `- **Node.js:** ${process.version} · **Navegador dos testes de tela:** ${navegador}, sem janela`,
        `- **Resultado:** **${geral.total} checagens, ${geral.ok} passaram, ${geral.total - geral.ok} falharam**` +
            ` (${resultados.length} grupos${puladas ? `, ${puladas} pulados` : ''})`,
        '',
        'Como ler: cada linha é uma verificação feita contra a API ou o site de verdade (rodando nos emuladores).',
        '✔ = o sistema se comportou como a regra exige; ✘ = não se comportou. As regras e onde cada uma está no código',
        'estão em [docs/dados-e-integracao.md](../dados-e-integracao.md).',
        '',
        '## Resumo',
        '',
        '| # | Grupo | O que comprova | Checagens | Resultado |',
        '|---|---|---|---|---|',
    ];
    resultados.forEach((r, indice) => {
        const { total, ok } = contar(r);
        const resultado = r.pulada ? `pulado (${r.pulada})` : (ok === total ? '✔ tudo certo' : `✘ ${total - ok} falha(s)`);
        linhas.push(`| ${indice + 1} | [${r.nome}](#${indice + 1}-${ancora(r.nome)}) | ${r.descricao} | ${ok}/${total} | ${resultado} |`);
    });

    resultados.forEach((r, indice) => {
        linhas.push('', `## ${indice + 1}. ${r.nome}`, '', r.descricao, '', `Arquivo: \`backend/testes/suites/${r.arquivo}\` · ${(r.ms / 1000).toFixed(1)} s`, '');
        if (r.pulada) linhas.push(`> Pulado: ${r.pulada}.`);
        r.checagens.forEach((c) => linhas.push(`- ${c.ok ? '✔' : '✘'} ${c.msg}`));
        r.anexos.forEach((a) => linhas.push('', `**${a.titulo}**`, '', '```json', a.conteudo, '```'));
        if (r.prints.length) {
            linhas.push('', '**Telas:**', '');
            r.prints.forEach((p) => linhas.push(`![${p.legenda}](prints/${p.arquivo})`, `*${p.legenda}*`, ''));
        }
    });
    fs.writeFileSync(RELATORIO, linhas.join('\n') + '\n', 'utf8');
    return geral;
}

function ancora(texto) {
    return texto.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
}

async function main() {
    const inicio = Date.now();
    fs.mkdirSync(PASTA_PRINTS, { recursive: true });
    for (const arquivo of fs.readdirSync(PASTA_PRINTS)) {
        if (arquivo.endsWith('.png')) fs.unlinkSync(path.join(PASTA_PRINTS, arquivo));
    }
    await esperarApi();
    const { navegador, canal, motivo } = await abrirNavegador();
    if (!navegador) console.log(`(testes de tela serão pulados: ${motivo})`);

    const resultados = [];
    for (const suite of SUITES) {
        const registro = { nome: suite.nome, descricao: suite.descricao, arquivo: suite.arquivo, checagens: [], prints: [], anexos: [], pulada: null, ms: 0 };
        resultados.push(registro);
        console.log(`\n=== ${suite.nome}`);
        if (suite.usaNavegador && !navegador) {
            registro.pulada = motivo;
            console.log(`  (pulado: ${motivo})`);
            continue;
        }
        const comeco = Date.now();
        await zerarEmuladores();
        const t = {
            navegador,
            conferir(ok, msg) {
                registro.checagens.push({ ok: Boolean(ok), msg });
                console.log(`  ${ok ? '✔' : '✘'} ${msg}`);
            },
            async print(pagina, nome, legenda) {
                await pagina.screenshot({ path: path.join(PASTA_PRINTS, `${nome}.png`) });
                registro.prints.push({ arquivo: `${nome}.png`, legenda });
            },
            anexar(titulo, objeto) {
                registro.anexos.push({ titulo, conteudo: JSON.stringify(objeto, null, 2) });
            },
        };
        try {
            await suite.executar(t);
        } catch (erro) {
            t.conferir(false, `erro inesperado: ${erro.message}`);
        }
        if (navegador) for (const contexto of navegador.contexts()) await contexto.close();
        registro.ms = Date.now() - comeco;
    }
    if (navegador) await navegador.close();

    const geral = escreverRelatorio(resultados, canal, Date.now() - inicio);
    console.log(`\n${geral.ok}/${geral.total} checagens passaram. Relatório: ${path.relative(process.cwd(), RELATORIO)}`);
    process.exit(geral.ok === geral.total ? 0 : 1);
}

main().catch((erro) => {
    console.error('FALHOU:', erro.message);
    process.exit(1);
});

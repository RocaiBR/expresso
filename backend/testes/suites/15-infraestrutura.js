const {
    SITE, SENHA, FIRESTORE, DONO, ASSETS, path, chamar, token, esperar, criarPrimeiroTI, criarUsuario, gravarNoBanco, consultarNoBanco,
    entrarNoSite, cabecalhosDoSite, violacoesDaPolitica,
} = require('../apoio');

async function senhaNoBanco(id) {
    const doc = await fetch(`${FIRESTORE}/usuarios/${id}`, { headers: DONO }).then((r) => r.json());
    return doc.fields.senha.stringValue;
}

const entrar = (usuario, senha) => chamar(null, 'POST', '/auth/login', { usuario, senha });

async function comApiDireta(executar) {
    process.env.PROJETO_FIREBASE = process.env.PROJETO_FIREBASE || 'demo-expresso';
    const app = require('../../src/app');
    const servidor = await new Promise((pronto) => {
        const s = app.listen(0, '127.0.0.1', () => pronto(s));
    });
    try {
        await executar(`http://127.0.0.1:${servidor.address().port}/api`);
    } finally {
        servidor.close();
    }
}

async function errarVezes(usuario, vezes) {
    const respostas = [];
    for (let i = 0; i < vezes; i++) respostas.push((await entrar(usuario, 'senha-errada')).status);
    return respostas;
}

module.exports = {
    nome: 'Otimização e segurança da infraestrutura',
    descricao: 'Senhas guardadas só como hash, limite de tentativas de login, cabeçalhos de segurança, cache dos arquivos e atualização automática pausada com a aba escondida.',
    usaNavegador: true,

    async executar(t) {
        // ---- Senhas
        const ti = await criarPrimeiroTI();
        const convertida = await senhaNoBanco(1);
        t.conferir(convertida.startsWith('scrypt$') && !convertida.includes(SENHA),
            'senha antiga em texto: virou hash no primeiro login, e a pessoa nem percebe');
        t.conferir((await entrar('tina', SENHA)).status === 200, 'depois de convertida, a mesma senha continua entrando');

        const maria = await criarUsuario(ti, 'Maria Souza', 'maria', 'PCP', 'usuario');
        const idMaria = maria.id;
        const guardada = await senhaNoBanco(idMaria);
        t.conferir(guardada.startsWith('scrypt$') && !guardada.includes(SENHA), 'usuário novo: a senha já é gravada só como hash');
        const senhaDeOutro = await senhaNoBanco(1);
        t.conferir(guardada.split('$')[4] !== senhaDeOutro.split('$')[4], 'cada senha tem o próprio sal: senhas iguais geram hashes diferentes');

        const lista = (await chamar(ti, 'GET', '/usuarios')).dados;
        t.conferir(lista.every((u) => u.senha === undefined), 'a API nunca devolve a senha nem o hash');

        const tokenMaria = await token('maria');
        t.conferir((await chamar(tokenMaria, 'PUT', '/perfil/senha', { senha_atual: 'errada', nova_senha: 'outra-senha' })).status === 400,
            'Meu perfil: senha atual errada é recusada');
        t.conferir((await chamar(tokenMaria, 'PUT', '/perfil/senha', { senha_atual: SENHA, nova_senha: 'outra-senha' })).status === 200 &&
            (await senhaNoBanco(idMaria)).startsWith('scrypt$') && (await entrar('maria', 'outra-senha')).status === 200 && (await entrar('maria', SENHA)).status === 401,
        'Meu perfil: a nova senha é gravada como hash e entra; a antiga não');
        t.conferir((await chamar(ti, 'PUT', `/usuarios/${idMaria}`, { senha: SENHA })).status === 200 && (await senhaNoBanco(idMaria)).startsWith('scrypt$') &&
            (await entrar('maria', SENHA)).status === 200, 'TI troca a senha de alguém: também vira hash');

        t.conferir((await entrar(123, SENHA)).status === 400 && (await entrar('maria', { texto: SENHA })).status === 400, 'login com usuário ou senha que não são texto: 400, sem erro interno');

        // ---- Limite de tentativas
        let status = await errarVezes('maria', 5);
        t.conferir(status.every((s) => s === 401), `5 senhas erradas seguidas: ${status.join(', ')}`);
        const bloqueado = await entrar('maria', SENHA);
        t.conferir(bloqueado.status === 429 && /minuto/.test(bloqueado.dados.erro), `a 6ª tentativa é bloqueada mesmo com a senha certa (429: "${bloqueado.dados.erro}")`);
        t.conferir((await entrar('maria@teste.com', SENHA)).status === 429, 'trocar o login pelo e-mail da mesma conta não escapa do bloqueio');

        await gravarNoBanco(`tentativas_login/usuario_${idMaria}`, { expira_em: new Date(Date.now() - 1000) }, true);
        t.conferir((await entrar('maria', SENHA)).status === 200, 'passados os 15 minutos, volta a entrar');

        await errarVezes('maria', 4);
        t.conferir((await entrar('maria', SENHA)).status === 200, '4 erros e um acerto: entra e a contagem recomeça');
        status = await errarVezes('maria', 4);
        t.conferir(status.every((s) => s === 401), 'a contagem recomeçou: mais 4 erros ainda não bloqueiam');
        await entrar('maria', SENHA);

        await errarVezes('maria', 5);
        t.conferir((await chamar(ti, 'PUT', `/usuarios/${idMaria}`, { senha: SENHA })).status === 200 && (await entrar('maria', SENHA)).status === 200,
            'o TI trocar a senha libera o bloqueio');

        status = await errarVezes('ninguem.cadastrado', 6);
        t.conferir(status.slice(0, 5).every((s) => s === 401) && status[5] === 429,
            `login sem cadastro responde igual (${status.join(', ')}): não dá para descobrir quem existe`);

        const simultaneas = await Promise.all(Array.from({ length: 12 }, () => entrar('tentativa.simultanea', 'senha-errada')));
        const passaram = simultaneas.filter((r) => r.status === 401).length;
        t.conferir(passaram <= 5, `12 tentativas ao mesmo tempo: só ${passaram} chegaram a conferir a senha`);

        // ---- Rotina diária
        await gravarNoBanco(`usuarios/${idMaria}`, { senha: 'senha-importada' }, true);
        const rotina = (await chamar(ti, 'POST', '/manutencao/rotina-diaria')).dados;
        t.conferir(rotina.senhas_protegidas === 1 && (await senhaNoBanco(idMaria)).startsWith('scrypt$') && (await entrar('maria', 'senha-importada')).status === 200,
            'rotina diária: protege a senha que ainda estava em texto, e ela continua entrando');
        t.conferir(rotina.tentativas_vencidas >= 0 && (await consultarNoBanco('tentativas_login', 'tentativas', 5)).length >= 1, 'rotina diária: mantém os bloqueios ainda em vigor');
        await gravarNoBanco(`tentativas_login/velha`, { tentativas: 1, expira_em: new Date(Date.now() - 1000) });
        const rotina2 = (await chamar(ti, 'POST', '/manutencao/rotina-diaria')).dados;
        t.conferir(rotina2.tentativas_vencidas >= 1 && rotina2.senhas_protegidas === 0, 'rotina diária: apaga as tentativas vencidas e não refaz o hash de quem já tem');

        // ---- Cabeçalhos da API, no Express de verdade: o emulador de Functions acrescenta os próprios
        await comApiDireta(async (api) => {
            const estranha = await fetch(`${api}/health`, { headers: { Origin: 'https://site-de-outra-pessoa.example' } });
            t.conferir(estranha.status === 200 && !estranha.headers.get('access-control-allow-origin'), 'CORS: outro site não recebe permissão para ler a resposta');
            const propria = await fetch(`${api}/health`, { headers: { Origin: 'https://pi-expresso.web.app' } });
            t.conferir(propria.headers.get('access-control-allow-origin') === 'https://pi-expresso.web.app', 'CORS: o endereço do Expresso continua autorizado');
            const local = await fetch(`${api}/health`, { headers: { Origin: 'http://localhost:5173' } });
            t.conferir(local.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS: o site rodando na máquina de desenvolvimento continua autorizado');
            t.conferir((await fetch(`${api}/health`)).status === 200, 'chamadas sem navegador (Postman, Insomnia) continuam funcionando');
            t.conferir(!estranha.headers.get('x-powered-by') && estranha.headers.get('x-content-type-options') === 'nosniff', 'a API não anuncia que usa Express e envia "nosniff"');
        });

        // ---- Regras do site no firebase.json (na nuvem, o npm run medir:nuvem confere as respostas reais)
        const [regraGeral, regraArquivos, regraApi] = cabecalhosDoSite();
        const valor = (regra, nome) => (regra.headers.find((h) => h.key === nome) || {}).value || '';
        const politica = valor(regraGeral, 'Content-Security-Policy');
        t.conferir(politica.includes("script-src 'self'") && !politica.includes('unsafe') && politica.includes("frame-ancestors 'none'"),
            'firebase.json: a Content-Security-Policy só aceita scripts do próprio site, nada de "unsafe", e proíbe abrir o site dentro de outra página');
        t.conferir(valor(regraGeral, 'X-Frame-Options') === 'DENY' && valor(regraGeral, 'X-Content-Type-Options') === 'nosniff' &&
            Boolean(valor(regraGeral, 'Referrer-Policy')) && Boolean(valor(regraGeral, 'Permissions-Policy')), 'firebase.json: X-Frame-Options, nosniff, Referrer-Policy e Permissions-Policy');
        t.conferir(valor(regraGeral, 'Cache-Control').includes('max-age=0') && valor(regraGeral, 'Cache-Control').includes('s-maxage') &&
            regraArquivos.source === '/assets/**' && valor(regraArquivos, 'Cache-Control').includes('immutable'),
        'firebase.json: o navegador sempre confere o HTML, o CDN guarda até o próximo deploy e os arquivos com hash no nome ficam em cache por 1 ano');
        t.conferir(regraApi.source === '/api/**' && valor(regraApi, 'Cache-Control') === 'private', 'firebase.json: as respostas da API nunca ficam em cache compartilhado');
        const html = await fetch(`${SITE}/login`).then((r) => r.text());
        t.conferir(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), 'o HTML não tem script embutido (a política bloquearia)');

        // ---- Telas
        await gravarNoBanco('usuarios/1', { tema: 'escuro' }, true);
        const pagina = await entrarNoSite(t.navegador, 'tina');
        await pagina.getByRole('heading').first().waitFor();
        await pagina.reload();
        const temaAplicado = await pagina.waitForFunction(() => document.documentElement.dataset.tema === 'escuro', null, { timeout: 5000 })
            .then(() => true, () => false);
        t.conferir(temaAplicado, 'tela: o tema salvo continua sendo aplicado ao abrir a página, agora por um arquivo próprio');

        let chamadas = 0;
        pagina.on('request', (requisicao) => {
            if (requisicao.method() === 'GET' && /\/api\/tarefas(\?|$)/.test(requisicao.url())) chamadas += 1;
        });
        const mudarAba = (escondida) => pagina.evaluate((valor) => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => valor });
            document.dispatchEvent(new Event('visibilitychange'));
        }, escondida);

        await mudarAba(true);
        await esperar(16000);
        t.conferir(chamadas === 0, `aba escondida por 16 s: ${chamadas} chamadas à lista de atividades`);
        await mudarAba(false);
        await esperar(1000);
        t.conferir(chamadas === 1, 'ao voltar para a aba, a lista atualiza na hora');
        await esperar(15500);
        t.conferir(chamadas === 2, 'com a aba visível, continua atualizando a cada 15 s');

        const tarefa = (await chamar(ti, 'POST', '/tarefas', { titulo: 'Anexo sob a política' })).dados;
        await pagina.goto(`${SITE}/atividades/${tarefa.id}`);
        await pagina.locator('input[type=file]').setInputFiles(path.join(ASSETS, 'logo.png'));
        const anexoEnviado = await pagina.getByRole('link', { name: /logo\.png/ }).waitFor({ timeout: 20000 }).then(() => true, () => false);
        t.conferir(anexoEnviado, 'tela: o anexo vai direto do navegador para o Storage com a política ativa');

        t.conferir(violacoesDaPolitica.length === 0,
            violacoesDaPolitica.length ? `a política bloqueou algo: ${violacoesDaPolitica[0]}` : 'em todos os testes de tela, com envio de foto e de anexo, a política de segurança não bloqueou nada');

        const scriptInjetadoRodou = await pagina.evaluate(() => {
            const script = document.createElement('script');
            script.textContent = 'window.__injetado = true';
            document.head.appendChild(script);
            return Boolean(window.__injetado);
        });
        t.conferir(!scriptInjetadoRodou, 'tela: um script embutido na página é bloqueado pela política');
        await pagina.context().close();
    },
};

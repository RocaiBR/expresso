const YAML = require('yaml');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const {
    fs, path, FIRESTORE, DONO, chamar, token, esperar, criarPrimeiroTI, consultarNoBanco, chamadasDoSite,
} = require('../apoio');
const { amostrasValidas } = require('../amostras');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const CONTRATO = path.join(RAIZ, 'docs', 'openapi.yaml');
const METODOS = ['get', 'post', 'put', 'delete', 'patch'];

// ---- O contrato: cada operação vira uma expressão regular para reconhecer o caminho chamado
function carregarContrato() {
    const spec = YAML.parse(fs.readFileSync(CONTRATO, 'utf8'));
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    ajv.addSchema(spec, 'contrato');
    const operacoes = [];
    for (const [modelo, item] of Object.entries(spec.paths)) {
        for (const metodo of METODOS.filter((m) => item[m])) {
            operacoes.push({
                chave: `${metodo.toUpperCase()} ${modelo}`,
                metodo: metodo.toUpperCase(),
                modelo,
                variaveis: (modelo.match(/\{/g) || []).length,
                regex: new RegExp(`^${modelo.replace(/\{[^}]+\}/g, '[^/]+')}$`),
                op: item[metodo],
                ponteiro: ['paths', modelo, metodo],
            });
        }
    }
    return { spec, ajv, operacoes };
}

const segmento = (s) => encodeURIComponent(String(s).replace(/~/g, '~0').replace(/\//g, '~1'));
const ponteiroUri = (partes) => `contrato#/${partes.map(segmento).join('/')}`;

function acharOperacao(contrato, metodo, caminho) {
    return contrato.operacoes
        .filter((o) => o.metodo === metodo && o.regex.test(caminho.split('?')[0]))
        .sort((a, b) => a.variaveis - b.variaveis)[0];
}

// Confere status e corpo de uma resposta contra o que o contrato documenta para aquela operação
function conferirResposta(contrato, metodo, caminho, status, corpo) {
    const operacao = acharOperacao(contrato, metodo, caminho);
    if (!operacao) return { chave: `${metodo} ${caminho}`, problema: 'operação fora do contrato' };
    let resposta = operacao.op.responses[String(status)];
    let partes = [...operacao.ponteiro, 'responses', String(status)];
    if (!resposta) return { chave: operacao.chave, problema: `status ${status} não documentado` };
    if (resposta.$ref) {
        partes = resposta.$ref.slice(2).split('/');
        resposta = partes.reduce((no, parte) => no[parte], contrato.spec);
    }
    const validar = contrato.ajv.getSchema(ponteiroUri([...partes, 'content', 'application/json', 'schema']));
    if (!validar(corpo)) {
        return { chave: operacao.chave, problema: `${status}: ${contrato.ajv.errorsText(validar.errors, { dataVar: 'resposta' })}` };
    }
    return { chave: operacao.chave, problema: null };
}

// ---- As rotas que o código registra no Express (app.js + routes/*.js), escritas como no contrato
function rotasDoCodigo() {
    const pasta = path.join(RAIZ, 'backend', 'src');
    const app = fs.readFileSync(path.join(pasta, 'app.js'), 'utf8');
    const arquivoDe = Object.fromEntries([...app.matchAll(/const (\w+) = require\('\.\/routes\/(\w+)'\)/g)].map((m) => [m[1], m[2]]));
    const rotas = [...app.matchAll(/rotas\.(get|post|put|delete|patch)\('([^']*)'/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`);
    for (const [, base, variavel] of app.matchAll(/rotas\.use\('([^']+)',(?: autenticar,)? (\w+)\)/g)) {
        const codigo = fs.readFileSync(path.join(pasta, 'routes', `${arquivoDe[variavel]}.js`), 'utf8');
        for (const [, metodo, sub] of codigo.matchAll(/router\.(get|post|put|delete|patch)\('([^']*)'/g)) {
            const completo = (base + (sub === '/' ? '' : sub)).replace(/:(\w+)/g, '{$1}');
            rotas.push(`${metodo.toUpperCase()} ${completo}`);
        }
    }
    return rotas;
}

async function guardarFeriadosDe2026() {
    const feriado = (date, name) => ({ mapValue: { fields: { date: { stringValue: date }, name: { stringValue: name }, type: { stringValue: 'national' } } } });
    await fetch(`${FIRESTORE}/feriados/2026`, {
        method: 'PATCH', headers: DONO,
        body: JSON.stringify({ fields: {
            ano: { integerValue: '2026' }, fonte: { stringValue: 'BrasilAPI' }, atualizado_em: { timestampValue: new Date().toISOString() },
            feriados: { arrayValue: { values: [feriado('2026-01-01', 'Confraternização mundial'), feriado('2026-04-21', 'Tiradentes')] } },
        } }),
    });
}

module.exports = {
    nome: 'Contrato da API (OpenAPI)',
    descricao: 'O arquivo docs/openapi.yaml descreve todas as rotas que o código registra, cada operação é chamada e a resposta real é conferida contra o contrato, e todas as chamadas que o site fez nos testes de tela estão documentadas.',

    async executar(t) {
        const contrato = carregarContrato();

        // ---- Código e contrato descrevem as mesmas rotas
        const doCodigo = new Set(rotasDoCodigo());
        const doContrato = new Set(contrato.operacoes.map((o) => o.chave));
        const semDocumentacao = [...doCodigo].filter((r) => !doContrato.has(r));
        const inexistentes = [...doContrato].filter((r) => !doCodigo.has(r));
        t.conferir(doCodigo.size > 30 && semDocumentacao.length === 0,
            `todas as ${doCodigo.size} rotas registradas no Express estão no contrato${semDocumentacao.length ? `; faltam: ${semDocumentacao.join(', ')}` : ''}`);
        t.conferir(inexistentes.length === 0, `o contrato não documenta rota que não existe${inexistentes.length ? `: ${inexistentes.join(', ')}` : ''}`);
        const semLogin = contrato.operacoes.filter((o) => !(o.op.security && o.op.security.length === 0) && !o.op.responses['401']);
        t.conferir(semLogin.length === 0, `toda operação que exige login documenta a resposta 401${semLogin.length ? `; faltam: ${semLogin.map((o) => o.chave).join(', ')}` : ''}`);

        // ---- Controle: o validador reprova o que deve reprovar
        const usuarioComSenha = conferirResposta(contrato, 'GET', '/usuarios/1', 200,
            { id: 1, nome: 'Tina', email: 'tina@teste.com', funcao: 'ti', ativo: true, senha: 'scrypt$16384$8$5$x$y' });
        const anexoComToken = conferirResposta(contrato, 'GET', '/tarefas/1/anexos', 200,
            [{ id: 'a', nome: 'x.pdf', tipo: 'application/pdf', tamanho: 10, status: 'pronto', token: 'segredo' }]);
        const tarefaSemPermissoes = conferirResposta(contrato, 'GET', '/tarefas/1', 200, { id: 1, titulo: 'X', status: 'pendente', prioridade: 'medio' });
        t.conferir(usuarioComSenha.problema && anexoComToken.problema && tarefaSemPermissoes.problema,
            'controle: um usuário com "senha", um anexo com "token" e uma atividade sem "permissoes" seriam apontados como fora do contrato');

        // ---- Percorre a API inteira e confere cada resposta
        const resultados = new Map(contrato.operacoes.map((o) => [o.chave, { status: new Set(), problemas: [] }]));
        const foraDoContrato = [];
        async function api(tok, metodo, caminho, corpo) {
            const resposta = await chamar(tok, metodo, caminho, corpo);
            const { chave, problema } = conferirResposta(contrato, metodo, caminho, resposta.status, resposta.dados);
            if (!resultados.has(chave)) foraDoContrato.push(`${chave} → ${resposta.status}`);
            else {
                resultados.get(chave).status.add(resposta.status);
                if (problema) resultados.get(chave).problemas.push(problema);
            }
            return resposta;
        }

        await api(null, 'GET', '/');
        await api(null, 'GET', '/health');
        await criarPrimeiroTI();
        const ti = (await api(null, 'POST', '/auth/login', { usuario: 'tina', senha: 'senha123' })).dados.token;
        await api(null, 'POST', '/auth/login', { usuario: 'tina', senha: 'errada' });
        await api(null, 'POST', '/auth/login', {});
        await api(null, 'GET', '/tarefas');

        // Usuários
        const gil = (await api(ti, 'POST', '/usuarios', { nome: 'Gil Gestor', usuario: 'gil', email: 'gil@teste.com', senha: 'senha123', setor: 'PCP', funcao: 'gestor' })).dados;
        const ulisses = (await api(ti, 'POST', '/usuarios', { nome: 'Ulisses Padrão', usuario: 'ulisses', email: 'ulisses@teste.com', senha: 'senha123', setor: 'PCP', funcao: 'usuario' })).dados;
        await api(ti, 'POST', '/usuarios', { nome: 'Repetido', email: 'gil@teste.com', senha: 'senha123' });
        await api(ti, 'POST', '/usuarios', { nome: 'Sem arroba', email: 'invalido', senha: 'senha123' });
        await api(ti, 'GET', '/usuarios');
        await api(ti, 'GET', `/usuarios/${gil.id}`);
        await api(ti, 'GET', '/usuarios/9999');
        await api(ti, 'PUT', `/usuarios/${gil.id}`, { nome: 'Gil Gestor Silva' });
        await api(ti, 'PUT', `/usuarios/${gil.id}`, {});
        await api(ti, 'GET', '/usuarios/atribuiveis');
        await api(ti, 'GET', '/usuarios/participantes');
        const tokUlisses = await token('ulisses');
        await api(tokUlisses, 'GET', '/usuarios');
        await api(tokUlisses, 'GET', `/usuarios/${gil.id}`);

        // Atividades
        const ontem = new Date(Date.now() - 86400000 - 3 * 3600000).toISOString().slice(0, 10);
        const tarefa = (await api(ti, 'POST', '/tarefas', {
            titulo: 'Conferir o contrato', descricao: 'Atividade criada pelo teste do contrato', usuario_id: ulisses.id,
            participantes_ids: [gil.id], prioridade: 'alto', data_conclusao: ontem,
        })).dados;
        await api(ti, 'POST', '/tarefas', { titulo: '' });
        await api(ti, 'GET', '/tarefas');
        await api(ti, 'GET', '/tarefas?status=pendente');
        await api(ti, 'GET', `/tarefas/${tarefa.id}`);
        await api(ti, 'GET', '/tarefas/9999');
        await api(ti, 'PUT', `/tarefas/${tarefa.id}`, { status: 'em andamento' });
        await api(ti, 'PUT', `/tarefas/${tarefa.id}`, {});
        await api(tokUlisses, 'PUT', `/tarefas/${tarefa.id}`, { titulo: 'Tentando mudar o título' });
        await api(ti, 'POST', '/tarefas/verificar-prazos');
        await api(tokUlisses, 'POST', '/tarefas/verificar-prazos');
        await api(tokUlisses, 'DELETE', `/tarefas/${tarefa.id}`);

        // Anexos: o arquivo vai direto ao Storage (emulador), como o site faz
        const [nomeArquivo, conteudo] = amostrasValidas().find(([nome]) => nome === 'logo.png');
        const inicio = await api(ti, 'POST', `/tarefas/${tarefa.id}/anexos`, { nome: nomeArquivo, tamanho: conteudo.length });
        await fetch(inicio.dados.url_envio, { method: 'PUT', headers: { 'Content-Type': inicio.dados.anexo.tipo }, body: conteudo });
        await api(ti, 'POST', `/tarefas/${tarefa.id}/anexos/${inicio.dados.anexo.id}/concluir`);
        await api(ti, 'POST', `/tarefas/${tarefa.id}/anexos`, { nome: 'programa.exe', tamanho: 100 });
        const semArquivo = await api(ti, 'POST', `/tarefas/${tarefa.id}/anexos`, { nome: 'nunca-enviado.pdf', tamanho: 100 });
        await api(ti, 'POST', `/tarefas/${tarefa.id}/anexos/${semArquivo.dados.anexo.id}/concluir`);
        await api(ti, 'GET', `/tarefas/${tarefa.id}/anexos`);
        await api(ti, 'GET', '/tarefas/9999/anexos');
        await api(ti, 'DELETE', `/tarefas/${tarefa.id}/anexos/${inicio.dados.anexo.id}`);
        await api(ti, 'DELETE', `/tarefas/${tarefa.id}/anexos/inexistente`);

        // Notificações do responsável
        const avisos = (await api(tokUlisses, 'GET', '/notificacoes')).dados;
        await api(tokUlisses, 'GET', '/notificacoes/contagem');
        await api(tokUlisses, 'POST', `/notificacoes/${avisos[0].id}/lida`);
        await api(tokUlisses, 'POST', '/notificacoes/nao-existe/lida');
        await api(tokUlisses, 'POST', '/notificacoes/lidas');

        // Perfil
        const [, jpeg] = amostrasValidas().find(([nome]) => nome === 'foto.jpg');
        await api(tokUlisses, 'GET', '/perfil');
        await api(tokUlisses, 'PUT', '/perfil/foto', { imagem: `data:image/jpeg;base64,${jpeg.toString('base64')}` });
        await api(tokUlisses, 'PUT', '/perfil/foto', { imagem: 'data:image/png;base64,AAAA' });
        await api(tokUlisses, 'DELETE', '/perfil/foto');
        await api(tokUlisses, 'PUT', '/perfil/tema', { tema: 'escuro' });
        await api(tokUlisses, 'PUT', '/perfil/tema', { tema: 'roxo' });
        await api(tokUlisses, 'PUT', '/perfil/senha', { senha_atual: 'errada', nova_senha: 'nova-senha' });
        await api(tokUlisses, 'PUT', '/perfil/senha', { senha_atual: 'senha123', nova_senha: 'nova-senha' });

        // Feriados (cópia guardada, para não depender da internet) e manutenção
        await guardarFeriadosDe2026();
        await api(ti, 'GET', '/feriados/2026');
        await api(ti, 'GET', '/feriados/abc');
        await api(ti, 'GET', '/manutencao/consistencia');
        await api(ti, 'POST', '/manutencao/rotina-diaria');
        await api(tokUlisses, 'GET', '/manutencao/consistencia');
        await api(tokUlisses, 'POST', '/manutencao/rotina-diaria');

        // Recuperação de senha (o e-mail fica na "caixa" local dos emuladores)
        await api(null, 'POST', '/auth/recuperar-senha', { email: 'gil@teste.com' });
        await api(null, 'POST', '/auth/recuperar-senha', {});
        let codigo = null;
        for (let i = 0; i < 40 && !codigo; i++) {
            const emails = await consultarNoBanco('emails_locais', 'para', 'gil@teste.com');
            codigo = emails.map((d) => (d.fields.texto.stringValue.match(/Expresso é: (\d{6})/) || [])[1]).find(Boolean);
            if (!codigo) await esperar(250);
        }
        await api(null, 'POST', '/auth/redefinir-senha', { email: 'gil@teste.com', codigo: codigo === '000000' ? '111111' : '000000', nova_senha: 'outra-senha' });
        await api(null, 'POST', '/auth/redefinir-senha', { email: 'gil@teste.com', codigo, nova_senha: 'outra-senha' });

        // Exclusões e saída
        await api(ti, 'DELETE', `/tarefas/${tarefa.id}`);
        await api(ti, 'DELETE', '/tarefas/9999');
        await api(ti, 'DELETE', '/usuarios/1');
        await api(ti, 'DELETE', `/usuarios/${gil.id}`);
        await api(ti, 'POST', '/auth/sair');
        await api(ti, 'POST', '/auth/sair');

        // ---- Resultado por operação
        const linhas = [];
        for (const [chave, r] of resultados) {
            const status = [...r.status].sort().join(', ');
            const sucesso = [...r.status].some((s) => s >= 200 && s < 300);
            t.conferir(sucesso && r.problemas.length === 0,
                `${chave}: ${status || 'não chamada'}${r.problemas.length ? ` — fora do contrato: ${r.problemas[0]}` : ''}`);
            linhas.push(`${chave}: ${status}`);
        }
        t.conferir(foraDoContrato.length === 0, `nenhuma chamada caiu fora do contrato${foraDoContrato.length ? `: ${foraDoContrato.join(', ')}` : ''}`);
        const respostas = [...resultados.values()].reduce((soma, r) => soma + r.status.size, 0);
        t.anexar('Cobertura do contrato (operação: status conferidos)', linhas);

        // ---- O que o site realmente chamou nos testes de tela
        const usadas = new Set();
        const desconhecidas = new Set();
        for (const { metodo, caminho } of chamadasDoSite) {
            const operacao = acharOperacao(contrato, metodo, caminho);
            if (operacao) usadas.add(operacao.chave);
            else desconhecidas.add(`${metodo} ${caminho}`);
        }
        if (t.navegador) {
            t.conferir(chamadasDoSite.length > 0 && desconhecidas.size === 0,
                `site: as ${chamadasDoSite.length} chamadas feitas nos testes de tela usam ${usadas.size} operações, todas documentadas${desconhecidas.size ? `; fora do contrato: ${[...desconhecidas].join(', ')}` : ''}`);
            t.anexar('Operações que o site usou nos testes de tela', [...usadas].sort());
        }
        t.conferir(respostas >= contrato.operacoes.length,
            `${contrato.operacoes.length} operações chamadas, ${respostas} combinações de operação e status conferidas contra o contrato`);
    },
};

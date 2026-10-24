const { API, chamar, login, criarPrimeiroTI, diaEmSaoPaulo } = require('../apoio');

module.exports = {
    nome: 'Validação dos dados de entrada',
    descricao: 'A API recusa dado fora do formato com mensagem clara (400/409) e padroniza o que aceita: espaços, maiúsculas e campos vazios.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const recusa = (resposta, status, trecho, descricao) => t.conferir(
            resposta.status === status && String(resposta.dados && resposta.dados.erro).includes(trecho),
            `${descricao} → ${resposta.status} "${resposta.dados && resposta.dados.erro}"`);

        // ---------- Usuários
        const usuario = (campos) => chamar(ti, 'POST', '/usuarios', {
            nome: 'Pessoa Teste', usuario: 'pessoa', email: 'pessoa@teste.com', senha: 'senha123', setor: 'PCP', funcao: 'usuario', ...campos,
        });
        recusa(await usuario({ email: undefined }), 400, 'obrigatórios', 'usuário sem e-mail');
        recusa(await usuario({ email: 'pessoa.teste.com' }), 400, 'e-mail válido', 'e-mail sem @');
        recusa(await usuario({ email: 'pes soa@teste.com' }), 400, 'e-mail válido', 'e-mail com espaço');
        recusa(await usuario({ senha: '123' }), 400, 'pelo menos 6', 'senha com 3 caracteres');
        recusa(await usuario({ usuario: 'joão silva' }), 400, 'sem espaços', 'login com espaço e acento');
        recusa(await usuario({ nome: '   ' }), 400, 'não pode ficar vazio', 'nome só com espaços');
        recusa(await usuario({ nome: 'A'.repeat(151) }), 400, 'até 150', 'nome com 151 caracteres');
        recusa(await usuario({ nome: 12345 }), 400, 'deve ser um texto', 'nome numérico');
        recusa(await usuario({ setor: 'RH' }), 400, 'Setor inválido', 'setor fora da lista (PCP, ENGENHARIA, TI)');
        recusa(await usuario({ funcao: 'admin' }), 400, 'Função inválida', 'função fora da lista (usuario, gestor, ti)');

        let r = await usuario({ nome: '  Maria Souza  ', usuario: ' maria ', email: '  Maria.Souza@Empresa.COM ', setor: '' });
        t.conferir(r.status === 201 && r.dados.email === 'maria.souza@empresa.com' && r.dados.nome === 'Maria Souza' &&
            r.dados.usuario === 'maria' && r.dados.setor === null,
        `cadastro padronizado: e-mail "${r.dados.email}", nome "${r.dados.nome}", login "${r.dados.usuario}", setor vazio → ${r.dados.setor}`);
        t.conferir(r.dados.senha === undefined, 'a senha nunca volta nas respostas da API');
        const maria = r.dados;
        recusa(await usuario({ usuario: 'outra', email: 'MARIA.SOUZA@empresa.com' }), 409, 'esse e-mail', 'e-mail repetido com outras maiúsculas');
        recusa(await usuario({ usuario: 'maria', email: 'outra@teste.com' }), 409, 'nome de usuário', 'login repetido');
        t.conferir((await login('MARIA.SOUZA@EMPRESA.COM')).token, 'login pelo e-mail funciona com qualquer combinação de maiúsculas');
        recusa(await chamar(ti, 'PUT', `/usuarios/${maria.id}`, { ativo: 'false' }), 400, 'true ou false', 'ativo como texto "false" (viraria verdadeiro)');
        r = await chamar(ti, 'PUT', `/usuarios/${maria.id}`, { email: ' M.Souza@Empresa.com ' });
        t.conferir(r.status === 200 && r.dados.usuario.email === 'm.souza@empresa.com', `e-mail padronizado também na alteração: "${r.dados.usuario.email}"`);
        recusa(await chamar(ti, 'PUT', `/usuarios/${maria.id}`, { senha: 'abc' }), 400, 'pelo menos 6', 'senha curta na alteração');

        // ---------- Atividades
        const hoje = diaEmSaoPaulo(0);
        const tarefa = (campos) => chamar(ti, 'POST', '/tarefas', { titulo: 'Atividade', ...campos });
        recusa(await chamar(ti, 'POST', '/tarefas', { descricao: 'sem título' }), 400, 'obrigatório', 'atividade sem título');
        recusa(await tarefa({ titulo: '    ' }), 400, 'obrigatório', 'título só com espaços');
        recusa(await tarefa({ titulo: 42 }), 400, 'obrigatório', 'título numérico (antes derrubava a API com erro 500)');
        recusa(await tarefa({ titulo: 'T'.repeat(151) }), 400, 'até 150', 'título com 151 caracteres');
        recusa(await tarefa({ descricao: 'D'.repeat(2001) }), 400, 'até 2000', 'descrição com 2001 caracteres');
        recusa(await tarefa({ descricao: { texto: 'objeto' } }), 400, 'deve ser um texto', 'descrição que não é texto');
        recusa(await tarefa({ status: 'feito' }), 400, 'Status inválido', 'status fora da lista');
        recusa(await tarefa({ prioridade: 'altíssima' }), 400, 'Prioridade inválida', 'prioridade fora da lista');
        recusa(await tarefa({ data_inicio: '2026-02-30' }), 400, 'data válida', 'data que não existe (30/02)');
        recusa(await tarefa({ data_conclusao: '20/10/2026' }), 400, 'AAAA-MM-DD', 'data no formato DD/MM/AAAA');
        recusa(await tarefa({ data_inicio: '2026-10-10', data_conclusao: '2026-10-01' }), 400, 'antes da data de início', 'vencimento antes do início');
        recusa(await tarefa({ usuario_id: 999 }), 403, 'não encontrado', 'responsável que não existe');
        recusa(await tarefa({ participantes_ids: [999] }), 400, 'não existe', 'participante que não existe');

        r = await tarefa({ titulo: '  Revisar planilha  ', descricao: '', data_inicio: '', data_conclusao: hoje, id: 999, criado_por: 77, atrasada: true });
        const criada = r.dados;
        t.conferir(r.status === 201 && criada.titulo === 'Revisar planilha' && criada.descricao === null && criada.data_inicio === null,
            `atividade padronizada: título sem espaços nas pontas, descrição e data vazias → null`);
        t.conferir(criada.status === 'pendente' && criada.prioridade === 'medio', 'sem status/prioridade: "pendente" e "medio"');
        t.conferir(criada.id === 1 && criada.criado_por === 1 && criada.atrasada !== true,
            'campos de controle enviados pelo cliente (id, criado_por, atrasada) são ignorados; a API define');
        t.conferir(criada.responsavel === 'Tina TI' && criada.usuario_id === 1, 'responsável preenchido pela API com o nome do usuário vinculado');

        await chamar(ti, 'PUT', `/tarefas/${criada.id}`, { data_inicio: '2026-10-01', data_conclusao: '2026-10-30' });
        recusa(await chamar(ti, 'PUT', `/tarefas/${criada.id}`, { data_conclusao: '2026-09-15' }), 400, 'antes da data de início',
            'alterar só o vencimento para antes do início já gravado');
        recusa(await chamar(ti, 'PUT', `/tarefas/${criada.id}`, { titulo: ' ' }), 400, 'não pode ficar vazio', 'apagar o título na alteração');
        recusa(await chamar(ti, 'PUT', `/tarefas/${criada.id}`, { id: 5, criado_em: 'ontem' }), 400, 'ao menos um campo', 'alteração só com campos que não podem ser mudados');

        // ---------- Requisição em si
        const bruto = (corpo) => fetch(API + '/tarefas', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ti}` }, body: corpo,
        }).then(async (resposta) => ({ status: resposta.status, dados: await resposta.json().catch(() => null) }));
        const quebrado = await bruto('{"titulo": "sem fechar');
        t.conferir(quebrado.status === 400 && (await chamar(ti, 'GET', '/tarefas')).dados.length === 1,
            `corpo com JSON quebrado → ${quebrado.status} (recusado antes de chegar às rotas; nada é gravado)`);
        recusa(await bruto(JSON.stringify({ titulo: 'x', descricao: 'x'.repeat(1.2 * 1024 * 1024) })), 413, 'limite de 1 MB', 'corpo com mais de 1 MB');
        t.conferir((await chamar(ti, 'GET', '/tarefas/abc')).status === 404, 'id que não é número na URL → 404');
        t.conferir((await chamar(ti, 'GET', '/rota-que-nao-existe')).status === 404, 'rota inexistente → 404 com JSON');
    },
};

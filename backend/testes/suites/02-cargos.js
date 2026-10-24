const { chamar, login, token, criarPrimeiroTI, criarUsuario } = require('../apoio');

module.exports = {
    nome: 'Cargos e permissões',
    descricao: 'Cada cargo só vê e altera o que a regra permite; a regra é conferida na API a cada requisição, não só na tela.',

    async executar(t) {
        const T = await criarPrimeiroTI();
        const primeiro = await login('tina');
        t.conferir(primeiro.usuario.funcao === 'ti', 'login devolve o token e a função do usuário ("ti")');

        for (const rota of ['/tarefas', '/usuarios', '/usuarios/atribuiveis', '/feriados/2026', '/notificacoes', '/perfil', '/manutencao/consistencia']) {
            t.conferir((await chamar(null, 'GET', rota)).status === 401, `GET ${rota} sem login → 401`);
        }
        t.conferir((await chamar('token-inventado', 'GET', '/tarefas')).status === 401, 'token inventado → 401');
        t.conferir((await chamar(null, 'GET', '/health')).status === 200, '/health continua público (monitoramento)');

        const gPCP = await criarUsuario(T, 'Gabi Gestora PCP', 'gabi', 'PCP', 'gestor');
        const gPCP2 = await criarUsuario(T, 'Gil Gestor PCP', 'gil', 'PCP', 'gestor');
        const u1 = await criarUsuario(T, 'Ulisses PCP', 'ulisses', 'PCP', 'usuario');
        const u2 = await criarUsuario(T, 'Ursula PCP', 'ursula', 'PCP', 'usuario');
        await criarUsuario(T, 'Eva Gestora ENG', 'eva', 'ENGENHARIA', 'gestor');
        const uENG = await criarUsuario(T, 'Enzo ENG', 'enzo', 'ENGENHARIA', 'usuario');
        const tok = {};
        for (const [chave, nome] of [['gPCP', 'gabi'], ['gPCP2', 'gil'], ['u1', 'ulisses'], ['u2', 'ursula'], ['gENG', 'eva'], ['uENG', 'enzo']]) {
            tok[chave] = await token(nome);
        }
        t.conferir((await chamar(T, 'GET', '/usuarios')).status === 200, 'TI lista os usuários');
        t.conferir((await chamar(tok.gPCP, 'GET', '/usuarios')).status === 403, 'gestor não lista usuários (403)');
        t.conferir((await chamar(tok.u1, 'POST', '/usuarios', { nome: 'X', email: 'x@x.com', senha: '123456' })).status === 403, 'usuário padrão não cria usuário (403)');
        t.conferir((await chamar(tok.u1, 'GET', `/usuarios/${u1.id}`)).status === 200, 'usuário vê os próprios dados');
        t.conferir((await chamar(tok.u1, 'GET', `/usuarios/${u2.id}`)).status === 403, 'usuário não vê os dados de outro (403)');
        t.conferir((await chamar(tok.gPCP, 'GET', '/manutencao/consistencia')).status === 403, 'só o TI roda a verificação de consistência (gestor: 403)');

        const nomes = async (tk) => (await chamar(tk, 'GET', '/usuarios/atribuiveis')).dados.map((p) => p.nome).sort().join(', ');
        const deU1 = await nomes(tok.u1);
        t.conferir(deU1 === 'Ulisses PCP', `usuário padrão só atribui a si mesmo (${deU1})`);
        const deGabi = await nomes(tok.gPCP);
        t.conferir(deGabi === 'Gabi Gestora PCP, Ulisses PCP, Ursula PCP', `gestora do PCP: ela e os usuários padrão do PCP (${deGabi})`);
        t.conferir((await chamar(T, 'GET', '/usuarios/atribuiveis')).dados.length === 7, 'TI: todos os 7 usuários');

        let r = await chamar(tok.u1, 'POST', '/tarefas', { titulo: 'Minha tarefa (U1)' });
        const tU1 = r.dados;
        t.conferir(r.status === 201 && tU1.usuario_id === u1.id && tU1.responsavel === 'Ulisses PCP', 'usuário cria para si (o responsável é preenchido pela API)');
        t.conferir((await chamar(tok.u1, 'POST', '/tarefas', { titulo: 'x', usuario_id: u2.id })).status === 403, 'usuário não atribui a outra pessoa (403)');
        r = await chamar(tok.gPCP, 'POST', '/tarefas', { titulo: 'Gestora → U1', usuario_id: u1.id });
        const tG1 = r.dados;
        t.conferir(r.status === 201 && tG1.usuario_id === u1.id, 'gestora atribui a usuário padrão do setor');
        t.conferir((await chamar(tok.gPCP, 'POST', '/tarefas', { titulo: 'x', usuario_id: uENG.id })).status === 403, 'gestora do PCP não atribui a alguém da ENGENHARIA (403)');
        t.conferir((await chamar(tok.gPCP, 'POST', '/tarefas', { titulo: 'x', usuario_id: gPCP2.id })).status === 403, 'gestora não atribui a outro gestor (403)');
        const tGil = (await chamar(tok.gPCP2, 'POST', '/tarefas', { titulo: 'Tarefa do Gil' })).dados;
        const tEng = (await chamar(tok.gENG, 'POST', '/tarefas', { titulo: 'Eva → Enzo', usuario_id: uENG.id })).dados;
        t.conferir((await chamar(T, 'POST', '/tarefas', { titulo: 'TI → Enzo', usuario_id: uENG.id })).status === 201, 'TI atribui a qualquer pessoa');

        const ids = async (tk) => (await chamar(tk, 'GET', '/tarefas')).dados.map((x) => x.id).sort((a, b) => a - b);
        const igual = (a, b) => JSON.stringify(a) === JSON.stringify([...b].sort((x, y) => x - y));
        t.conferir(igual(await ids(tok.u1), [tU1.id, tG1.id]), `usuário vê só as dele (#${(await ids(tok.u1)).join(', #')})`);
        t.conferir(igual(await ids(tok.u2), []), 'usuária sem atividades não vê nada');
        t.conferir(igual(await ids(tok.gPCP), [tU1.id, tG1.id, tGil.id]), `gestora vê as do setor PCP (#${(await ids(tok.gPCP)).join(', #')})`);
        const daEva = await ids(tok.gENG);
        t.conferir(!daEva.includes(tU1.id) && daEva.includes(tEng.id), 'gestora da ENGENHARIA não vê as do PCP');
        t.conferir((await ids(T)).length === 5, 'TI vê todas as 5');
        t.conferir((await chamar(tok.u2, 'GET', `/tarefas/${tU1.id}`)).status === 404, 'abrir a atividade de outra pessoa → 404 (como se não existisse)');

        const lista = (await chamar(tok.u1, 'GET', '/tarefas')).dados;
        t.conferir(JSON.stringify(lista.find((x) => x.id === tG1.id).permissoes) === JSON.stringify({ status: true, editar: false, excluir: false }),
            'a tela recebe as permissões prontas: {status: true, editar: false, excluir: false}');
        t.conferir((await chamar(tok.u1, 'PUT', `/tarefas/${tG1.id}`, { status: 'em andamento' })).status === 200, 'usuário muda o status');
        t.conferir((await chamar(tok.u1, 'PUT', `/tarefas/${tG1.id}`, { titulo: 'mudei' })).status === 403, 'usuário não muda o título (403)');
        t.conferir((await chamar(tok.u1, 'DELETE', `/tarefas/${tG1.id}`)).status === 403, 'usuário não exclui (403)');
        t.conferir((await chamar(tok.u1, 'POST', `/tarefas/${tG1.id}/anexos`, { nome: 'foto.png', tamanho: 10 })).status === 201, 'usuário pode anexar');

        t.conferir((await chamar(tok.u1, 'PUT', `/tarefas/${tU1.id}`, { titulo: 'Título novo' })).status === 200, 'usuário edita a que ele criou');
        t.conferir((await chamar(tok.u1, 'PUT', `/tarefas/${tU1.id}`, { usuario_id: u2.id })).status === 403, 'usuário não passa a própria atividade para outra pessoa (403)');

        t.conferir((await chamar(tok.gPCP, 'PUT', `/tarefas/${tU1.id}`, { prioridade: 'alto' })).status === 200, 'gestora edita atividade de usuário padrão do setor');
        r = await chamar(tok.gPCP, 'PUT', `/tarefas/${tG1.id}`, { usuario_id: u2.id });
        t.conferir(r.status === 200 && r.dados.tarefa.responsavel === 'Ursula PCP', 'gestora passa a atividade para outro usuário do setor');
        t.conferir((await chamar(tok.gPCP, 'PUT', `/tarefas/${tG1.id}`, { usuario_id: uENG.id })).status === 403, 'gestora não passa para outro setor (403)');
        t.conferir((await chamar(tok.gPCP, 'GET', `/tarefas/${tGil.id}`)).status === 200, 'gestora vê a atividade do outro gestor do setor...');
        t.conferir((await chamar(tok.gPCP, 'PUT', `/tarefas/${tGil.id}`, { status: 'concluido' })).status === 403, '...mas não altera (403)');
        t.conferir((await chamar(tok.gPCP, 'DELETE', `/tarefas/${tGil.id}`)).status === 403, '...nem exclui (403)');
        t.conferir((await chamar(tok.gENG, 'PUT', `/tarefas/${tU1.id}`, { status: 'concluido' })).status === 404, 'gestora de outro setor nem encontra a atividade (404)');
        t.conferir((await chamar(tok.gPCP, 'DELETE', `/tarefas/${tU1.id}`)).status === 200, 'gestora exclui atividade de usuário padrão do setor');

        t.conferir((await chamar(T, 'PUT', '/usuarios/1', { funcao: 'gestor' })).status === 409, 'o último TI não pode deixar de ser TI (409)');
        t.conferir((await chamar(T, 'PUT', '/usuarios/1', { ativo: false })).status === 409, 'o último TI não pode ser desativado (409)');
        t.conferir((await chamar(T, 'DELETE', '/usuarios/1')).status === 400, 'o TI não exclui a própria conta (400)');
        await chamar(T, 'PUT', `/usuarios/${u2.id}`, { senha: 'outraSenha1' });
        t.conferir((await chamar(tok.u2, 'GET', '/tarefas')).status === 401, 'senha trocada pelo TI derruba o login aberto (401)');
        await chamar(T, 'PUT', `/usuarios/${uENG.id}`, { ativo: false });
        t.conferir((await chamar(tok.uENG, 'GET', '/tarefas')).status === 401, 'usuário desativado perde o acesso na hora (401)');
        t.conferir((await login('enzo')).erro === 'Este usuário está inativo. Fale com o TI.', 'e não consegue entrar de novo');
        await chamar(T, 'PUT', `/usuarios/${u1.id}`, { funcao: 'gestor' });
        t.conferir((await chamar(tok.u1, 'GET', '/usuarios/atribuiveis')).dados.length > 1, 'mudança de cargo vale sem precisar entrar de novo');
        t.conferir((await chamar(tok.gPCP, 'POST', '/auth/sair')).status === 200, '"Sair" encerra a sessão...');
        t.conferir((await chamar(tok.gPCP, 'GET', '/tarefas')).status === 401, '...e o token deixa de valer (401)');
    },
};

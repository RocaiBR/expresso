const { chamar, token, criarPrimeiroTI, criarUsuario, entrarNoSite, SITE } = require('../apoio');

module.exports = {
    nome: 'Participantes vinculados a usuários',
    descricao: 'Participantes são escolhidos da lista de usuários ativos; a API guarda os ids e monta os nomes, e recusa quem não existe.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const gabi = await criarUsuario(ti, 'Gabi Gestora', 'gabi', 'PCP', 'gestor');
        const ulisses = await criarUsuario(ti, 'Ulisses Padrão', 'ulisses', 'PCP', 'usuario');
        const eva = await criarUsuario(ti, 'Eva Engenharia', 'eva', 'ENGENHARIA', 'usuario');
        const ines = await criarUsuario(ti, 'Inês Inativa', 'ines', 'PCP', 'usuario');
        await chamar(ti, 'PUT', `/usuarios/${ines.id}`, { ativo: false });
        const [tg, tu] = [await token('gabi'), await token('ulisses')];

        const lista = (await chamar(tu, 'GET', '/usuarios/participantes')).dados;
        t.conferir(lista.map((p) => p.nome).join(', ') === 'Eva Engenharia, Gabi Gestora, Tina TI, Ulisses Padrão',
            'a lista para escolher traz os ativos de todos os setores, em ordem alfabética (a inativa não aparece)');
        t.conferir(lista.every((p) => Object.keys(p).sort().join() === 'id,nome,setor'), 'a lista traz só id, nome e setor (sem e-mail)');
        let r = await chamar(tg, 'POST', '/tarefas', { titulo: 'Com participantes', usuario_id: ulisses.id, participantes_ids: [eva.id, gabi.id, eva.id] });
        const tarefa = r.dados;
        t.conferir(r.status === 201 && tarefa.participantes === 'Eva Engenharia, Gabi Gestora' && tarefa.participantes_ids.join() === `${eva.id},${gabi.id}`,
            `a API grava os ids (sem repetição) e monta os nomes: "${tarefa.participantes}"`);
        t.conferir((await chamar(tg, 'POST', '/tarefas', { titulo: 'x', participantes_ids: [999] })).status === 400, 'id que não existe: recusado (400)');
        t.conferir((await chamar(tg, 'POST', '/tarefas', { titulo: 'x', participantes_ids: [ines.id] })).status === 400, 'usuário inativo: recusado (400)');
        t.conferir((await chamar(tg, 'POST', '/tarefas', { titulo: 'x', participantes_ids: 'Maria, João' })).status === 400, 'texto livre no lugar da lista: recusado (400)');
        t.conferir((await chamar(tg, 'POST', '/tarefas', { titulo: 'x', participantes_ids: Array.from({ length: 21 }, (_, i) => i + 1) })).status === 400,
            'mais de 20 participantes: recusado (400)');
        r = await chamar(tg, 'POST', '/tarefas', { titulo: 'Campo antigo', participantes: 'Fulano Inventado' });
        t.conferir(r.status === 201 && r.dados.participantes === null, 'o campo antigo de texto livre ("participantes") é ignorado');
        r = await chamar(tg, 'PUT', `/tarefas/${tarefa.id}`, { participantes_ids: [eva.id] });
        t.conferir(r.status === 200 && r.dados.tarefa.participantes === 'Eva Engenharia', 'a gestora troca os participantes e o nome é refeito');
        t.conferir((await chamar(tu, 'PUT', `/tarefas/${tarefa.id}`, { participantes_ids: [] })).status === 403,
            'o usuário padrão não muda os participantes da atividade que a gestora atribuiu (403)');

        if (!t.navegador) return;
        const pagina = await entrarNoSite(t.navegador, 'ulisses');
        await pagina.goto(SITE + '/atividades/nova');
        await pagina.fill('#titulo', 'Atividade com participantes');
        await pagina.fill('#descricao', 'Teste do seletor.');
        await pagina.locator('#participantes').click();
        const opcoes = pagina.locator('label', { has: pagina.locator('input[type=checkbox]') });
        await opcoes.first().waitFor();
        t.conferir(!(await opcoes.allTextContents()).some((x) => x.includes('Ulisses')), 'tela: o responsável (ele mesmo) não aparece entre os participantes');
        await pagina.locator('#participantes').fill('gabi');
        t.conferir(await opcoes.count() === 1, 'tela: a busca "gabi" filtra para 1 pessoa');
        await opcoes.first().locator('input').check();
        for (const nome of ['eva', 'tina']) {
            await pagina.locator('#participantes').fill(nome);
            await opcoes.first().locator('input').check();
        }
        await pagina.locator('#participantes').fill('');
        await pagina.getByRole('heading', { name: 'Atribuições' }).click();
        const etiquetas = pagina.locator('span.bg-realce');
        t.conferir((await etiquetas.allTextContents()).join(' | ') === 'Gabi Gestora | Eva Engenharia | Tina TI', 'tela: 3 etiquetas, na ordem escolhida');
        await t.print(pagina, 'participantes', 'Nova atividade: participantes escolhidos entre os usuários');
        await pagina.getByTitle('Tirar Tina TI').click();
        t.conferir(await etiquetas.count() === 2, 'tela: o X da etiqueta tira a pessoa');
        await pagina.getByRole('button', { name: 'Salvar Atividade' }).click();
        await pagina.waitForURL(`${SITE}/atividades/confirmacao`);
        const valores = await pagina.locator('input[readonly]').evaluateAll((campos) => campos.map((c) => c.value));
        t.conferir(valores.includes('Gabi Gestora, Eva Engenharia'), 'tela: a confirmação mostra "Gabi Gestora, Eva Engenharia"');
        const criada = (await chamar(tu, 'GET', '/tarefas')).dados.find((x) => x.titulo === 'Atividade com participantes');
        t.conferir(criada && criada.participantes_ids.join() === `${gabi.id},${eva.id}`, 'no banco ficam os ids das 2 pessoas');
    },
};

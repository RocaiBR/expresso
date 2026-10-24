const { chamar, login, token, esperar, criarPrimeiroTI, criarUsuario, entrarNoSite, SITE } = require('../apoio');

async function esperarResumo(dialogos, quantos) {
    for (let i = 0; i < 100 && dialogos.length < quantos; i++) await esperar(100);
    return dialogos[dialogos.length - 1] || '';
}

async function abrirLista(navegador, usuario) {
    const pagina = await entrarNoSite(navegador, usuario, undefined, { width: 1400, height: 900 });
    const dialogos = [];
    pagina.on('dialog', async (d) => { dialogos.push(d.message()); await d.accept(); });
    await pagina.goto(SITE + '/atividades');
    await pagina.getByText('Atribuída A1').waitFor();
    return { pagina, dialogos };
}

module.exports = {
    nome: 'Seleção múltipla e exclusão de usuários',
    descricao: 'Ações em lote respeitam a permissão de cada atividade (as outras são ignoradas e contadas); excluir usuário preserva o histórico.',
    usaNavegador: true,

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const gabi = await criarUsuario(ti, 'Gabi Gestora', 'gabi', 'PCP', 'gestor');
        const ulisses = await criarUsuario(ti, 'Ulisses Padrão', 'ulisses', 'PCP', 'usuario');
        const ursula = await criarUsuario(ti, 'Ursula Padrão', 'ursula', 'PCP', 'usuario');
        const [tg, tu] = [await token('gabi'), await token('ulisses')];
        const id = {};
        for (const nome of ['A1', 'A2', 'A3']) id[nome] = (await chamar(tg, 'POST', '/tarefas', { titulo: `Atribuída ${nome}`, usuario_id: ulisses.id })).dados.id;
        id.G1 = (await chamar(tg, 'POST', '/tarefas', { titulo: 'Da gestora G1' })).dados.id;
        for (const nome of ['U1', 'U2']) id[nome] = (await chamar(tu, 'POST', '/tarefas', { titulo: `Própria ${nome}` })).dados.id;
        const porId = async () => Object.fromEntries((await chamar(ti, 'GET', '/tarefas')).dados.map((x) => [x.id, x]));

        let { pagina, dialogos } = await abrirLista(t.navegador, 'ulisses');
        await pagina.getByRole('button', { name: 'Selecionar', exact: true }).click();
        await pagina.locator('input[title="Selecionar todas as atividades visíveis"]').check();
        const barra = await pagina.locator('text=selecionada(s)').first().textContent();
        t.conferir(barra.includes('5 selecionada(s)'), 'a caixinha do cabeçalho marca as 5 visíveis');
        t.conferir(await pagina.getByRole('button', { name: 'Excluir (2)' }).isVisible(), 'o botão mostra "Excluir (2)": só as 2 próprias podem ser excluídas');
        t.conferir(await pagina.locator('select[title="Passa as selecionadas para outro responsável"]').count() === 0, 'usuário padrão não vê "Passar para"');
        await t.print(pagina, 'selecao-usuario', 'Usuário padrão com 5 selecionadas: só 2 podem ser excluídas');
        await pagina.getByRole('button', { name: 'Excluir (2)' }).click();
        const resumo1 = await esperarResumo(dialogos, 2);
        t.conferir(dialogos[0].includes('Excluir 2 atividade(s)'), `pede confirmação: "${dialogos[0].split('?')[0]}?"`);
        t.conferir(resumo1.includes('2 atividade(s) excluída(s)') && resumo1.includes('3 ignorada(s)'), `resumo: "${resumo1.replace(/\n/g, ' | ')}"`);
        let atual = await porId();
        t.conferir(!atual[id.U1] && !atual[id.U2] && atual[id.A1], 'na API: as 2 próprias sumiram, as atribuídas continuam');
        await pagina.close();

        ({ pagina, dialogos } = await abrirLista(t.navegador, 'gabi'));
        await pagina.getByRole('button', { name: 'Selecionar', exact: true }).click();
        await pagina.getByText('Atribuída A1').click();
        await pagina.getByText('Atribuída A2').click();
        t.conferir((await pagina.locator('text=selecionada(s)').first().textContent()).includes('2 selecionada(s)') && pagina.url().endsWith('/atividades'),
            'no modo de seleção, clicar na linha marca a atividade (não abre os detalhes)');
        await t.print(pagina, 'selecao-gestora', 'Gestora com 2 selecionadas: mudar etapa e passar para outra pessoa');
        await pagina.locator('select[title="Muda a etapa das selecionadas"]').selectOption('concluido');
        const resumo2 = await esperarResumo(dialogos, 1);
        t.conferir(resumo2.includes('2 atividade(s) movida(s) para "Concluída"'), `resumo: "${resumo2}"`);
        atual = await porId();
        t.conferir(atual[id.A1].status === 'concluido' && atual[id.A2].status === 'concluido' && atual[id.A3].status === 'pendente', 'na API: A1 e A2 concluídas, A3 intacta');
        await pagina.getByText('Atribuída A3').click();
        await pagina.getByText('Da gestora G1').click();
        await pagina.locator('select[title="Passa as selecionadas para outro responsável"]').selectOption({ label: 'Ursula Padrão' });
        const resumo3 = await esperarResumo(dialogos, 2);
        t.conferir(resumo3.includes('2 atividade(s) passada(s) para Ursula Padrão'), `resumo: "${resumo3}"`);
        atual = await porId();
        t.conferir(atual[id.A3].usuario_id === ursula.id && atual[id.G1].usuario_id === ursula.id && atual[id.A3].responsavel === 'Ursula Padrão',
            'na API: A3 e G1 agora são da Ursula (id e nome atualizados juntos)');
        await pagina.getByRole('button', { name: 'Cancelar seleção' }).click();
        await pagina.getByText('Atribuída A3').click();
        await pagina.waitForURL(/\/atividades\/\d+$/);
        t.conferir(true, 'fora do modo de seleção, clicar na linha abre os detalhes');
        await pagina.close();

        await chamar(tg, 'POST', '/tarefas', { titulo: 'Aberta do Ulisses', usuario_id: ulisses.id });
        const sessaoUlisses = await token('ulisses');
        const pTI = await entrarNoSite(t.navegador, 'tina', undefined, { width: 1400, height: 900 });
        await pTI.goto(SITE + '/usuarios');
        await pTI.getByText('Ulisses Padrão').click();
        await pTI.getByRole('button', { name: 'Excluir usuário' }).waitFor();
        await t.print(pTI, 'excluir-usuario', 'TI editando um usuário: botão "Excluir usuário"');
        let mensagem = '';
        pTI.once('dialog', async (d) => { mensagem = d.message(); await d.accept(); });
        await pTI.getByRole('button', { name: 'Excluir usuário' }).click();
        await pTI.waitForURL(SITE + '/usuarios');
        t.conferir(mensagem.includes('responsável por 3 atividade(s)') && mensagem.includes('Inativo'), 'a confirmação avisa as 3 atividades dele e sugere "Inativo"');
        await pTI.getByText('Usuário "Ulisses Padrão" excluído.').waitFor();
        t.conferir(await pTI.getByText('Ulisses Padrão', { exact: true }).count() === 0, 'ele some da lista, com o aviso de excluído');
        t.conferir((await chamar(sessaoUlisses, 'GET', '/tarefas')).status === 401 && !(await login('ulisses')).token, 'o login aberto dele cai e ele não entra mais');
        const doUlisses = (await chamar(ti, 'GET', '/tarefas')).dados.filter((x) => x.responsavel === 'Ulisses Padrão');
        t.conferir(doUlisses.length === 3, 'as 3 atividades dele continuam, com o nome dele, para o histórico');
        const consistencia = (await chamar(ti, 'GET', '/manutencao/consistencia')).dados;
        const orfas = consistencia.verificacoes.find((v) => v.codigo === 'responsavel_inexistente_ou_inativo');
        t.conferir(orfas.quantidade === 1, 'a verificação de consistência aponta a atividade aberta que ficou sem responsável (as concluídas são histórico)');

        await pTI.getByText('Gabi Gestora').click();
        pTI.once('dialog', async (d) => { await d.dismiss(); });
        await pTI.getByRole('button', { name: 'Excluir usuário' }).click();
        await esperar(800);
        t.conferir((await chamar(ti, 'GET', `/usuarios/${gabi.id}`)).status === 200, 'clicar em "Cancelar" na confirmação não exclui');
        await pTI.goto(SITE + '/usuarios/1');
        await pTI.getByLabel('Nome completo').waitFor();
        await esperar(500);
        t.conferir(await pTI.getByRole('button', { name: 'Excluir usuário' }).count() === 0, 'na própria conta o botão não aparece');
        t.conferir((await chamar(tg, 'DELETE', `/usuarios/${ursula.id}`)).status === 403, 'gestor não exclui usuários (403)');
    },
};

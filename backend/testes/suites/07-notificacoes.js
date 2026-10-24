const { chamar, token, esperar, criarPrimeiroTI, criarUsuario, consultarNoBanco, entrarNoSite, SITE } = require('../apoio');

module.exports = {
    nome: 'Notificações',
    descricao: 'Quem recebe uma atividade ou perde a responsabilidade por ela é avisado no sino; quem fez a ação não se auto-notifica.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        await criarUsuario(ti, 'Gabi Gestora', 'gabi', 'PCP', 'gestor');
        const ulisses = await criarUsuario(ti, 'Ulisses Padrão', 'ulisses', 'PCP', 'usuario');
        const ursula = await criarUsuario(ti, 'Ursula Padrão', 'ursula', 'PCP', 'usuario');
        const [tg, tu, ts] = [await token('gabi'), await token('ulisses'), await token('ursula')];
        const contagem = async (tk) => (await chamar(tk, 'GET', '/notificacoes/contagem')).dados.nao_lidas;
        const lista = async (tk) => (await chamar(tk, 'GET', '/notificacoes')).dados;

        const t1 = (await chamar(tg, 'POST', '/tarefas', { titulo: 'Revisar planilha', usuario_id: ulisses.id })).dados;
        await chamar(tg, 'POST', '/tarefas', { titulo: 'Tarefa da própria gestora' });
        await chamar(tu, 'POST', '/tarefas', { titulo: 'Ulisses cria para si' });
        t.conferir(await contagem(tu) === 1, 'Ulisses: 1 aviso (a gestora atribuiu uma atividade a ele)');
        t.conferir(await contagem(tg) === 0, 'gestora: nenhum aviso (ninguém é avisado do que ele mesmo fez)');
        const [n1] = await lista(tu);
        t.conferir(n1.tipo === 'atribuida' && n1.tarefa_id === t1.id && n1.autor_nome === 'Gabi Gestora' && n1.tarefa_titulo === 'Revisar planilha',
            'o aviso guarda o tipo, a atividade, o título e quem fez');

        await chamar(tg, 'PUT', `/tarefas/${t1.id}`, { usuario_id: ursula.id });
        const [nUrsula] = await lista(ts);
        const avisosUlisses = await lista(tu);
        t.conferir(nUrsula && nUrsula.tipo === 'recebida' && nUrsula.tarefa_id === t1.id, 'troca de responsável: Ursula recebe "passou para você"');
        t.conferir(avisosUlisses[0].tipo === 'removida' && avisosUlisses[0].novo_responsavel === 'Ursula Padrão', 'Ulisses recebe "passou a atividade para Ursula Padrão"');
        t.conferir(avisosUlisses[0].criada_em >= avisosUlisses[1].criada_em, 'a lista vem da mais recente para a mais antiga');
        await chamar(tg, 'PUT', `/tarefas/${t1.id}`, { status: 'em andamento' });
        t.conferir(await contagem(ts) === 1, 'mudar só o status não gera aviso');

        t.conferir((await chamar(ts, 'POST', `/notificacoes/${avisosUlisses[0].id}/lida`)).status === 404, 'ninguém marca como lido o aviso de outra pessoa (404)');
        await chamar(tu, 'POST', `/notificacoes/${avisosUlisses[1].id}/lida`);
        t.conferir(await contagem(tu) === 1, 'marcar um aviso como lido baixa a contagem (2 → 1)');
        t.conferir((await chamar(null, 'GET', '/notificacoes/contagem')).status === 401, 'sem login → 401');

        if (t.navegador) {
            const pagina = await entrarNoSite(t.navegador, 'ulisses', undefined, { width: 1400, height: 900 });
            const sino = pagina.locator('button[title="Notificações"]');
            await pagina.waitForFunction(() => document.querySelector('button[title="Notificações"]').textContent.trim() === '1');
            t.conferir(true, 'tela: o sino mostra 1 não lida');
            await sino.click();
            await pagina.getByText('passou a atividade #001 "Revisar planilha" para Ursula Padrão').waitFor();
            t.conferir(await pagina.getByText('atribuiu a você a atividade #001 "Revisar planilha"').isVisible(),
                'tela: a lista mostra a troca de responsável e o aviso já lido');
            await t.print(pagina, 'notificacoes', 'Sino aberto: avisos de atribuição e de troca de responsável');
            await pagina.getByRole('button', { name: 'Marcar todas como lidas' }).click();
            await esperar(800);
            t.conferir((await sino.textContent()).trim() === '' && await contagem(tu) === 0, 'tela: "Marcar todas como lidas" zera o sino e grava na API');

            const t2 = (await chamar(tg, 'POST', '/tarefas', { titulo: 'Conferir estoque', usuario_id: ulisses.id })).dados;
            await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
            await pagina.waitForFunction(() => document.querySelector('button[title="Notificações"]').textContent.trim() === '1');
            t.conferir(true, 'tela: aviso novo aparece no sino sem recarregar a página');
            await sino.click();
            await pagina.getByText(`atribuiu a você a atividade #00${t2.id} "Conferir estoque"`).click();
            await pagina.waitForURL(`${SITE}/atividades/${t2.id}`);
            t.conferir(await contagem(tu) === 0, `tela: clicar no aviso abre a atividade #00${t2.id} e marca como lido`);
        }

        await chamar(ti, 'DELETE', `/usuarios/${ulisses.id}`);
        t.conferir((await consultarNoBanco('notificacoes', 'usuario_id', ulisses.id)).length === 0, 'excluir o usuário apaga os avisos dele do banco');
    },
};

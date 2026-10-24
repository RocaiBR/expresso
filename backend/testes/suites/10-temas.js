const { chamar, token, criarPrimeiroTI, criarUsuario, diaEmSaoPaulo, entrarNoSite, SITE } = require('../apoio');

async function escolherTema(pagina, rotulo) {
    await pagina.getByRole('button', { name: 'Usuário' }).click();
    await pagina.getByRole('radio', { name: rotulo, exact: true }).click();
    await pagina.keyboard.press('Escape');
}

module.exports = {
    nome: 'Temas da interface',
    descricao: 'O tema escolhido vale na hora, fica salvo na conta e é aplicado em qualquer navegador onde a pessoa entrar.',
    usaNavegador: true,

    async executar(t) {
        const ti = await criarPrimeiroTI();
        await criarUsuario(ti, 'Gabi Gestora', 'gabi', 'PCP', 'gestor');
        const ulisses = await criarUsuario(ti, 'Ulisses Padrão', 'ulisses', 'PCP', 'usuario');
        const tg = await token('gabi');
        const hoje = diaEmSaoPaulo(0);
        for (const [titulo, prioridade, status] of [
            ['Revisar planilha de custos', 'alto', 'pendente'], ['Conferir estoque', 'medio', 'em andamento'],
            ['Atualizar procedimento', 'baixo', 'concluido'], ['Reunião com fornecedor', 'urgente', 'pendente'],
            ['Inventário mensal', 'medio', 'concluido'],
        ]) {
            const nova = (await chamar(tg, 'POST', '/tarefas', { titulo, prioridade, usuario_id: ulisses.id, descricao: 'Detalhes da atividade.', data_inicio: hoje, data_conclusao: hoje })).dados;
            if (status !== 'pendente') await chamar(tg, 'PUT', `/tarefas/${nova.id}`, { status });
        }

        const pagina = await entrarNoSite(t.navegador, 'ulisses', undefined, { width: 1400, height: 860 });
        for (const [tema, rotulo] of [['claro', 'Claro'], ['escuro', 'Escuro'], ['profundo', 'Escuro profundo']]) {
            await escolherTema(pagina, rotulo);
            t.conferir(await pagina.evaluate(() => document.documentElement.dataset.tema) === tema, `tema "${rotulo}" aplicado na hora`);
            for (const [nome, rota, legenda] of [['atividades', '/atividades', 'Atividades'], ['relatorios', '/relatorios', 'Relatórios']]) {
                await pagina.goto(SITE + rota);
                await pagina.waitForTimeout(nome === 'relatorios' ? 1500 : 700);
                await t.print(pagina, `tema-${tema}-${nome}`, `${legenda} no tema ${rotulo}`);
            }
        }

        const perfil = (await chamar(await token('ulisses'), 'GET', '/perfil')).dados;
        t.conferir(perfil.tema === 'profundo', 'a conta guardou o último tema escolhido ("profundo")');
        const outro = await entrarNoSite(t.navegador, 'ulisses', undefined, { width: 1400, height: 860 });
        t.conferir(await outro.evaluate(() => document.documentElement.dataset.tema) === 'profundo', 'em outro navegador, o tema da conta é aplicado ao entrar');
        await outro.goto(SITE + '/atividades');
        t.conferir(await outro.evaluate(() => document.documentElement.dataset.tema) === 'profundo', 'e continua ao recarregar a página');
    },
};

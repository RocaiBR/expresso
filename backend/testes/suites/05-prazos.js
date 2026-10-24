const { chamar, token, criarPrimeiroTI, criarUsuario, gravarNoBanco, diaEmSaoPaulo, entrarNoSite, SITE, SENHA } = require('../apoio');

module.exports = {
    nome: 'Prazos e urgência automática',
    descricao: 'Passou o dia do vencimento e a atividade não foi concluída: vira Urgente, avisa as pessoas e volta ao normal se o prazo for adiado.',

    async executar(t) {
        const [ONTEM, HOJE, AMANHA, SEMANA] = [diaEmSaoPaulo(-1), diaEmSaoPaulo(0), diaEmSaoPaulo(1), diaEmSaoPaulo(7)];
        const ti = await criarPrimeiroTI();
        await criarUsuario(ti, 'Gabi Gestora', 'gabi', 'PCP', 'gestor');
        const ulisses = await criarUsuario(ti, 'Ulisses Padrão', 'ulisses', 'PCP', 'usuario');
        const [tg, tu] = [await token('gabi'), await token('ulisses')];
        const ver = async (id) => (await chamar(tg, 'GET', `/tarefas/${id}`)).dados;
        const nova = async (titulo, prazo, prioridade, extra = {}) => (await chamar(tg, 'POST', '/tarefas', {
            titulo, data_inicio: ONTEM, data_conclusao: prazo, prioridade, usuario_id: ulisses.id, ...extra,
        })).dados;
        
        const mudarPrazoNoBanco = (id, data) => gravarNoBanco(`tarefas/${id}`, { data_conclusao: data }, true);

        const t1 = await nova('Relatório vencido', ONTEM, 'baixo');
        const t2 = await nova('Conferir estoque', AMANHA, 'medio');
        const t3 = await nova('Entrega de hoje', HOJE, 'baixo');
        const t4 = await nova('Já concluída', ONTEM, 'baixo', { status: 'concluido' });
        t.conferir(t1.prioridade === 'urgente' && t1.atrasada && t1.prioridade_original === 'baixo',
            'criada com o prazo vencido: já nasce Urgente e guarda que era Baixa');
        t.conferir(t2.prioridade === 'medio' && !t2.atrasada, 'prazo amanhã: continua Média');
        t.conferir(t3.prioridade === 'baixo' && !t3.atrasada, `prazo hoje (${HOJE}): ainda não atrasou (vence quando o dia acaba, no horário de Brasília)`);
        t.conferir(t4.prioridade === 'baixo' && !t4.atrasada, 'concluída com prazo passado não muda');

        await mudarPrazoNoBanco(t2.id, ONTEM);
        t.conferir((await chamar(tg, 'POST', '/tarefas/verificar-prazos')).status === 403, 'só o TI roda a verificação manual (gestor: 403)');
        const r1 = (await chamar(ti, 'POST', '/manutencao/rotina-diaria')).dados.prazos;
        t.conferir(r1.viraram_urgentes === 1 && r1.voltaram_ao_normal === 0,
            `rotina das 00:05: ${r1.abertas} abertas, ${r1.viraram_urgentes} virou urgente, ${r1.voltaram_ao_normal} voltaram`);
        let v2 = await ver(t2.id);
        t.conferir(v2.prioridade === 'urgente' && v2.atrasada_desde === HOJE && v2.prioridade_original === 'medio',
            `o prazo que venceu ontem virou Urgente (era Média), atrasada desde ${v2.atrasada_desde}`);
        const avisosU = (await chamar(tu, 'GET', '/notificacoes')).dados.filter((n) => n.tipo === 'atrasada');
        const avisosG = (await chamar(tg, 'GET', '/notificacoes')).dados.filter((n) => n.tipo === 'atrasada');
        t.conferir(avisosU.length === 2 && avisosU.every((n) => n.autor_nome === 'Sistema'), 'o responsável recebeu 2 avisos de atraso, assinados pelo "Sistema"');
        t.conferir(avisosG.length === 1 && avisosG[0].tarefa_id === t2.id, 'quem criou também é avisado (menos do atraso que ela mesma criou)');
        const r2 = (await chamar(ti, 'POST', '/tarefas/verificar-prazos')).dados;
        t.conferir(r2.viraram_urgentes === 0, 'rodar de novo não muda nada nem repete o aviso');

        await chamar(tg, 'PUT', `/tarefas/${t1.id}`, { data_conclusao: SEMANA });
        const v1 = await ver(t1.id);
        t.conferir(v1.prioridade === 'baixo' && !v1.atrasada, 'adiar o prazo volta para a prioridade de antes (Baixa)');
        await chamar(tg, 'PUT', `/tarefas/${t2.id}`, { prioridade: 'alto' });
        await chamar(ti, 'POST', '/tarefas/verificar-prazos');
        v2 = await ver(t2.id);
        t.conferir(v2.prioridade === 'alto' && v2.atrasada, 'atrasada com a prioridade trocada à mão (Alta): a rotina respeita a escolha');
        await chamar(tg, 'PUT', `/tarefas/${t2.id}`, { data_conclusao: SEMANA, prioridade: 'baixo' });
        v2 = await ver(t2.id);
        t.conferir(v2.prioridade === 'baixo' && !v2.atrasada, 'adiar e escolher a prioridade na mesma alteração: vale a escolhida');
        await mudarPrazoNoBanco(t3.id, ONTEM);
        await chamar(ti, 'POST', '/tarefas/verificar-prazos');
        await chamar(tu, 'PUT', `/tarefas/${t3.id}`, { status: 'concluido' });
        const v3 = await ver(t3.id);
        t.conferir(v3.status === 'concluido' && v3.prioridade === 'urgente' && v3.finalizado_em,
            'concluir uma atrasada guarda o histórico (Urgente) e a data de fim');

        if (!t.navegador) return;
        const tAtrasada = await nova('Revisar planilha atrasada', ONTEM, 'medio');
        const pagina = await entrarNoSite(t.navegador, 'ulisses', SENHA, { width: 1400, height: 860 });
        await pagina.goto(SITE + '/atividades');
        const linha = pagina.locator('div.grid', { hasText: 'Revisar planilha atrasada' });
        await linha.waitFor();
        t.conferir(await linha.getByText('Atrasada', { exact: true }).isVisible() && await linha.getByText('Urgente').isVisible(),
            'tela: na lista aparecem o selo "Atrasada" e a prioridade Urgente');
        t.conferir(await pagina.locator('div.grid', { hasText: 'Relatório vencido' }).getByText('Atrasada', { exact: true }).count() === 0,
            'tela: a que teve o prazo adiado não mostra o selo');
        await t.print(pagina, 'prazos-lista', 'Lista de atividades: selo "Atrasada" e prioridade Urgente');
        await pagina.goto(`${SITE}/atividades/${tAtrasada.id}`);
        await pagina.getByText('Atrasada desde').waitFor();
        t.conferir(await pagina.getByText('Urgente (era Médio, subiu pelo atraso)').isVisible(), 'tela: nos detalhes, "Urgente (era Médio, subiu pelo atraso)"');
        await t.print(pagina, 'prazos-detalhes', 'Detalhes: desde quando está atrasada e qual era a prioridade');
        await pagina.locator('button[title="Notificações"]').click();
        await pagina.getByText('passou do prazo').first().waitFor();
        t.conferir(await pagina.getByText(`"Revisar planilha atrasada" passou do prazo`).isVisible(), 'tela: o sino mostra "A atividade ... passou do prazo e agora é Urgente"');
        await t.print(pagina, 'prazos-sino', 'Sino de notificações com o aviso de atraso');
        t.conferir(await pagina.getByRole('button', { name: 'Verificar prazos' }).count() === 0, 'tela: usuário padrão não vê o botão "Verificar prazos"');
    },
};

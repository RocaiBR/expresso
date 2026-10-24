const { chamar, token, criarPrimeiroTI, gravarNoBanco, consultarNoBanco, diaEmSaoPaulo, SENHA } = require('../apoio');

const resumir = (relatorio) => ({
    totais: relatorio.totais,
    problemas: relatorio.problemas,
    verificacoes: relatorio.verificacoes.map(({ codigo, gravidade, quantidade, exemplos, acao }) => ({ codigo, gravidade, quantidade, exemplos, acao })),
});

module.exports = {
    nome: 'Verificação de consistência e correção',
    descricao: 'Dados gravados por fora da API, com 12 tipos de problema, são encontrados pelas 13 conferências e corrigidos até a verificação sair limpa.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const ONTEM = diaEmSaoPaulo(-1);
        const usuario = (id, campos) => gravarNoBanco(`usuarios/${id}`, { id, senha: SENHA, funcao: 'usuario', ativo: true, setor: 'PCP', ...campos });
        const tarefa = (id, campos) => gravarNoBanco(`tarefas/${id}`, {
            id, titulo: `Tarefa ${id}`, status: 'pendente', prioridade: 'medio', usuario_id: 1, responsavel: 'Tina TI',
            participantes_ids: [], data_inicio: null, data_conclusao: null, finalizado_em: null, ...campos,
        });

        // ---- Dados inconsistentes (contadores ficam em 1: ids 2, 3 e 7 já existem)
        await usuario(2, { nome: 'Bruno Sem Setor', usuario: 'bruno', email: ' Bruno@Teste.com ', setor: null });
        await usuario(3, { nome: 'Carla Repetida', usuario: 'carla', email: 'bruno@teste.com' });
        await tarefa(1, { titulo: 'Importada sem responsável', usuario_id: null, responsavel: 'Equipe' });
        await tarefa(2, { titulo: 'Responsável excluído', usuario_id: 99, responsavel: 'Fulano Excluído' });
        await tarefa(3, { titulo: 'Participante excluído', participantes_ids: [98] });
        await tarefa(4, { titulo: 'Status digitado errado', status: 'feito', prioridade: 'altissima' });
        await tarefa(5, { titulo: 'Datas invertidas', status: 'concluido', data_inicio: '2026-10-10', data_conclusao: '2026-10-01', finalizado_em: new Date() });
        await tarefa(6, { titulo: 'Venceu e não marcou', data_conclusao: ONTEM });
        await tarefa(7, { titulo: 'Concluída antiga', status: 'concluido' });
        await gravarNoBanco('contadores/tarefas', { ultimo: 3 });
        await gravarNoBanco('tarefas/1/anexos/abandonado', {
            id: 'abandonado', nome: 'nunca-terminou.pdf', status: 'enviando', caminho: 'tarefas/1/abandonado/nunca-terminou.pdf',
            criado_em: new Date(Date.now() - 2 * 86400000),
        });
        await token('bruno');
        const [sessaoBruno] = await consultarNoBanco('sessoes', 'usuario_id', 2);
        await gravarNoBanco(sessaoBruno.name.split('/documents/')[1], { expira_em: new Date(Date.now() - 3600000) }, true);

        let r = await chamar(ti, 'GET', '/manutencao/consistencia');
        const antes = r.dados;
        t.anexar('Verificação ANTES da correção (GET /api/manutencao/consistencia)', resumir(antes));
        const item = (relatorio, codigo) => relatorio.verificacoes.find((v) => v.codigo === codigo);
        const esperado = {
            contador_de_ids: 2, email_duplicado: 1, email_fora_do_padrao: 1, usuario_sem_setor: 1, tarefa_sem_responsavel: 1,
            responsavel_inexistente_ou_inativo: 1, participante_inexistente: 1, status_ou_prioridade_invalidos: 1,
            datas_invertidas: 1, prazo_vencido_sem_marcacao: 1, encerrada_sem_data_de_fim: 1, anexo_abandonado: 1, sem_ti_ativo: 0,
        };
        t.conferir(r.status === 200 && antes.verificacoes.length === 13, `a verificação roda ${antes.verificacoes.length} conferências`);
        for (const [codigo, quantidade] of Object.entries(esperado)) {
            const v = item(antes, codigo);
            t.conferir(v && v.quantidade === quantidade, `${codigo}: ${v ? v.quantidade : '?'} encontrado(s)${v && v.exemplos.length ? ` (ex.: ${v.exemplos[0]})` : ''}`);
        }
        t.conferir(antes.problemas === 10, `${antes.problemas} problemas (os 2 itens "info" não contam)`);
        t.conferir(item(antes, 'email_duplicado').exemplos[0] === 'bruno@teste.com: usuários 2, 3', 'e-mail repetido é encontrado mesmo com espaços e maiúsculas diferentes');

        // ---- Correções pela API (as mesmas validações de sempre)
        r = await chamar(ti, 'PUT', '/usuarios/2', { email: 'BRUNO@teste.com' });
        t.conferir(r.status === 409, 'padronizar o e-mail do Bruno é recusado enquanto a Carla usa o mesmo (409)');
        await chamar(ti, 'PUT', '/usuarios/3', { email: 'carla@teste.com' });
        r = await chamar(ti, 'PUT', '/usuarios/2', { email: ' Bruno@Teste.com ', setor: 'PCP' });
        t.conferir(r.status === 200 && r.dados.usuario.email === 'bruno@teste.com', 'com a Carla corrigida, o e-mail do Bruno é gravado padronizado');
        await chamar(ti, 'PUT', '/tarefas/1', { usuario_id: 2 });
        await chamar(ti, 'PUT', '/tarefas/2', { usuario_id: 2 });
        await chamar(ti, 'PUT', '/tarefas/3', { participantes_ids: [] });
        r = await chamar(ti, 'PUT', '/tarefas/4', { status: 'feito' });
        t.conferir(r.status === 400, 'o valor errado não pode ser regravado pela API (400)');
        await chamar(ti, 'PUT', '/tarefas/4', { status: 'concluido', prioridade: 'alto' });
        r = await chamar(ti, 'PUT', '/tarefas/5', { data_inicio: '2026-09-25' });
        t.conferir(r.status === 200, 'datas invertidas: a nova data de início é conferida contra o vencimento já gravado');

        // ---- Correções automáticas da rotina diária
        const rotina = (await chamar(ti, 'POST', '/manutencao/rotina-diaria')).dados;
        t.anexar('Rotina diária (POST /api/manutencao/rotina-diaria, a mesma que roda às 00:05)', rotina);
        t.conferir(rotina.contadores.tarefas.para === 7 && rotina.contadores.usuarios.para === 3, 'rotina: contadores sobem até o maior id (tarefas 3 → 7, usuários 1 → 3)');
        t.conferir(rotina.prazos.viraram_urgentes === 1, 'rotina: a atividade vencida virou urgente');
        t.conferir(rotina.anexos_abandonados.removidos === 1, 'rotina: o envio abandonado foi apagado');
        t.conferir(rotina.sessoes_vencidas === 1, 'rotina: a sessão vencida foi apagada');
        r = await chamar(ti, 'POST', '/tarefas', { titulo: 'Criada depois da correção' });
        t.conferir(r.dados.id === 8, 'o próximo cadastro recebe o id 8 (sem sobrescrever a tarefa 7)');

        const depois = (await chamar(ti, 'GET', '/manutencao/consistencia')).dados;
        t.anexar('Verificação DEPOIS da correção', resumir(depois));
        t.conferir(depois.problemas === 0, `depois das correções: ${depois.problemas} problemas`);
        t.conferir(item(depois, 'encerrada_sem_data_de_fim').quantidade === 1, 'sobra só o item informativo (concluída antes de existir "finalizado_em")');
    },
};

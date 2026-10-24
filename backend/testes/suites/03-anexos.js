const { chamar, criarPrimeiroTI, gravarNoBanco, arquivosNoStorage } = require('../apoio');
const { amostrasValidas, amostrasDisfarcadas } = require('../amostras');
async function anexar(token, tarefaId, nome, conteudo, tamanhoDeclarado = conteudo.length) {
    const inicio = await chamar(token, 'POST', `/tarefas/${tarefaId}/anexos`, { nome, tamanho: tamanhoDeclarado });
    if (inicio.status !== 201) return { etapa: 'inicio', ...inicio };
    const envio = await fetch(inicio.dados.url_envio, { method: 'PUT', headers: { 'Content-Type': inicio.dados.anexo.tipo }, body: conteudo });
    if (!envio.ok) return { etapa: 'envio', status: envio.status };
    const fim = await chamar(token, 'POST', `/tarefas/${tarefaId}/anexos/${inicio.dados.anexo.id}/concluir`);
    return { etapa: 'concluir', anexo: inicio.dados.anexo, ...fim };
}

module.exports = {
    nome: 'Anexos e assinatura dos arquivos',
    descricao: 'Só entram arquivos de tipos permitidos, até 200 MB, cujo conteúdo é mesmo do formato da extensão; o recusado é apagado do Storage.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const tarefa = (await chamar(ti, 'POST', '/tarefas', { titulo: 'Atividade com anexos' })).dados;
        const pedir = (corpo) => chamar(ti, 'POST', `/tarefas/${tarefa.id}/anexos`, corpo);

        for (const nome of ['programa.exe', 'script.js', 'pagina.html', 'atalho.lnk', 'sem-extensao']) {
            const r = await pedir({ nome, tamanho: 100 });
            t.conferir(r.status === 400 && r.dados.erro === 'Tipo de arquivo não permitido.', `"${nome}": tipo não permitido (400)`);
        }
        for (const [tamanho, descricao] of [[0, 'vazio (0 bytes)'], [-5, 'tamanho negativo'], ['100', 'tamanho como texto'], [201 * 1024 * 1024, '201 MB']]) {
            const r = await pedir({ nome: 'video.mp4', tamanho });
            t.conferir(r.status === 400 && r.dados.erro.includes('200 MB'), `arquivo ${descricao}: recusado (400)`);
        }
        t.conferir((await pedir({ nome: 'a'.repeat(201) + '.pdf', tamanho: 10 })).status === 400, 'nome com mais de 200 caracteres: recusado (400)');
        const semEnvio = await pedir({ nome: 'ainda-nao-enviado.pdf', tamanho: 10 });
        t.conferir((await chamar(ti, 'POST', `/tarefas/${tarefa.id}/anexos/${semEnvio.dados.anexo.id}/concluir`)).status === 409,
            'confirmar antes de o arquivo chegar ao Storage → 409');

        for (const [nome, conteudo] of amostrasValidas()) {
            const r = await anexar(ti, tarefa.id, nome, conteudo);
            t.conferir(r.status === 200 && r.dados.status === 'pronto', `aceito: ${nome} (${r.dados && r.dados.tipo || r.status})`);
        }
        const lista = (await chamar(ti, 'GET', `/tarefas/${tarefa.id}/anexos`)).dados;
        t.conferir(lista.length === amostrasValidas().length, `a atividade lista os ${lista.length} anexos prontos (o "enviando" não aparece)`);
        const logo = lista.find((a) => a.nome === 'logo.png');
        const baixado = await fetch(logo.url);
        const bytes = Buffer.from(await baixado.arrayBuffer());
        const original = amostrasValidas().find(([nome]) => nome === 'logo.png')[1];
        t.conferir(baixado.headers.get('content-type') === 'image/png' && bytes.equals(original),
            `o link de download devolve o arquivo idêntico (${bytes.length} bytes, image/png)`);
        t.conferir(lista.every((a) => a.token === undefined), 'o token do arquivo fica só no banco; para fora vai o link pronto');

        for (const [nome, conteudo] of amostrasDisfarcadas()) {
            const r = await anexar(ti, tarefa.id, nome, conteudo);
            const sobrou = r.anexo ? await arquivosNoStorage(`tarefas/${tarefa.id}/${r.anexo.id}/`) : ['?'];
            t.conferir(r.status === 400 && /não corresponde/.test(r.dados.erro) && sobrou.length === 0,
                `recusado e apagado do Storage: ${nome}`);
        }

        const grande = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(300 * 1024, 32)]);
        const mentiu = await anexar(ti, tarefa.id, 'tamanho-mentiroso.pdf', grande, 10);
        t.conferir(mentiu.status === 200 && mentiu.dados.tamanho === grande.length,
            `informou 10 bytes, enviou ${grande.length}: a API grava o tamanho real (${mentiu.dados.tamanho})`);

        const abandonado = (await pedir({ nome: 'abandonado.pdf', tamanho: 9 })).dados;
        await fetch(abandonado.url_envio, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: Buffer.from('%PDF-1.4\n') });
        await gravarNoBanco(`tarefas/${tarefa.id}/anexos/${abandonado.anexo.id}`, { criado_em: new Date(Date.now() - 2 * 86400000) }, true);
        await gravarNoBanco(`tarefas/${tarefa.id}/anexos/${semEnvio.dados.anexo.id}`, { criado_em: new Date(Date.now() - 3 * 3600000) }, true);
        const recente = (await pedir({ nome: 'subindo-agora.pdf', tamanho: 9 })).dados;
        const consistencia = (await chamar(ti, 'GET', '/manutencao/consistencia')).dados;
        const item = consistencia.verificacoes.find((v) => v.codigo === 'anexo_abandonado');
        t.conferir(item.quantidade === 1 && item.exemplos[0].endsWith('abandonado.pdf'), 'a verificação de consistência aponta 1 envio abandonado há mais de 24 h');
        const rotina = await chamar(ti, 'POST', '/manutencao/rotina-diaria');
        t.conferir(rotina.status === 200 && rotina.dados.anexos_abandonados.removidos === 1,
            `rotina diária: ${rotina.dados.anexos_abandonados.enviando} "enviando", ${rotina.dados.anexos_abandonados.removidos} removido (o de 2 dias)`);
        t.conferir((await arquivosNoStorage(`tarefas/${tarefa.id}/${abandonado.anexo.id}/`)).length === 0, 'o pedaço que chegou ao Storage também foi apagado');
        const restantes = (await chamar(ti, 'POST', `/tarefas/${tarefa.id}/anexos/${recente.anexo.id}/concluir`)).status;
        t.conferir(restantes === 409, 'os envios com menos de 24 h continuam (podem estar subindo)');

        const antes = (await arquivosNoStorage(`tarefas/${tarefa.id}/`)).length;
        await chamar(ti, 'DELETE', `/tarefas/${tarefa.id}`);
        t.conferir(antes > 0 && (await arquivosNoStorage(`tarefas/${tarefa.id}/`)).length === 0,
            `excluir a atividade apaga os ${antes} arquivos dela no Storage`);
    },
};

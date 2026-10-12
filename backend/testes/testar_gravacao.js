const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let falhas = 0;
function conferir(condicao, mensagem) {
    console.log(`   ${condicao ? '✔' : '✘'} ${mensagem}`);
    if (!condicao) falhas++;
}

async function main() {
    console.log(`Testando API em ${BASE_URL}\n`);

    // Servidor e banco
    console.log('1) GET /health');
    const health = await fetch(`${BASE_URL}/health`).then((r) => r.json()).catch(() => null);
    if (!health || health.banco !== 'conectado') {
        console.error('   ✘ Servidor ou banco não responderam.');
        console.error('     Confira se a API (npm run dev ou npm run emuladores) e o Firestore estão no ar.');
        console.error('     Resposta recebida:', health);
        process.exitCode = 1;
        return;
    }
    console.log(`   ✔ API no ar, banco "${health.banco_nome}" conectado (hora do banco: ${health.hora_do_banco})\n`);

    // Criar tarefa com todos os campos que o formulário envia
    const tituloTeste = `Teste automático ${new Date().toISOString()}`;
    const enviada = {
        titulo: tituloTeste,
        descricao: 'Registro criado pelo script de teste.',
        responsavel: 'script-teste',
        participantes: 'Equipe de teste',
        status: 'pendente',
        prioridade: 'alto',
        data_inicio: '2026-10-01',
        data_conclusao: '2026-10-15',
    };

    console.log('2) POST /tarefas');
    const respostaCriar = await fetch(`${BASE_URL}/tarefas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enviada),
    });

    if (respostaCriar.status !== 201) {
        console.error(`   ✘ Esperava status 201 e recebi ${respostaCriar.status}.`);
        console.error('    ', await respostaCriar.text());
        process.exitCode = 1;
        return;
    }
    const criada = await respostaCriar.json();
    console.log(`   ✔ Servidor aceitou e devolveu id ${criada.id}\n`);

    // Ler de volta do banco e comparar campo por campo
    console.log(`3) GET /tarefas/${criada.id}`);
    const salva = await fetch(`${BASE_URL}/tarefas/${criada.id}`).then((r) => r.json());
    const data = (valor) => (valor ? String(valor).split('T')[0] : valor);

    conferir(salva.titulo === enviada.titulo, 'titulo gravado');
    conferir(salva.responsavel === enviada.responsavel, 'responsavel gravado');
    conferir(salva.participantes === enviada.participantes, 'participantes gravado');
    conferir(salva.prioridade === enviada.prioridade, `prioridade gravada (veio: ${salva.prioridade})`);
    conferir(data(salva.data_inicio) === enviada.data_inicio, `data_inicio gravada (veio: ${salva.data_inicio})`);
    conferir(data(salva.data_conclusao) === enviada.data_conclusao, `data_conclusao gravada (veio: ${salva.data_conclusao})`);
    console.log('');

    // Atualizar status (o que os botões Concluir/Cancelar fazem)
    console.log(`4) PUT /tarefas/${criada.id}  { status: "concluido" }`);
    const respostaPut = await fetch(`${BASE_URL}/tarefas/${criada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'concluido' }),
    });
    const atualizada = await respostaPut.json();
    conferir(respostaPut.status === 200 && atualizada.tarefa && atualizada.tarefa.status === 'concluido', 'status atualizado');
    console.log('');

    // Anexar um arquivo pelo mesmo caminho do navegador: pede o envio, manda ao Storage e confirma
    console.log(`5) POST /tarefas/${criada.id}/anexos  (arquivo vai direto ao Storage)`);
    const conteudo = `Arquivo de teste gerado em ${new Date().toISOString()}`;
    const inicio = await fetch(`${BASE_URL}/tarefas/${criada.id}/anexos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'teste.txt', tamanho: Buffer.byteLength(conteudo) }),
    }).then((r) => r.json());

    let anexo = null;
    if (!inicio.url_envio) {
        conferir(false, `endereço de envio criado (a API respondeu: ${inicio.erro})`);
    } else {
        const envio = await fetch(inicio.url_envio, {
            method: 'PUT',
            headers: { 'Content-Type': inicio.anexo.tipo },
            body: conteudo,
        });
        conferir(envio.ok, `arquivo enviado ao Storage (status ${envio.status})`);

        const respostaConcluir = await fetch(`${BASE_URL}/tarefas/${criada.id}/anexos/${inicio.anexo.id}/concluir`, { method: 'POST' });
        anexo = await respostaConcluir.json();
        conferir(respostaConcluir.status === 200 && anexo.status === 'pronto', 'anexo confirmado na tarefa');

        const baixado = await fetch(anexo.url).then((r) => r.text()).catch(() => null);
        conferir(baixado === conteudo, 'download do arquivo confere com o enviado');

        const lista = await fetch(`${BASE_URL}/tarefas/${criada.id}/anexos`).then((r) => r.json());
        conferir(Array.isArray(lista) && lista.length === 1, 'anexo aparece na lista da tarefa');
    }
    console.log('');

    // Apagar a tarefa de teste para não sujar o banco (leva junto os arquivos dela)
    console.log(`6) DELETE /tarefas/${criada.id}`);
    const respostaDelete = await fetch(`${BASE_URL}/tarefas/${criada.id}`, { method: 'DELETE' });
    conferir(respostaDelete.status === 200, 'tarefa de teste removida');
    if (anexo && anexo.url) {
        const depois = await fetch(anexo.url);
        // O link funcionava antes; agora o Storage recusa (404 ou 403, conforme o ambiente)
        conferir(!depois.ok, `arquivo apagado do Storage junto com a tarefa (link agora responde ${depois.status})`);
    }
    console.log('');

    if (falhas === 0) {
        console.log('✮ Tudo certo: o backend está recebendo, gravando e atualizando tarefas no Firestore e arquivos no Storage.');
    } else {
        console.log(`✘ ${falhas} verificação(ões) falharam.`);
        console.log('  Veja os logs da API ([HTTP] e [ERRO]) para descobrir o motivo.');
        process.exitCode = 1;
    }
}

main().catch((erro) => {
    console.error('✘ Erro inesperado ao rodar o teste:', erro.message);
    process.exitCode = 1;
});
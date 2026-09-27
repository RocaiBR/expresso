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
        console.error('     Confira se "npm run dev" está rodando e se o MySQL está ligado.');
        console.error('     Resposta recebida:', health);
        process.exitCode = 1;
        return;
    }
    console.log(`   ✔ API no ar, banco "${health.banco_nome}" conectado\n`);

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

    // Apagar a tarefa de teste para não sujar o banco
    console.log(`5) DELETE /tarefas/${criada.id}`);
    const respostaDelete = await fetch(`${BASE_URL}/tarefas/${criada.id}`, { method: 'DELETE' });
    conferir(respostaDelete.status === 200, 'tarefa de teste removida');
    console.log('');

    if (falhas === 0) {
        console.log('✮ Tudo certo: o backend está recebendo, gravando e atualizando tarefas no MySQL.');
    } else {
        console.log(`✘ ${falhas} verificação(ões) falharam.`);
        console.log('  Se foram prioridade/datas/participantes: falta trocar o tarefaController.js');
        console.log('  ou criar as colunas data_inicio e participantes no banco.');
        process.exitCode = 1;
    }
}

main().catch((erro) => {
    console.error('✘ Erro inesperado ao rodar o teste:', erro.message);
    process.exitCode = 1;
});
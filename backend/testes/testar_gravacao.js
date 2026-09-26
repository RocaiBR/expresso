const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function main (){
    console.log(`testando API em ${BASE_URL}\n`);

    console.log('1) Verificando /health...');
    const health = await fetch(`${BASE_URL}/health`).then((r) => r.json()).catch(() => null);

    if (!health || health.banco !== 'conectado') {
        console.error(' 𓏵 Servidor ou banco não responderam como esperando. 𓏵');
        console.error(' ⚠ Confira se  " npm run dev " está rodando e se o MuSQL está ligado ⚠');
        console.error(' Resposta recebida:', health);
        process.exit(1);
    }

    console.log(` ✔ API no ar, banco "${health.banco_nome}" conectado\n`);

    const titulosTeste = `Teste automático ${new Date().toISOString()}`;
    console.log (`2) Eviando POST /tarefas com título: "${tituloTeste}"...`);

    const respotaCriar = await fetch(`${BASE_URL}/tarefas`,{
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            titulo: titulosTeste,
            descricao: 'Registro criado pelo script de teste.',
            responsavel: 'script-teste',
            status: 'pendente',
        }),
    });

    if(respotaCriar.status !== 201){
        console.error(`𓏵 Esperava status 201 e recebi ${respostaCriar.status}.𓏵`);
        console.error(await respostaCriar.text());
        process.exit(1);    
    }

    const tarefaCriada = await respostaCriar.json();
    console.log (`✔ Servidor aceitou os dados e devolveu id ${tarefaCriada.id}.\n`);

    console.log(`3) Buscando Get /tarefas/${tarefaCriada.id} para conferir se foi gravado ...`);
    const respostaBuscar = await fetch (`${BASE_URL}/tarefas/${tarefaCriada.id}`);
    const tarefaSalva = await respostaBuscar.json();

    if (respostaBuscar.status === 200 && tarefaSalva.titulo === tituloTeste) {
        console.log('✔ Dados confirmados no banco:', tarefaSala);
        console.log('\n ✮ Teste passou: o servidor está recebendo e gravando dados novos corretamente.\n');
        console.log(`Obs: essa tarefa de teste (id ${tarefaCriada.id}) ficou salva no banco.`);
        console.log(`Se quiser remover, rode:curl -X DELETE ${BASE_URL}/tarefas/${tarefaCriada.id}`)
    } else {
        console.log('𓏵 Não encotrei de volta os dados esperando no banco.');
        console.log('Resposta:',tarefaSalva);
        process.exit(1);
    }
}

main().catch((erro) => {
    console.error('𓏵 Erro inesperado ao rodar o teste:', erro.menssage);
    process.exit(1);
})
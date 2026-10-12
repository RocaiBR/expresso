require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.servidor') });
const fs = require('fs');
const path = require('path');
const { db, FieldValue, proximoId, descreverBanco } = require('../src/config/firebase');

const CAMINHO_CSV = path.join(__dirname, '..', 'dados', 'tarefas_iniciais.csv');

function parsearCSV(conteudo) {
    const linhas = conteudo.trim().split('\n');
    const cabecalho = linhas[0].split(',').map((campo) => campo.trim());

    return linhas.slice(1).map((linha) => {
        const valores = linha.split(',').map((valor) => valor.trim());
        const objeto = {};
        cabecalho.forEach((campo, indice) => {
            objeto[campo] = valores[indice];
        });
        return objeto;
    });
}

async function importar() {
    console.log(`Lendo arquivo: ${CAMINHO_CSV}`);
    const conteudo = fs.readFileSync(CAMINHO_CSV, 'utf-8');
    const tarefas = parsearCSV(conteudo);

    console.log(`${tarefas.length} tarefas encontradas no CSV. Inserindo no ${descreverBanco()}...`);

    let inseridos = 0;
    for (const tarefa of tarefas) {
        await db.runTransaction(async (transacao) => {
            const id = await proximoId(transacao, 'tarefas');
            transacao.set(db.collection('tarefas').doc(String(id)), {
                id,
                titulo: tarefa.titulo,
                descricao: tarefa.descricao,
                responsavel: tarefa.responsavel,
                participantes: null,
                usuario_id: null,
                status: tarefa.status,
                prioridade: 'medio',
                data_inicio: null,
                data_conclusao: null,
                criado_em: FieldValue.serverTimestamp(),
                finalizado_em: null,
            });
        });
        inseridos += 1;
    }

    console.log(`Importação concluída: ${inseridos} tarefas inseridas.`);
    process.exit(0);
}

importar().catch((erro) => {
    console.error('Erro ao importar CSV:', erro);
    process.exit(1);
});

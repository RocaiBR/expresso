const { db, bucket, Timestamp } = require('../config/firebase');
const { verificarPrazos, hojeEmSaoPaulo } = require('./prazos');
const { STATUS_VALIDOS, PRIORIDADES_VALIDAS, STATUS_ABERTOS, STATUS_FINAIS, normalizarEmail } = require('./validacoes');

const HORAS_PARA_ABANDONAR_ENVIO = 24;

async function limparEnviosAbandonados() {
    const limite = Date.now() - HORAS_PARA_ABANDONAR_ENVIO * 60 * 60 * 1000;
    const resultado = await db.collectionGroup('anexos').where('status', '==', 'enviando').get();
    let removidos = 0;
    for (const doc of resultado.docs) {
        const criado = doc.data().criado_em;
        if (!criado || criado.toMillis() > limite) continue;
        await bucket().file(doc.data().caminho).delete({ ignoreNotFound: true });
        await doc.ref.delete();
        removidos++;
    }
    return { enviando: resultado.size, removidos };
}

async function apagarVencidos(colecao) {
    const vencidos = await db.collection(colecao).where('expira_em', '<', Timestamp.now()).get();
    await Promise.all(vencidos.docs.map((doc) => doc.ref.delete()));
    return vencidos.size;
}

async function corrigirContadores() {
    const corrigidos = {};
    for (const colecao of ['tarefas', 'usuarios']) {
        const maior = await db.collection(colecao).orderBy('id', 'desc').limit(1).get();
        const maiorId = maior.empty ? 0 : maior.docs[0].data().id;
        const ref = db.collection('contadores').doc(colecao);
        const ajuste = await db.runTransaction(async (transacao) => {
            const atual = (await transacao.get(ref)).data()?.ultimo || 0;
            if (atual >= maiorId) return null;
            transacao.set(ref, { ultimo: maiorId });
            return { de: atual, para: maiorId };
        });
        if (ajuste) corrigidos[colecao] = ajuste;
    }
    return corrigidos;
}

async function etapa(nome, funcao, resultado) {
    try {
        resultado[nome] = await funcao();
    } catch (error) {
        resultado[nome] = { erro: error.message };
        console.error(`[MANUTENCAO] Falha na etapa "${nome}":`, error.message);
    }
}

async function executarRotinaDiaria() {
    const resultado = {};
    await etapa('contadores', corrigirContadores, resultado);
    await etapa('prazos', verificarPrazos, resultado);
    await etapa('anexos_abandonados', limparEnviosAbandonados, resultado);
    await etapa('sessoes_vencidas', () => apagarVencidos('sessoes'), resultado);
    await etapa('codigos_vencidos', () => apagarVencidos('recuperacoes'), resultado);
    console.log('[MANUTENCAO] Rotina diária:', JSON.stringify(resultado));
    return resultado;
}

async function verificarConsistencia() {
    const [tarefasDocs, usuariosDocs, contadoresDocs, enviando] = await Promise.all([
        db.collection('tarefas').get(),
        db.collection('usuarios').get(),
        db.collection('contadores').get(),
        db.collectionGroup('anexos').where('status', '==', 'enviando').get(),
    ]);
    const tarefas = tarefasDocs.docs.map((doc) => doc.data());
    const usuarios = usuariosDocs.docs.map((doc) => doc.data());
    const porId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
    const contador = (nome) => (contadoresDocs.docs.find((doc) => doc.id === nome)?.data().ultimo || 0);
    const hoje = hojeEmSaoPaulo();
    const rotulo = (tarefa) => `#${tarefa.id} ${tarefa.titulo}`;

    const verificacoes = [];
    function verificar(codigo, gravidade, descricao, encontrados, acao) {
        verificacoes.push({
            codigo, gravidade, descricao,
            quantidade: encontrados.length,
            exemplos: encontrados.slice(0, 5),
            acao: encontrados.length ? acao : null,
        });
    }

    const maiorTarefa = Math.max(0, ...tarefas.map((t) => t.id || 0));
    const maiorUsuario = Math.max(0, ...usuarios.map((u) => u.id || 0));
    verificar('contador_de_ids', 'erro', 'Contador de ids menor que o maior id já usado (o próximo cadastro sobrescreveria outro)',
        [
            ...(contador('tarefas') < maiorTarefa ? [`tarefas: contador ${contador('tarefas')}, maior id ${maiorTarefa}`] : []),
            ...(contador('usuarios') < maiorUsuario ? [`usuarios: contador ${contador('usuarios')}, maior id ${maiorUsuario}`] : []),
        ],
        'A rotina diária corrige sozinha (sobe o contador até o maior id).');

    verificar('sem_ti_ativo', 'erro', 'Nenhum usuário TI ativo (ninguém consegue administrar os usuários)',
        usuarios.some((u) => u.funcao === 'ti' && u.ativo) ? [] : ['nenhum TI ativo'],
        'Promover alguém a "ti" pelo Console do Firebase (Firestore > usuarios > funcao).');

    const emails = new Map();
    usuarios.forEach((u) => {
        const chave = normalizarEmail(u.email || '');
        emails.set(chave, [...(emails.get(chave) || []), u.id]);
    });
    verificar('email_duplicado', 'erro', 'E-mail usado por mais de um usuário (ignorando maiúsculas)',
        [...emails.entries()].filter(([, ids]) => ids.length > 1).map(([email, ids]) => `${email}: usuários ${ids.join(', ')}`),
        'Trocar o e-mail de um dos usuários na tela Usuários.');

    verificar('email_fora_do_padrao', 'alerta', 'E-mail com maiúsculas ou espaços (o padrão é minúsculo)',
        usuarios.filter((u) => u.email && u.email !== String(u.email).trim().toLowerCase()).map((u) => `#${u.id} ${u.email}`),
        'Salvar o usuário de novo pela tela Usuários (o e-mail é normalizado ao gravar).');

    verificar('usuario_sem_setor', 'alerta', 'Usuário sem setor (um gestor sem setor só enxerga as próprias atividades)',
        usuarios.filter((u) => !u.setor).map((u) => `#${u.id} ${u.nome} (${u.funcao || 'usuario'})`),
        'Definir o setor na tela Usuários.');

    verificar('tarefa_sem_responsavel', 'alerta', 'Atividade sem responsável vinculado (só o TI enxerga)',
        tarefas.filter((t) => t.usuario_id == null).map(rotulo),
        'Passar para alguém em Atividades > Selecionar > Passar para.');

    verificar('responsavel_inexistente_ou_inativo', 'alerta', 'Atividade aberta cujo responsável foi excluído ou está inativo',
        tarefas.filter((t) => STATUS_ABERTOS.includes(t.status) && t.usuario_id != null &&
            !(porId.get(t.usuario_id) && porId.get(t.usuario_id).ativo)).map(rotulo),
        'Passar para outro responsável.');

    verificar('participante_inexistente', 'info', 'Participante que não existe mais (o nome continua no histórico)',
        tarefas.filter((t) => (t.participantes_ids || []).some((id) => !porId.has(id))).map(rotulo),
        'Opcional: atualizar os participantes da atividade.');

    verificar('status_ou_prioridade_invalidos', 'erro', 'Status ou prioridade fora da lista permitida',
        tarefas.filter((t) => !STATUS_VALIDOS.includes(t.status) || !PRIORIDADES_VALIDAS.includes(t.prioridade))
            .map((t) => `${rotulo(t)} (status "${t.status}", prioridade "${t.prioridade}")`),
        'Corrigir o valor pela API ou pelo Console do Firebase.');

    verificar('datas_invertidas', 'alerta', 'Vencimento antes da data de início',
        tarefas.filter((t) => t.data_inicio && t.data_conclusao && t.data_conclusao < t.data_inicio)
            .map((t) => `${rotulo(t)} (${t.data_inicio} > ${t.data_conclusao})`),
        'Corrigir as datas da atividade.');

    verificar('prazo_vencido_sem_marcacao', 'alerta', 'Atividade aberta com prazo vencido que ainda não virou urgente',
        tarefas.filter((t) => STATUS_ABERTOS.includes(t.status) && t.data_conclusao && t.data_conclusao < hoje && !t.atrasada).map(rotulo),
        'Rodar a rotina diária (POST /manutencao/rotina-diaria) ou esperar as 00:05.');

    verificar('encerrada_sem_data_de_fim', 'info', 'Concluída/cancelada sem "finalizado_em" (encerradas antes de o campo existir; ficam fora do backlog e do tempo médio)',
        tarefas.filter((t) => STATUS_FINAIS.includes(t.status) && !t.finalizado_em).map(rotulo),
        'Nada a fazer: é histórico anterior ao campo.');

    const limiteEnvio = Date.now() - HORAS_PARA_ABANDONAR_ENVIO * 60 * 60 * 1000;
    verificar('anexo_abandonado', 'alerta', `Anexo "enviando" há mais de ${HORAS_PARA_ABANDONAR_ENVIO} h (nunca foi confirmado)`,
        enviando.docs.filter((doc) => doc.data().criado_em && doc.data().criado_em.toMillis() < limiteEnvio)
            .map((doc) => `${doc.ref.parent.parent.id}/${doc.data().nome}`),
        'A rotina diária remove sozinha.');

    const problemas = verificacoes.filter((v) => v.quantidade > 0 && v.gravidade !== 'info').length;
    return {
        gerado_em: new Date().toISOString(),
        totais: { tarefas: tarefas.length, usuarios: usuarios.length },
        problemas,
        verificacoes,
    };
}

module.exports = { executarRotinaDiaria, limparEnviosAbandonados, verificarConsistencia };

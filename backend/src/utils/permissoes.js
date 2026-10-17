/* Regras de acesso por cargo ("funcao" do usuário). Todas as permissões do sistema saem daqui.

usuario (padrão): vê as atividades atribuídas a ele; cria atividades só para si mesmo e
                  edita/exclui as que criou. Nas que um gestor atribuiu, só muda o status e anexa.

gestor:           tudo do usuário padrão; vê as atividades do seu setor; atribui atividades
                    aos usuários padrão do setor e edita/exclui as deles e as que criou.

ti:               acesso total, inclusive ao cadastro de usuários.
  */
const { db } = require('../config/firebase');

const FUNCOES = ['usuario', 'gestor', 'ti'];

const NENHUMA = { ver: false, status: false, editar: false, excluir: false };
const TODAS = { ver: true, status: true, editar: true, excluir: true };

// Pessoas do setor do gestor: id -> dados do usuário
async function equipeDoSetor(setor) {
    if (!setor) return new Map();
    const resultado = await db.collection('usuarios').where('setor', '==', setor).get();
    return new Map(resultado.docs.map((doc) => [doc.data().id, doc.data()]));
}

// O que "usuario" pode fazer com "tarefa". "equipe" só é usada para gestor (equipeDoSetor).
function permissoesDaTarefa(usuario, tarefa, equipe = new Map()) {
    if (usuario.funcao === 'ti') return TODAS;

    const ehResponsavel = tarefa.usuario_id === usuario.id;
    const criou = tarefa.criado_por === usuario.id;

    if (usuario.funcao === 'gestor') {
        const responsavel = equipe.get(tarefa.usuario_id);
        const usuarioPadraoDoSetor = Boolean(responsavel) && (responsavel.funcao || 'usuario') === 'usuario';
        if (ehResponsavel || criou || usuarioPadraoDoSetor) return TODAS;
        // Atividades de outro gestor do mesmo setor: só acompanha (entram no relatório do setor)
        return responsavel ? { ...NENHUMA, ver: true } : NENHUMA;
    }

    if (ehResponsavel && criou) return TODAS;
    if (ehResponsavel) return { ...NENHUMA, ver: true, status: true };
    return NENHUMA;
}

// Todas as atividades que o usuário pode ver, já com a equipe usada nas permissões
async function tarefasVisiveis(usuario) {
    const tarefas = db.collection('tarefas');

    if (usuario.funcao === 'ti') {
        return { docs: (await tarefas.get()).docs, equipe: new Map() };
    }
    if (usuario.funcao !== 'gestor') {
        return { docs: (await tarefas.where('usuario_id', '==', usuario.id).get()).docs, equipe: new Map() };
    }

    // Gestor: as do setor (o Firestore aceita até 30 valores por "in") + as que ele criou
    const equipe = await equipeDoSetor(usuario.setor);
    const ids = [...new Set([usuario.id, ...equipe.keys()])];
    const consultas = [tarefas.where('criado_por', '==', usuario.id).get()];
    for (let i = 0; i < ids.length; i += 30) {
        consultas.push(tarefas.where('usuario_id', 'in', ids.slice(i, i + 30)).get());
    }
    const porId = new Map();
    for (const resultado of await Promise.all(consultas)) {
        resultado.docs.forEach((doc) => porId.set(doc.id, doc));
    }
    return { docs: [...porId.values()], equipe };
}

// Uma atividade com as permissões do usuário; null se não existe ou ele não pode ver
async function carregarTarefa(usuario, id) {
    if (!/^\d+$/.test(String(id))) return null;
    const doc = await db.collection('tarefas').doc(String(id)).get();
    if (!doc.exists) return null;

    const equipe = usuario.funcao === 'gestor' ? await equipeDoSetor(usuario.setor) : new Map();
    const permissoes = permissoesDaTarefa(usuario, doc.data(), equipe);
    return permissoes.ver ? { doc, permissoes } : null;
}

function podeAtribuirA(usuario, alvo) {
    if (usuario.funcao === 'ti') return true;
    if (alvo.id === usuario.id) return true;
    return usuario.funcao === 'gestor'
        && Boolean(usuario.setor)
        && alvo.setor === usuario.setor
        && (alvo.funcao || 'usuario') === 'usuario';
}

// Confere se a atividade pode ser atribuída a "alvoId"; devolve os dados do responsável ou o erro
async function validarResponsavel(usuario, alvoId) {
    const doc = /^\d+$/.test(String(alvoId))
        ? await db.collection('usuarios').doc(String(alvoId)).get()
        : null;
    if (!doc || !doc.exists || !doc.data().ativo) {
        return { erro: 'Responsável não encontrado ou inativo.' };
    }
    if (!podeAtribuirA(usuario, doc.data())) {
        return {
            erro: usuario.funcao === 'gestor'
                ? 'Você só pode atribuir atividades a si mesmo e aos usuários padrão do seu setor.'
                : 'Você só pode atribuir atividades a si mesmo.',
        };
    }
    return { responsavel: doc.data() };
}

// Pessoas que podem ser escolhidas como responsável na tela de nova atividade
async function usuariosAtribuiveis(usuario) {
    let candidatos;
    if (usuario.funcao === 'ti') {
        candidatos = (await db.collection('usuarios').get()).docs.map((doc) => doc.data());
    } else if (usuario.funcao === 'gestor') {
        candidatos = [...(await equipeDoSetor(usuario.setor)).values()];
    } else {
        candidatos = [];
    }
    const lista = candidatos.filter((alvo) => alvo.ativo && alvo.id !== usuario.id && podeAtribuirA(usuario, alvo));
    const eu = { id: usuario.id, nome: usuario.nome, setor: usuario.setor, funcao: usuario.funcao };
    return [eu, ...lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))]
        .map(({ id, nome, setor, funcao }) => ({ id, nome, setor: setor || null, funcao: funcao || 'usuario' }));
}

module.exports = {
    FUNCOES,
    permissoesDaTarefa,
    tarefasVisiveis,
    carregarTarefa,
    validarResponsavel,
    usuariosAtribuiveis,
};

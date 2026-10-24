const path = require('path');
const {
    STATUS_VALIDOS, PRIORIDADES_VALIDAS, SETORES_VALIDOS, TAMANHO_MINIMO_SENHA, FORMATO_EMAIL,
    FORMATO_LOGIN, LIMITES_TAREFA, FUNCOES, vazioParaNulo, normalizarEmail, dataValida, normalizarOpcao,
} = require('../src/utils/validacoes');

const LIMITE_DO_LOTE = 500; 

// DATE do MySQL chega como "AAAA-MM-DD" (dateStrings); TIMESTAMP chega como Date
function paraData(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const data = valor instanceof Date ? valor : new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
}

function planejarMigracao({ usuariosMysql, tarefasMysql, usuariosFirestore, totalTarefasFirestore, contadores }, opcoes = {}) {
    const camposDoPrazo = opcoes.camposDoPrazo || (() => null);
    const erros = [];
    const avisos = [];
    const escritas = [];  
    const remocoes = [];  
    const realocados = []; 

    if (totalTarefasFirestore > 0) {
        erros.push(`o Firestore já tem ${totalTarefasFirestore} tarefa(s): os ids do MySQL poderiam sobrescrever alguma`);
    }

    // ---- Usuários
    const usuarios = [];
    const emails = new Map();
    for (const u of usuariosMysql) {
        const quem = `usuário MySQL #${u.id}`;
        const nome = vazioParaNulo(u.nome);
        const email = u.email ? normalizarEmail(u.email) : null;
        const funcao = vazioParaNulo(u.funcao) ? normalizarOpcao(u.funcao) : 'usuario';
        let login = vazioParaNulo(u.usuario);
        let setor = vazioParaNulo(u.setor);

        if (!nome) erros.push(`${quem}: sem nome`);
        if (!email || !FORMATO_EMAIL.test(email)) erros.push(`${quem}: e-mail inválido "${u.email}"`);
        if (!FUNCOES.includes(funcao)) erros.push(`${quem}: função desconhecida "${u.funcao}"`);
        if (!u.senha) erros.push(`${quem}: sem senha`);
        if (email && emails.has(email)) erros.push(`${quem}: e-mail ${email} repetido (também é do #${emails.get(email)})`);
        if (email) emails.set(email, u.id);

        if (email && u.email !== email) avisos.push(`${quem}: e-mail "${u.email}" gravado como "${email}"`);
        if (login && !FORMATO_LOGIN.test(login)) {
            avisos.push(`${quem}: login "${login}" tem caracteres não aceitos; ficou sem login (entra pelo e-mail)`);
            login = null;
        }
        if (setor && !SETORES_VALIDOS.includes(setor.toUpperCase())) {
            avisos.push(`${quem}: setor desconhecido "${setor}"; ficou sem setor`);
            setor = null;
        }
        if (u.senha && String(u.senha).length < TAMANHO_MINIMO_SENHA) {
            avisos.push(`${quem}: senha com menos de ${TAMANHO_MINIMO_SENHA} caracteres (mantida para não bloquear o acesso; peça para trocar em "Meu perfil")`);
        }

        const usuario = {
            id: u.id, nome, usuario: login, email, senha: u.senha,
            setor: setor ? setor.toUpperCase() : null, funcao, ativo: Boolean(u.ativo), criado_em: paraData(u.criado_em),
        };
        if (vazioParaNulo(u.cargo)) usuario.cargo = u.cargo.trim();
        usuarios.push(usuario);
    }
    const idsMysql = new Set(usuarios.map((u) => u.id));
    const loginsMysql = new Set(usuarios.map((u) => u.usuario).filter(Boolean).map((l) => l.toLowerCase()));

    let ultimoUsuario = Math.max(contadores.usuarios || 0, 0, ...usuarios.map((u) => u.id));
    for (const atual of usuariosFirestore) {
        if (atual.email && emails.has(normalizarEmail(atual.email))) {
            erros.push(`o e-mail ${atual.email} existe nos dois bancos (Firestore #${atual.id} e MySQL #${emails.get(normalizarEmail(atual.email))})`);
            continue;
        }
        const loginColide = atual.usuario && loginsMysql.has(atual.usuario.toLowerCase());
        if (!idsMysql.has(atual.id) && !loginColide) continue;
        ultimoUsuario += 1;
        const novoLogin = loginColide ? `${atual.usuario}.firebase` : atual.usuario;
        realocados.push({ de: atual.id, para: ultimoUsuario, login: novoLogin });
        escritas.push({ caminho: `usuarios/${ultimoUsuario}`, dados: { ...atual, id: ultimoUsuario, usuario: novoLogin } });
        if (!idsMysql.has(atual.id)) remocoes.push(`usuarios/${atual.id}`);
    }
    usuarios.forEach((u) => escritas.push({ caminho: `usuarios/${u.id}`, dados: u }));

    // ---- Tarefas
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    const porNome = new Map();
    usuarios.forEach((u) => porNome.set(normalizarOpcao(u.nome || ''), [...(porNome.get(normalizarOpcao(u.nome || '')) || []), u]));
    let maiorTarefa = 0;
    for (const t of tarefasMysql) {
        const qual = `tarefa MySQL #${t.id}`;
        maiorTarefa = Math.max(maiorTarefa, t.id);
        const titulo = vazioParaNulo(t.titulo);
        const status = vazioParaNulo(t.status) ? normalizarOpcao(t.status) : 'pendente';
        const prioridade = vazioParaNulo(t.prioridade) ? normalizarOpcao(t.prioridade) : 'medio';
        if (!titulo) erros.push(`${qual}: sem título`);
        if (titulo && titulo.length > LIMITES_TAREFA.titulo) erros.push(`${qual}: título com mais de ${LIMITES_TAREFA.titulo} caracteres`);
        if (!STATUS_VALIDOS.includes(status)) erros.push(`${qual}: status desconhecido "${t.status}"`);
        if (!PRIORIDADES_VALIDAS.includes(prioridade)) erros.push(`${qual}: prioridade desconhecida "${t.prioridade}"`);
        const datas = {};
        for (const campo of ['data_inicio', 'data_conclusao']) {
            datas[campo] = vazioParaNulo(t[campo]);
            if (datas[campo] && !dataValida(datas[campo])) erros.push(`${qual}: ${campo} inválida "${t[campo]}"`);
        }
        if (datas.data_inicio && datas.data_conclusao && datas.data_conclusao < datas.data_inicio) {
            avisos.push(`${qual}: vencimento (${datas.data_conclusao}) antes do início (${datas.data_inicio}); mantido como veio`);
        }
        const descricao = vazioParaNulo(t.descricao);
        if (descricao && descricao.length > LIMITES_TAREFA.descricao) {
            avisos.push(`${qual}: descrição com ${descricao.length} caracteres (a tela aceita até ${LIMITES_TAREFA.descricao}); mantida inteira`);
        }

        let usuarioId = t.usuario_id ?? null;
        let responsavel = vazioParaNulo(t.responsavel);
        if (usuarioId !== null && !porId.has(usuarioId)) {
            avisos.push(`${qual}: responsável #${usuarioId} não existe no MySQL; ficou só o nome "${responsavel || '-'}"`);
            usuarioId = null;
        }
        if (usuarioId === null && responsavel && (porNome.get(normalizarOpcao(responsavel)) || []).length === 1) {
            usuarioId = porNome.get(normalizarOpcao(responsavel))[0].id;
            avisos.push(`${qual}: responsável "${responsavel}" ligado ao usuário #${usuarioId} pelo nome`);
        } else if (usuarioId === null) {
            avisos.push(`${qual}: sem responsável vinculado (só o TI vai enxergar até alguém assumir)`);
        }
        if (usuarioId !== null) responsavel = porId.get(usuarioId).nome;

        const participantes = vazioParaNulo(t.participantes);
        const participantesIds = [];
        for (const nome of (participantes || '').split(',').map((n) => n.trim()).filter(Boolean)) {
            const iguais = porNome.get(normalizarOpcao(nome)) || [];
            if (iguais.length === 1) participantesIds.push(iguais[0].id);
            else avisos.push(`${qual}: participante "${nome}" não é um usuário; fica só no texto`);
        }

        const tarefa = {
            id: t.id, titulo, descricao, responsavel, participantes, participantes_ids: [...new Set(participantesIds)],
            usuario_id: usuarioId, criado_por: null, status, prioridade,
            data_inicio: datas.data_inicio, data_conclusao: datas.data_conclusao,
            criado_em: paraData(t.criado_em), finalizado_em: paraData(t.finalizado_em),
        };
        Object.assign(tarefa, camposDoPrazo(tarefa) || {});
        escritas.push({ caminho: `tarefas/${t.id}`, dados: tarefa });
    }

    const novosContadores = {
        usuarios: ultimoUsuario,
        tarefas: Math.max(contadores.tarefas || 0, maiorTarefa),
    };
    escritas.push({ caminho: 'contadores/usuarios', dados: { ultimo: novosContadores.usuarios } });
    escritas.push({ caminho: 'contadores/tarefas', dados: { ultimo: novosContadores.tarefas } });
    if (escritas.length + remocoes.length > LIMITE_DO_LOTE) {
        erros.push(`são ${escritas.length + remocoes.length} gravações; o lote único aceita até ${LIMITE_DO_LOTE}`);
    }

    return {
        erros, avisos, escritas, remocoes, realocados, contadores: novosContadores,
        resumo: { usuarios: usuarios.length, tarefas: tarefasMysql.length, realocados: realocados.length, avisos: avisos.length, erros: erros.length },
    };
}

async function aplicarPlano(db, plano) {
    if (plano.erros.length) throw new Error('o plano tem erros; nada foi gravado');
    const lote = db.batch();
    plano.escritas.forEach(({ caminho, dados }) => lote.set(db.doc(caminho), dados));
    plano.remocoes.forEach((caminho) => lote.delete(db.doc(caminho)));
    await lote.commit();
    for (const { de } of plano.realocados) {
        for (const colecao of ['sessoes', 'notificacoes']) {
            const docs = await db.collection(colecao).where('usuario_id', '==', de).get();
            await Promise.all(docs.docs.map((doc) => doc.ref.delete()));
        }
        await db.doc(`recuperacoes/${de}`).delete();
    }
}

async function main() {
    const aplicar = process.argv.includes('--aplicar');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.mysql.antigo') });
    const credenciais = {
        host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    };
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.servidor') });
    if (!credenciais.host || !credenciais.database) {
        throw new Error('preencha backend/.env.mysql.antigo com DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME');
    }

    let mysql;
    try {
        mysql = require('mysql2/promise');
    } catch (erro) {
        throw new Error('instale o driver do MySQL: npm install (na pasta backend)');
    }
    const conexao = await mysql.createConnection({ ...credenciais, dateStrings: ['DATE'] });
    const [usuariosMysql] = await conexao.query('SELECT * FROM usuarios ORDER BY id');
    const [tarefasMysql] = await conexao.query('SELECT * FROM tarefas ORDER BY id');
    await conexao.end();

    const { db, descreverBanco } = require('../src/config/firebase');
    const { camposDoPrazo } = require('../src/utils/prazos');
    const [usuariosFs, tarefasFs, contadoresFs] = await Promise.all(
        ['usuarios', 'tarefas', 'contadores'].map((colecao) => db.collection(colecao).get())
    );
    const contador = (nome) => contadoresFs.docs.find((doc) => doc.id === nome)?.data().ultimo || 0;
    const plano = planejarMigracao({
        usuariosMysql, tarefasMysql,
        usuariosFirestore: usuariosFs.docs.map((doc) => doc.data()),
        totalTarefasFirestore: tarefasFs.size,
        contadores: { usuarios: contador('usuarios'), tarefas: contador('tarefas') },
    }, { camposDoPrazo });

    console.log(`MySQL ${credenciais.database} -> ${descreverBanco()} ${aplicar ? '(GRAVANDO)' : '(SIMULAÇÃO: nada será gravado)'}\n`);
    plano.realocados.forEach((r) => console.log(`  usuário do Firestore #${r.de} -> #${r.para} (login "${r.login}"; e-mail e senha mantidos)`));
    console.log(`  ${plano.resumo.usuarios} usuário(s) e ${plano.resumo.tarefas} tarefa(s) do MySQL, com os mesmos ids`);
    console.log(`  contadores: usuarios.ultimo=${plano.contadores.usuarios}, tarefas.ultimo=${plano.contadores.tarefas}`);
    if (plano.avisos.length) console.log(`\nAvisos (${plano.avisos.length}):\n${plano.avisos.map((a) => '  - ' + a).join('\n')}`);
    if (plano.erros.length) {
        console.log(`\nErros (${plano.erros.length}), corrija no MySQL e rode de novo:\n${plano.erros.map((e) => '  - ' + e).join('\n')}`);
        console.log(`[MIGRACAO] ${JSON.stringify({ aplicada: false, ...plano.resumo })}`);
        process.exit(1);
    }
    if (!aplicar) {
        console.log('\nPara gravar, rode de novo com: npm run migrar:mysql -- --aplicar');
        return;
    }
    await aplicarPlano(db, plano);
    console.log(`\nMigração concluída.\n[MIGRACAO] ${JSON.stringify({ aplicada: true, ...plano.resumo })}`);
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((erro) => {
            console.error('Migração interrompida, nada foi gravado:', erro.message);
            process.exit(1);
        });
}

module.exports = { planejarMigracao, aplicarPlano };

const { chamar, login, token, criarPrimeiroTI, diaEmSaoPaulo } = require('../apoio');
const { planejarMigracao, aplicarPlano } = require('../../scripts/migrarMysql');

function bancoDoEmulador() {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    process.env.PROJETO_FIREBASE = 'demo-expresso';
    return require('../../src/config/firebase').db;
}

async function estadoDoFirestore(db) {
    const [usuarios, tarefas, contadores] = await Promise.all(['usuarios', 'tarefas', 'contadores'].map((c) => db.collection(c).get()));
    const contador = (nome) => contadores.docs.find((doc) => doc.id === nome)?.data().ultimo || 0;
    return {
        usuariosFirestore: usuarios.docs.map((doc) => doc.data()),
        totalTarefasFirestore: tarefas.size,
        contadores: { usuarios: contador('usuarios'), tarefas: contador('tarefas') },
    };
}

const quando = (texto) => new Date(texto);
const USUARIOS_MYSQL = [
    { id: 1, nome: 'Administrador', email: 'Admin@PI.com', senha: 'adm123', criado_em: quando('2025-08-20T13:00:00Z'), cargo: 'Coordenação', usuario: 'admin', setor: null, funcao: 'gestor', ativo: 1 },
    { id: 2, nome: 'Usuário Teste', email: 'teste@pi.com', senha: 'teste1', criado_em: quando('2025-08-21T13:00:00Z'), cargo: null, usuario: null, setor: 'pcp', funcao: 'usuario', ativo: 1 },
    { id: 7, nome: 'Cassiano Godoy', email: 'cassiano@pi.com', senha: '123', criado_em: quando('2025-09-02T13:00:00Z'), cargo: '', usuario: 'Cassiano', setor: 'ENGENHARIA', funcao: 'gestor', ativo: 1 },
];
const tarefaMysql = (id, campos) => ({
    id, titulo: `Tarefa ${id}`, descricao: '', responsavel: null, usuario_id: null, status: 'pendente',
    criado_em: quando('2025-09-10T12:00:00Z'), prioridade: 'medio', data_inicio: null, participantes: null, data_conclusao: null, finalizado_em: null, ...campos,
});
const TAREFAS_MYSQL = [
    tarefaMysql(2, { titulo: 'Levantamento de requisitos', responsavel: 'Cassiano Godoy', usuario_id: 7, status: 'concluido', finalizado_em: quando('2025-09-15T18:00:00Z') }),
    tarefaMysql(3, { titulo: 'Modelagem do banco', responsavel: 'usuário teste', status: 'Cancelado ', prioridade: 'Alto' }),
    tarefaMysql(4, { titulo: 'Reunião com o cliente', responsavel: 'Equipe', participantes: 'Administrador, Pessoa de Fora' }),
    tarefaMysql(5, { titulo: 'Rotas da API', responsavel: 'Ex-funcionário', usuario_id: 5, status: 'em andamento' }),
    tarefaMysql(6, { titulo: 'Datas digitadas trocadas', usuario_id: 2, data_inicio: '2025-10-10', data_conclusao: '2025-10-01', status: 'concluido' }),
    tarefaMysql(9, { titulo: 'Testes com Postman', usuario_id: 7, data_conclusao: diaEmSaoPaulo(-3) }),
];

module.exports = {
    nome: 'Migração MySQL → Firestore',
    descricao: 'Os dados do backend antigo entram com os mesmos ids, senhas e datas; o que não fecha é avisado ou impede a gravação (tudo ou nada).',

    async executar(t) {
        const db = bancoDoEmulador();
        const tokenAntigo = await criarPrimeiroTI();

        // ---- Dados que impedem a migração: nada pode ser gravado
        const ruim = planejarMigracao({
            ...(await estadoDoFirestore(db)),
            usuariosMysql: [...USUARIOS_MYSQL, { ...USUARIOS_MYSQL[1], id: 8, email: 'TINA@teste.com' }],
            tarefasMysql: [...TAREFAS_MYSQL, tarefaMysql(10, { status: 'feito', data_inicio: '2025-02-30' })],
        });
        t.anexar('Erros que impedem a migração (dados de exemplo com problemas)', ruim.erros);
        t.conferir(ruim.erros.some((e) => e.includes('tina@teste.com existe nos dois bancos')), 'e-mail que existe nos dois bancos (comparado sem maiúsculas): erro');
        t.conferir(ruim.erros.some((e) => e.includes('status desconhecido "feito"')), 'status desconhecido: erro');
        t.conferir(ruim.erros.some((e) => e.includes('data_inicio inválida')), 'data que não existe (30/02): erro');
        let recusou = false;
        try { await aplicarPlano(db, ruim); } catch (erro) { recusou = true; }
        t.conferir(recusou && (await db.collection('tarefas').get()).empty, 'plano com erro não grava nada (tudo ou nada)');

        // ---- Migração válida
        const plano = planejarMigracao({ ...(await estadoDoFirestore(db)), usuariosMysql: USUARIOS_MYSQL, tarefasMysql: TAREFAS_MYSQL },
            { camposDoPrazo: require('../../src/utils/prazos').camposDoPrazo });
        t.anexar('Avisos da migração (gravados, para corrigir depois)', plano.avisos);
        t.conferir(plano.erros.length === 0, 'dados de exemplo sem erros que impeçam a migração');
        const aviso = (trecho) => plano.avisos.some((a) => a.includes(trecho));
        t.conferir(aviso('"Admin@PI.com" gravado como "admin@pi.com"'), 'e-mail padronizado em minúsculas (com aviso)');
        t.conferir(aviso('#7: senha com menos de 6'), 'senha curta mantida, com aviso para trocar (não bloqueia o acesso)');
        t.conferir(aviso('responsável "usuário teste" ligado ao usuário #2 pelo nome'), 'responsável sem id ligado ao usuário pelo nome');
        t.conferir(aviso('responsável #5 não existe'), 'responsável que não existe mais: fica só o nome');
        t.conferir(aviso('participante "Pessoa de Fora" não é um usuário'), 'participante de texto livre que não é usuário: avisado');
        t.conferir(aviso('vencimento (2025-10-01) antes do início'), 'datas invertidas no histórico: mantidas, com aviso');
        t.conferir(plano.realocados.length === 1 && plano.realocados[0].de === 1 && plano.realocados[0].para === 8,
            'a Tina, que já estava no Firestore como #1, muda para #8 (o #1 é do MySQL)');

        await aplicarPlano(db, plano);
        t.conferir((await chamar(tokenAntigo, 'GET', '/tarefas')).status === 401, 'o login aberto da Tina com o id antigo é encerrado (o #1 agora é outra pessoa)');
        const tina = await login('tina');
        t.conferir(tina.token && tina.usuario.id === 8 && tina.usuario.funcao === 'ti', 'a Tina entra com o mesmo login e senha, agora como #8');
        const ti = tina.token;
        t.conferir(Boolean(await token('ADMIN@pi.com', 'adm123')) && Boolean(await token('Cassiano', '123')), 'usuários do MySQL entram com as senhas de antes');
        const usuarios = Object.fromEntries((await chamar(ti, 'GET', '/usuarios')).dados.map((u) => [u.id, u]));
        t.conferir(usuarios[2].setor === 'PCP' && usuarios[1].cargo === 'Coordenação' && usuarios[1].criado_em === '2025-08-20T13:00:00.000Z',
            'setor "pcp" → "PCP"; a coluna antiga "cargo" e a data de cadastro são preservadas');

        const tarefas = Object.fromEntries((await chamar(ti, 'GET', '/tarefas')).dados.map((x) => [x.id, x]));
        t.conferir(Object.keys(tarefas).join() === '2,3,4,5,6,9', 'as tarefas mantêm os ids do MySQL (2, 3, 4, 5, 6, 9)');
        t.conferir(tarefas[2].finalizado_em === '2025-09-15T18:00:00.000Z' && tarefas[2].criado_em === '2025-09-10T12:00:00.000Z',
            'datas de criação e de conclusão preservadas');
        t.conferir(tarefas[3].status === 'cancelado' && tarefas[3].prioridade === 'alto' && tarefas[3].usuario_id === 2 && tarefas[3].responsavel === 'Usuário Teste',
            '"Cancelado " e "Alto" padronizados; responsável ligado ao #2 com o nome do cadastro');
        t.conferir(tarefas[4].participantes_ids.join() === '1' && tarefas[4].participantes === 'Administrador, Pessoa de Fora',
            'participantes: o nome que é usuário vira id; o texto original fica no histórico');
        t.conferir(tarefas[9].prioridade === 'urgente' && tarefas[9].atrasada, 'aberta com prazo vencido: entra Urgente');
        t.conferir(tarefas[2].descricao === null, 'descrição vazia ("") vira null');
        t.conferir((await chamar(ti, 'POST', '/tarefas', { titulo: 'Primeira depois da migração' })).dados.id === 10 &&
            (await chamar(ti, 'POST', '/usuarios', { nome: 'Novo', email: 'novo@pi.com', senha: 'senha123' })).dados.id === 9,
        'os contadores continuam do maior id: próxima tarefa #10, próximo usuário #9');

        const consistencia = (await chamar(ti, 'GET', '/manutencao/consistencia')).dados;
        t.anexar('Verificação de consistência logo depois da migração', consistencia.verificacoes.filter((v) => v.quantidade > 0)
            .map(({ codigo, gravidade, quantidade, exemplos }) => ({ codigo, gravidade, quantidade, exemplos })));
        t.conferir(!consistencia.verificacoes.some((v) => v.gravidade === 'erro' && v.quantidade > 0),
            'nenhum problema grave depois da migração; os alertas (ex.: atividades sem responsável) ficam listados para a equipe');
    },
};

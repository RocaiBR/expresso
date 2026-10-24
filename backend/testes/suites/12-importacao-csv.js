const os = require('os');
const { spawnSync } = require('child_process');
const { fs, path, chamar, criarPrimeiroTI, criarUsuario, diaEmSaoPaulo } = require('../apoio');
const { decodificar, lerCsv, prepararLinha } = require('../../scripts/importarCsv');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'importarCsv.js');

function importar(...argumentos) {
    const saida = spawnSync(process.execPath, [SCRIPT, ...argumentos], {
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf8',
        env: {
            ...process.env,
            FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
            PROJETO_FIREBASE: 'demo-expresso',
            BUCKET_FIREBASE: 'demo-expresso.appspot.com',
        },
    });
    const linha = (saida.stdout.match(/^\[CSV\] (.*)$/m) || [])[1];
    return { codigo: saida.status, texto: saida.stdout + saida.stderr, resumo: linha ? JSON.parse(linha) : null };
}

module.exports = {
    nome: 'Importação de planilha CSV',
    descricao: 'Cada linha da planilha é convertida para o formato do sistema e conferida; as inválidas são recusadas com o motivo e as repetidas não duplicam.',

    async executar(t) {
        // ---- Leitura do arquivo (sem banco)
        t.conferir(decodificar(Buffer.from('﻿titulo\nJoão', 'utf8')) === 'titulo\nJoão', 'UTF-8 com BOM (Excel "CSV UTF-8"): o BOM é removido');
        t.conferir(decodificar(Buffer.from('titulo\nJoão', 'latin1')) === 'titulo\nJoão', 'Windows-1252 (Excel "CSV" em português): acentos lidos certo');
        const lido = lerCsv('Título;Descrição\r\n"Revisar; conferir";"Linha 1\nLinha ""2"""\r\n');
        t.conferir(lido.separador === ';' && lido.colunas.join() === 'titulo,descricao' && lido.linhas[0].valores.titulo === 'Revisar; conferir' &&
            lido.linhas[0].valores.descricao === 'Linha 1\nLinha "2"',
        'separador ";" detectado, cabeçalho com acento reconhecido, aspas com ";", quebra de linha e aspas dobradas');

        // ---- Transformação e validação de cada linha (sem banco)
        const usuarios = [{ id: 5, nome: 'Maria Souza', ativo: true }, { id: 6, nome: 'Pedro Inativo', ativo: false }];
        const preparar = (valores) => prepararLinha(valores, usuarios);
        let r = preparar({ titulo: '  Revisar planilha ', status: ' Concluída ', prioridade: 'ALTA', data_inicio: '05/03/2026', data_conclusao: '2026-03-09', responsavel: 'maria souza' });
        t.conferir(r.tarefa && r.tarefa.titulo === 'Revisar planilha' && r.tarefa.status === 'concluido' && r.tarefa.prioridade === 'alto' &&
            r.tarefa.data_inicio === '2026-03-05' && r.tarefa.usuario_id === 5 && r.tarefa.responsavel === 'Maria Souza',
        '" Concluída " → concluido, "ALTA" → alto, 05/03/2026 → 2026-03-05, "maria souza" ligado ao usuário #5');
        r = preparar({ titulo: 'Sem status' });
        t.conferir(r.tarefa.status === 'pendente' && r.tarefa.prioridade === 'medio' && r.tarefa.descricao === null, 'campos vazios: pendente, medio e null');
        r = preparar({ titulo: 'Responsável inativo', responsavel: 'Pedro Inativo' });
        t.conferir(r.tarefa.usuario_id === null && r.tarefa.responsavel === 'Pedro Inativo' && /não é um usuário ativo/.test(r.avisos[0]),
            'responsável inativo: fica só o nome, com aviso');
        for (const [valores, trecho, descricao] of [
            [{ titulo: '' }, 'título vazio', 'título vazio'],
            [{ titulo: 'X'.repeat(151) }, 'mais de 150', 'título com 151 caracteres'],
            [{ titulo: 'X', status: 'talvez' }, 'status "talvez"', 'status desconhecido'],
            [{ titulo: 'X', prioridade: 'altíssima' }, 'prioridade', 'prioridade desconhecida'],
            [{ titulo: 'X', data_conclusao: '31/02/2026' }, 'não é uma data válida', 'data que não existe (31/02)'],
            [{ titulo: 'X', data_inicio: '2026-03-10', data_conclusao: '2026-03-01' }, 'antes da data de início', 'vencimento antes do início'],
        ]) {
            r = preparar(valores);
            t.conferir(r.erros && r.erros.some((e) => e.includes(trecho)), `recusada: ${descricao} ("${r.erros && r.erros[0]}")`);
        }

        // ---- Importação de verdade no emulador
        const ti = await criarPrimeiroTI();
        await criarUsuario(ti, 'Maria Souza', 'maria', 'PCP', 'usuario');
        const ontem = diaEmSaoPaulo(-1).split('-').reverse().join('/');
        const planilha = [
            'Título;Descrição;Responsável;Status;Prioridade;data_inicio;data_conclusao',
            'Levantamento de requisitos;"Mapear fontes; regras";Maria Souza;Concluída;Alta;01/03/2026;10/03/2026',
            `Conferir estoque;;MARIA SOUZA;Em andamento;;;${ontem}`,
            'Integração com API externa;Feriados nacionais;Equipe;pendente;média;;',
            ';linha sem título;;;;;',
            'Testes;;Equipe;talvez;;;',
            'Datas trocadas;;;;;2026-05-10;2026-05-01',
        ].join('\r\n');
        const arquivo = path.join(os.tmpdir(), `expresso-teste-${Date.now()}.csv`);
        fs.writeFileSync(arquivo, Buffer.from(planilha, 'latin1')); // como o Excel em português salva
        try {
            const simulacao = importar(arquivo, '--simular');
            t.conferir(simulacao.codigo === 0 && simulacao.resumo.importadas === 3 && (await chamar(ti, 'GET', '/tarefas')).dados.length === 0,
                '--simular: mostra que 3 seriam importadas e não grava nada');
            const primeira = importar(arquivo);
            t.anexar('Saída do importador (npm run importar:csv)', primeira.texto.trim().split(/\r?\n/));
            t.conferir(primeira.resumo && primeira.resumo.importadas === 3 && primeira.resumo.recusadas === 3,
                `importação: ${primeira.resumo && primeira.resumo.importadas} importadas, ${primeira.resumo && primeira.resumo.recusadas} recusadas com o motivo e o número da linha`);
            const tarefas = (await chamar(ti, 'GET', '/tarefas')).dados;
            const porTitulo = Object.fromEntries(tarefas.map((x) => [x.titulo, x]));
            const req = porTitulo['Levantamento de requisitos'];
            t.conferir(req && req.descricao === 'Mapear fontes; regras' && req.status === 'concluido' && req.prioridade === 'alto' &&
                req.data_inicio === '2026-03-01' && req.responsavel === 'Maria Souza' && req.usuario_id === 2,
            'no banco: acentos certos, ";" dentro de aspas, status/prioridade/datas convertidos e responsável ligado à Maria (#2)');
            const estoque = porTitulo['Conferir estoque'];
            t.conferir(estoque && estoque.prioridade === 'urgente' && estoque.atrasada && estoque.prioridade_original === 'medio',
                'prazo vencido na planilha: a atividade já entra Urgente (regra do prazo aplicada na importação)');
            t.conferir(porTitulo['Integração com API externa'].usuario_id === null, '"Equipe" não é usuário: fica só o nome (a verificação de consistência aponta)');
            const segunda = importar(arquivo);
            t.conferir(segunda.resumo && segunda.resumo.importadas === 0 && segunda.resumo.repetidas === 3 &&
                (await chamar(ti, 'GET', '/tarefas')).dados.length === 3, 'importar o mesmo arquivo de novo não duplica (3 já existiam)');
            const nova = (await chamar(ti, 'POST', '/tarefas', { titulo: 'Depois da importação' })).dados;
            t.conferir(nova.id === 4, 'os ids da importação seguem o contador: a próxima atividade é a #4');
        } finally {
            fs.unlinkSync(arquivo);
        }
    },
};

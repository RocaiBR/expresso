const zlib = require('zlib');
const { fs, SITE, FIRESTORE, DONO, chamar, criarPrimeiroTI, diaEmSaoPaulo, entrarNoSite, violacoesDaPolitica } = require('../apoio');

// ---- Leitura do .xlsx (um .zip de XMLs), só o necessário para conferir o conteúdo
function lerZip(conteudo) {
    const arquivos = {};
    const fim = conteudo.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let posicao = conteudo.readUInt32LE(fim + 16);
    for (let i = 0; i < conteudo.readUInt16LE(fim + 10); i++) {
        const metodo = conteudo.readUInt16LE(posicao + 10);
        const tamanho = conteudo.readUInt32LE(posicao + 20);
        const tamanhoNome = conteudo.readUInt16LE(posicao + 28);
        const local = conteudo.readUInt32LE(posicao + 42);
        const nome = conteudo.toString('utf8', posicao + 46, posicao + 46 + tamanhoNome);
        const inicio = local + 30 + conteudo.readUInt16LE(local + 26) + conteudo.readUInt16LE(local + 28);
        const bruto = conteudo.subarray(inicio, inicio + tamanho);
        arquivos[nome] = (metodo === 8 ? zlib.inflateRawSync(bruto) : bruto).toString('utf8');
        posicao += 46 + tamanhoNome + conteudo.readUInt16LE(posicao + 30) + conteudo.readUInt16LE(posicao + 32);
    }
    return arquivos;
}

const textoXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function lerPlanilha(conteudo) {
    const zip = lerZip(conteudo);
    const compartilhados = [...(zip['xl/sharedStrings.xml'] || '').matchAll(/<si>([\s\S]*?)<\/si>/g)]
        .map((m) => textoXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    const destinos = Object.fromEntries([...zip['xl/_rels/workbook.xml.rels'].matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="([^"]+)"/g)]
        .map((m) => [m[1] || m[4], (m[2] || m[3]).replace(/^\/?(xl\/)?/, 'xl/')]));
    const abas = {};
    for (const [, atributosAba] of zip['xl/workbook.xml'].matchAll(/<sheet ([^>]*)\/?>/g)) {
        const nome = atributosAba.match(/\bname="([^"]+)"/)[1];
        const id = atributosAba.match(/\br:id="([^"]+)"/)[1];
        const linhas = [];
        for (const [, conteudoLinha] of zip[destinos[id]].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
            const linha = [];
            for (const [, atributos, interno] of conteudoLinha.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
                const coluna = atributos.match(/r="([A-Z]+)\d+"/)[1].split('').reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0) - 1;
                const tipo = (atributos.match(/t="([^"]+)"/) || [])[1];
                const v = ((interno || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
                let valor = null;
                if (tipo === 's') valor = compartilhados[Number(v)];
                else if (tipo === 'b') valor = v === '1';
                else if (tipo === 'inlineStr' || tipo === 'str') valor = textoXml(((interno || '').match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || v || '');
                else if (v !== undefined) valor = Number(v);
                linha[coluna] = valor;
            }
            linhas.push(linha);
        }
        abas[textoXml(nome)] = linhas;
    }
    return abas;
}

// Data do Excel (dias desde 30/12/1899) -> "AAAA-MM-DD"
const diaDoExcel = (numero) => new Date(Math.round((numero - 25569) * 86400000)).toISOString().slice(0, 10);

async function guardarFeriados(ano, lista) {
    const feriado = ({ date, name }) => ({ mapValue: { fields: { date: { stringValue: date }, name: { stringValue: name }, type: { stringValue: 'national' } } } });
    await fetch(`${FIRESTORE}/feriados/${ano}`, {
        method: 'PATCH', headers: DONO,
        body: JSON.stringify({ fields: {
            ano: { integerValue: String(ano) }, fonte: { stringValue: 'BrasilAPI' }, atualizado_em: { timestampValue: new Date().toISOString() },
            feriados: { arrayValue: { values: lista.map(feriado) } },
        } }),
    });
}

module.exports = {
    nome: 'Exportação dos relatórios (CSV, Excel, Power BI e PDF)',
    descricao: 'Na tela de Relatórios, cada formato é baixado pelo navegador, com a política de segurança ativa, e o arquivo é aberto e conferido: abas, colunas, datas, feriados e o texto do PDF.',
    usaNavegador: true,

    async executar(t) {
        // ---- Dados: 4 atividades criadas hoje e um feriado de teste num dia útil dos últimos 7 dias
        const ti = await criarPrimeiroTI();
        const criar = async (titulo, extra = {}) => (await chamar(ti, 'POST', '/tarefas', { titulo, ...extra })).dados;
        await criar('Conferir estoque', { prioridade: 'alto', data_conclusao: diaEmSaoPaulo(5) });
        const revisao = await criar('Revisão do relatório de produção');
        await chamar(ti, 'PUT', `/tarefas/${revisao.id}`, { status: 'em andamento' });
        const plano = await criar('Planejar produção');
        await chamar(ti, 'PUT', `/tarefas/${plano.id}`, { status: 'concluido' });
        const cancelada = await criar('Atividade cancelada');
        await chamar(ti, 'PUT', `/tarefas/${cancelada.id}`, { status: 'cancelado' });

        const dias = Array.from({ length: 7 }, (_, i) => diaEmSaoPaulo(i - 6));
        const diaDaSemana = (dia) => new Date(`${dia}T12:00:00Z`).getUTCDay();
        const feriadoDeTeste = dias.find((dia) => diaDaSemana(dia) >= 1 && diaDaSemana(dia) <= 5);
        for (const ano of new Set(dias.map((dia) => dia.slice(0, 4)))) {
            await guardarFeriados(ano, [{ date: `${ano}-01-01`, name: 'Confraternização mundial' },
                ...(feriadoDeTeste.startsWith(ano) ? [{ date: feriadoDeTeste, name: 'Feriado de teste' }] : [])]);
        }
        const diasUteis = dias.filter((dia) => diaDaSemana(dia) >= 1 && diaDaSemana(dia) <= 5 && dia !== feriadoDeTeste).length;

        // ---- Tela
        const violacoesAntes = violacoesDaPolitica.length;
        const pagina = await entrarNoSite(t.navegador, 'tina');
        await pagina.goto(`${SITE}/relatorios`);
        await pagina.getByText('Dias úteis').waitFor();
        await pagina.waitForFunction(() => !document.body.innerText.includes('…'), null, { timeout: 15000 }).catch(() => {});
        const botao = pagina.getByRole('button', { name: /Exportar/ });
        await botao.click();
        const itens = await pagina.getByRole('menuitem').allTextContents();
        t.conferir(['CSV', 'Excel', 'Power BI', 'PDF'].every((formato, i) => itens[i] && itens[i].startsWith(formato)),
            'tela: o botão "Exportar" abre um menu com CSV, Excel, Power BI e PDF');
        await t.print(pagina, 'relatorios-exportar', 'Relatórios: escolha do formato da exportação');
        await pagina.keyboard.press('Escape');

        async function baixar(formato) {
            await botao.click();
            const [download] = await Promise.all([
                pagina.waitForEvent('download', { timeout: 30000 }),
                pagina.getByRole('menuitem', { name: new RegExp(`^${formato}`) }).click(),
            ]);
            return { nome: download.suggestedFilename(), conteudo: fs.readFileSync(await download.path()) };
        }

        // ---- CSV
        const csv = await baixar('CSV');
        const linhasCsv = csv.conteudo.toString('utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
        t.conferir(csv.nome.endsWith('.csv') && linhasCsv.length === 5 && linhasCsv[0].startsWith('"Código"'),
            `CSV: ${csv.nome}, cabeçalho e 4 atividades`);

        // ---- Excel
        const excel = await baixar('Excel');
        const relatorio = lerPlanilha(excel.conteudo);
        t.conferir(excel.nome.endsWith('.xlsx') && Object.keys(relatorio).join() === 'Resumo,Atividades,Backlog,Tempo de conclusão',
            `Excel: ${excel.nome}, com as abas ${Object.keys(relatorio).join(', ')}`);
        const atividades = relatorio.Atividades;
        const titulos = atividades.slice(1).map((linha) => linha[1]);
        t.conferir(atividades.length === 5 && atividades[0][0] === 'Código' && titulos.includes('Revisão do relatório de produção'),
            'Excel: aba Atividades com cabeçalho e as 4 atividades, acentos preservados');
        const conferir = atividades.find((linha) => linha[1] === 'Conferir estoque');
        t.conferir(typeof conferir[9] === 'number' && diaDoExcel(conferir[9]) === diaEmSaoPaulo(5) && conferir[5] === 'Alto',
            `Excel: o vencimento vira data de verdade no Excel (${diaDoExcel(conferir[9])}), e a prioridade sai como na tela`);
        const indicador = (rotulo) => (relatorio.Resumo.find((linha) => linha[0] === rotulo) || [])[1];
        t.conferir(indicador('Atividades no período (com os filtros)') === 4 && indicador('Concluídas no período') === 1 && indicador('Dias úteis') === diasUteis,
            `Excel: o resumo traz 4 atividades, 1 concluída e ${diasUteis} dias úteis (descontando o feriado de teste)`);
        t.conferir(relatorio.Backlog.length === 8 && relatorio.Backlog[7][1] === 2,
            'Excel: aba Backlog com os 7 dias do período; no último, 2 em aberto (pendente e em andamento)');

        // ---- Power BI
        const powerBi = await baixar('Power BI');
        const modelo = lerPlanilha(powerBi.conteudo);
        t.conferir(powerBi.nome.includes('_powerbi') && Object.keys(modelo).join() === 'Atividades,Calendario,BacklogDiario,LeiaMe',
            `Power BI: ${powerBi.nome}, com as tabelas ${Object.keys(modelo).join(', ')}`);
        const colunas = modelo.Atividades[0];
        t.conferir(colunas[0] === 'id' && colunas.includes('data_vencimento') && colunas.includes('dias_para_concluir') &&
            colunas.every((c) => /^[a-z_]+$/.test(c)) && modelo.Atividades.length === 5,
        'Power BI: Atividades com uma linha por atividade e colunas sem acento nem espaço (data_vencimento, dias_para_concluir...)');
        const linhaPlano = modelo.Atividades.find((linha) => linha[2] === 'Planejar produção');
        const coluna = (nome) => colunas.indexOf(nome);
        t.conferir(linhaPlano[coluna('status')] === 'concluido' && linhaPlano[coluna('concluida_no_periodo')] === true &&
            typeof linhaPlano[coluna('dias_para_concluir')] === 'number',
        'Power BI: valores tipados (texto, número, data e VERDADEIRO/FALSO), prontos para o modelo');
        const calendario = modelo.Calendario;
        const cabecalhoCalendario = calendario[0];
        const linhaFeriado = calendario.find((linha) => typeof linha[0] === 'number' && diaDoExcel(linha[0]) === feriadoDeTeste);
        t.conferir(linhaFeriado && linhaFeriado[cabecalhoCalendario.indexOf('feriado')] === true &&
            linhaFeriado[cabecalhoCalendario.indexOf('nome_feriado')] === 'Feriado de teste' && linhaFeriado[cabecalhoCalendario.indexOf('dia_util')] === false,
        `Power BI: Calendario marca ${feriadoDeTeste} como feriado ("Feriado de teste") e não como dia útil`);
        const fimDeSemana = calendario.slice(1).filter((linha) => linha[cabecalhoCalendario.indexOf('fim_de_semana')]);
        t.conferir(calendario.length >= 8 && fimDeSemana.every((linha) => linha[cabecalhoCalendario.indexOf('dia_util')] === false),
            `Power BI: Calendario com ${calendario.length - 1} dias, e fim de semana nunca conta como dia útil`);
        t.conferir(modelo.BacklogDiario.length === 8 && modelo.BacklogDiario[0].join() === 'data,atividades_em_aberto,criadas,encerradas',
            'Power BI: BacklogDiario com um dia por linha (em aberto, criadas e encerradas)');
        t.conferir(modelo.LeiaMe.some((linha) => String(linha[1] || '').includes('Obter dados > Pasta de trabalho do Excel')),
            'Power BI: a aba LeiaMe explica como importar e o significado de cada coluna');

        // ---- PDF
        const pdf = await baixar('PDF');
        const bruto = pdf.conteudo.toString('latin1');
        const paginas = (bruto.match(/\/Type \/Page\b/g) || []).length;
        const imagens = (bruto.match(/\/Subtype \/Image/g) || []).length;
        t.conferir(pdf.nome.endsWith('.pdf') && bruto.startsWith('%PDF-') && paginas >= 1 && imagens >= 2,
            `PDF: ${pdf.nome}, ${paginas} página(s) e os 2 gráficos como imagem`);
        t.conferir(bruto.includes('Conferir estoque') && bruto.includes('Planejar produ') && bruto.includes('Resumo do per') && bruto.includes('gina 1 de'),
            'PDF: traz o resumo, a tabela de atividades e o número da página');

        t.conferir(violacoesDaPolitica.length === violacoesAntes,
            violacoesDaPolitica.length > violacoesAntes ? `a política bloqueou algo: ${violacoesDaPolitica[violacoesAntes]}` : 'os quatro formatos são gerados sem nenhum bloqueio da política de segurança');
        await pagina.context().close();
    },
};

const fs = require('fs');
const path = require('path');
const {
    STATUS_VALIDOS, PRIORIDADES_VALIDAS, LIMITES_TAREFA, vazioParaNulo, dataValida,
    conferirOrdemDasDatas, normalizarOpcao,
} = require('../src/utils/validacoes');

const ARQUIVO_PADRAO = path.join(__dirname, '..', 'dados', 'tarefas_iniciais.csv');
const COLUNAS = ['titulo', 'descricao', 'responsavel', 'status', 'prioridade', 'data_inicio', 'data_conclusao'];
const SINONIMOS_STATUS = { concluida: 'concluido', cancelada: 'cancelado', 'a fazer': 'pendente', fazendo: 'em andamento' };
const SINONIMOS_PRIORIDADE = { baixa: 'baixo', media: 'medio', alta: 'alto' };
function decodificar(bytes) {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
    } catch (erro) {
        return new TextDecoder('windows-1252').decode(bytes);
    }
}

function lerCsv(texto) {
    const primeiraLinha = texto.split(/\r?\n/, 1)[0];
    const separador = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ';' : ',';
    const registros = [];
    let campo = '';
    let registro = [];
    let entreAspas = false;
    let linha = 1;
    let linhaDoRegistro = 1;
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];
        if (entreAspas) {
            if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
            else if (c === '"') entreAspas = false;
            else { campo += c; if (c === '\n') linha++; }
        } else if (c === '"') {
            entreAspas = true;
        } else if (c === separador) {
            registro.push(campo); campo = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && texto[i + 1] === '\n') i++;
            registro.push(campo); campo = '';
            registros.push({ numero: linhaDoRegistro, valores: registro });
            registro = [];
            linha++;
            linhaDoRegistro = linha;
        } else {
            campo += c;
        }
    }
    if (campo !== '' || registro.length) {
        registro.push(campo);
        registros.push({ numero: linhaDoRegistro, valores: registro });
    }
    const naoVazios = registros.filter((r) => r.valores.some((v) => v.trim() !== ''));
    const [cabecalho, ...linhas] = naoVazios;
    const nomes = (cabecalho ? cabecalho.valores : []).map(normalizarOpcao);
    return {
        separador,
        colunas: nomes,
        linhas: linhas.map((r) => ({
            numero: r.numero,
            valores: Object.fromEntries(nomes.map((nome, i) => [nome, r.valores[i] ?? ''])),
        })),
    };
}

// "05/03/2026" -> "2026-03-05"; o que já está em AAAA-MM-DD passa direto
function paraDataIso(texto) {
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
    return br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : texto;
}

function opcao(texto, validos, sinonimos, padrao) {
    if (texto === null) return { valor: padrao };
    const normal = normalizarOpcao(texto);
    const valor = sinonimos[normal] || normal;
    return validos.includes(valor) ? { valor } : { erro: `"${texto}" não é válido (use: ${validos.join(', ')})` };
}
function prepararLinha(valores, usuarios) {
    const campo = (nome) => vazioParaNulo(valores[nome] ?? null);
    const erros = [];
    const avisos = [];

    const titulo = campo('titulo');
    if (!titulo) erros.push('título vazio');
    for (const [nome, limite] of Object.entries(LIMITES_TAREFA)) {
        if (campo(nome) && campo(nome).length > limite) erros.push(`${nome} com mais de ${limite} caracteres`);
    }
    const status = opcao(campo('status'), STATUS_VALIDOS, SINONIMOS_STATUS, 'pendente');
    if (status.erro) erros.push(`status ${status.erro}`);
    const prioridade = opcao(campo('prioridade'), PRIORIDADES_VALIDAS, SINONIMOS_PRIORIDADE, 'medio');
    if (prioridade.erro) erros.push(`prioridade ${prioridade.erro}`);

    const datas = {};
    for (const nome of ['data_inicio', 'data_conclusao']) {
        const texto = campo(nome);
        datas[nome] = texto ? paraDataIso(texto) : null;
        if (texto && !dataValida(datas[nome])) erros.push(`${nome} "${texto}" não é uma data válida`);
    }
    if (!erros.length) {
        const ordem = conferirOrdemDasDatas(datas.data_inicio, datas.data_conclusao);
        if (ordem) erros.push(ordem.toLowerCase().replace(/\.$/, ''));
    }
    if (erros.length) return { erros };
    const nomeResponsavel = campo('responsavel');
    const encontrado = nomeResponsavel
        ? usuarios.filter((u) => u.ativo && normalizarOpcao(u.nome) === normalizarOpcao(nomeResponsavel))
        : [];
    if (nomeResponsavel && encontrado.length !== 1) {
        avisos.push(encontrado.length > 1
            ? `há ${encontrado.length} usuários chamados "${nomeResponsavel}": ficou sem vínculo`
            : `responsável "${nomeResponsavel}" não é um usuário ativo: ficou só o nome`);
    }
    const usuario = encontrado.length === 1 ? encontrado[0] : null;

    return {
        avisos,
        tarefa: {
            titulo,
            descricao: campo('descricao'),
            responsavel: usuario ? usuario.nome : nomeResponsavel,
            usuario_id: usuario ? usuario.id : null,
            participantes: null,
            participantes_ids: [],
            criado_por: null,
            status: status.valor,
            prioridade: prioridade.valor,
            data_inicio: datas.data_inicio,
            data_conclusao: datas.data_conclusao,
            finalizado_em: null,
        },
    };
}

function chaveDaTarefa(tarefa) {
    return `${normalizarOpcao(tarefa.titulo)}|${normalizarOpcao(tarefa.responsavel || '')}`;
}

async function importar() {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.servidor') });
    const { db, FieldValue, proximoId, descreverBanco } = require('../src/config/firebase');
    const { camposDoPrazo } = require('../src/utils/prazos');

    const argumentos = process.argv.slice(2);
    const simular = argumentos.includes('--simular');
    const arquivo = path.resolve(argumentos.find((a) => !a.startsWith('--')) || ARQUIVO_PADRAO);

    console.log(`Lendo ${arquivo}`);
    const { separador, colunas, linhas } = lerCsv(decodificar(fs.readFileSync(arquivo)));
    if (!colunas.includes('titulo')) {
        throw new Error(`o arquivo precisa da coluna "titulo" (colunas encontradas: ${colunas.join(', ') || 'nenhuma'})`);
    }
    const desconhecidas = colunas.filter((c) => !COLUNAS.includes(c));
    console.log(`${linhas.length} linha(s), separador "${separador}". Destino: ${descreverBanco()}${simular ? ' (SIMULAÇÃO: nada será gravado)' : ''}`);
    if (desconhecidas.length) console.log(`Colunas ignoradas: ${desconhecidas.join(', ')}`);

    const [usuariosDocs, tarefasDocs] = await Promise.all([db.collection('usuarios').get(), db.collection('tarefas').get()]);
    const usuarios = usuariosDocs.docs.map((doc) => doc.data());
    const existentes = new Map(tarefasDocs.docs.map((doc) => [chaveDaTarefa(doc.data()), doc.data().id]));

    const resumo = { importadas: 0, recusadas: 0, repetidas: 0, avisos: 0 };
    for (const { numero, valores } of linhas) {
        const { tarefa, erros, avisos } = prepararLinha(valores, usuarios);
        if (erros) {
            resumo.recusadas++;
            console.log(`  linha ${numero}: RECUSADA - ${erros.join('; ')}`);
            continue;
        }
        const chave = chaveDaTarefa(tarefa);
        if (existentes.has(chave)) {
            resumo.repetidas++;
            console.log(`  linha ${numero}: ignorada - "${tarefa.titulo}" já existe (#${existentes.get(chave)})`);
            continue;
        }
        Object.assign(tarefa, camposDoPrazo(tarefa) || {});
        let id = '(simulação)';
        if (!simular) {
            id = await db.runTransaction(async (transacao) => {
                const novoId = await proximoId(transacao, 'tarefas');
                transacao.set(db.collection('tarefas').doc(String(novoId)), {
                    id: novoId, ...tarefa, criado_em: FieldValue.serverTimestamp(),
                });
                return novoId;
            });
        }
        existentes.set(chave, id);
        resumo.importadas++;
        resumo.avisos += avisos.length;
        console.log(`  linha ${numero}: ${simular ? 'ok' : `importada como #${id}`}${avisos.length ? ` (aviso: ${avisos.join('; ')})` : ''}`);
    }

    console.log(`\n${simular ? 'Simulação' : 'Importação'} concluída: ${resumo.importadas} ${simular ? 'seriam importadas' : 'importadas'}, ` +
        `${resumo.recusadas} recusadas, ${resumo.repetidas} já existiam, ${resumo.avisos} aviso(s).`);
    console.log(`[CSV] ${JSON.stringify({ arquivo: path.basename(arquivo), simular, ...resumo })}`);
    return resumo;
}

if (require.main === module) {
    importar()
        .then(() => process.exit(0))
        .catch((erro) => {
            console.error('Erro ao importar CSV:', erro.message);
            process.exit(1);
        });
}

module.exports = { decodificar, lerCsv, prepararLinha, chaveDaTarefa };

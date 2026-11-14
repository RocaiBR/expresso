const { db, Timestamp } = require('../config/firebase');
const { dataValida } = require('../utils/validacoes');

// Feriados nacionais vêm da BrasilAPI e ficam guardados no Firestore (coleção feriados, um documento por ano).
// A cópia vale 30 dias, para um feriado criado por lei aparecer; se a BrasilAPI cair, a cópia guardada continua valendo.
const ANO_MINIMO = 1900;
const ANO_MAXIMO = 2199; // intervalo aceito pela BrasilAPI
const VALIDADE_DA_COPIA_MS = 30 * 24 * 60 * 60 * 1000;
const TEMPO_LIMITE_MS = 5000;

function enderecoNaBrasilApi(ano) {
    return `${process.env.BRASILAPI_URL || 'https://brasilapi.com.br/api/feriados/v1'}/${ano}`;
}

// Só passa o que o sistema usa, conferido: data real dentro do ano pedido e nome. Campos extras são descartados
function normalizar(lista, ano) {
    if (!Array.isArray(lista)) return null;
    const vistos = new Map();
    let descartados = 0;
    for (const item of lista) {
        const date = item && typeof item.date === 'string' ? item.date : '';
        const name = item && typeof item.name === 'string' ? item.name.trim() : '';
        const chave = `${date}|${name}`;
        if (!dataValida(date) || !date.startsWith(`${ano}-`) || !name || vistos.has(chave)) {
            descartados++;
            continue;
        }
        vistos.set(chave, { date, name, type: typeof item.type === 'string' ? item.type : 'national' });
    }
    return { feriados: [...vistos.values()].sort((a, b) => a.date.localeCompare(b.date)), descartados };
}

async function buscarNaBrasilApi(ano) {
    const resposta = await fetch(enderecoNaBrasilApi(ano), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) throw new Error(`a BrasilAPI respondeu ${resposta.status}`);
    const resultado = normalizar(await resposta.json(), ano);
    if (!resultado || resultado.feriados.length === 0) throw new Error('a BrasilAPI não devolveu nenhum feriado válido');
    if (resultado.descartados) {
        console.warn(`[FERIADOS] ${resultado.descartados} item(ns) da BrasilAPI descartado(s) em ${ano}`);
    }
    return resultado.feriados;
}

// GET /feriados/:ano
async function listarFeriados(req, res, next) {
    try {
        const { ano } = req.params;
        if (!/^\d{4}$/.test(ano) || Number(ano) < ANO_MINIMO || Number(ano) > ANO_MAXIMO) {
            return res.status(400).json({ erro: `Informe um ano válido, entre ${ANO_MINIMO} e ${ANO_MAXIMO}, ex: /feriados/2026` });
        }

        const ref = db.collection('feriados').doc(ano);
        const copia = await ref.get();
        const idade = copia.exists ? Date.now() - copia.data().atualizado_em.toMillis() : Infinity;
        if (idade < VALIDADE_DA_COPIA_MS) {
            res.set('X-Fonte-Dados', 'cache');
            return res.status(200).json(copia.data().feriados);
        }

        try {
            const feriados = await buscarNaBrasilApi(ano);
            await ref.set({ ano: Number(ano), feriados, fonte: 'BrasilAPI', atualizado_em: Timestamp.now() });
            console.log(`[FERIADOS] ${feriados.length} feriados de ${ano} buscados na BrasilAPI`);
            res.set('X-Fonte-Dados', 'brasilapi');
            return res.status(200).json(feriados);
        } catch (erro) {
            const motivo = erro.name === 'TimeoutError' ? `sem resposta em ${TEMPO_LIMITE_MS / 1000} s` : erro.message;
            if (copia.exists) {
                console.warn(`[FERIADOS] BrasilAPI indisponível (${motivo}); usando a cópia de ${ano} guardada`);
                res.set('X-Fonte-Dados', 'cache-vencido');
                return res.status(200).json(copia.data().feriados);
            }
            console.error(`[FERIADOS] BrasilAPI indisponível (${motivo}) e sem cópia de ${ano}`);
            return res.status(502).json({ erro: 'Não foi possível consultar os feriados agora. Tente de novo em alguns minutos.' });
        }
    } catch (error) {
        next(error);
    }
}

module.exports = { listarFeriados, normalizar };

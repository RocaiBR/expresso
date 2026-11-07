const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

// Os parâmetros ficam junto do hash: dá para aumentar o custo no futuro sem invalidar as senhas atuais
const PREFIXO = 'scrypt';
const CUSTO = { N: 16384, r: 8, p: 5 };
const TAMANHO_HASH = 32;

function derivar(senha, sal, custo) {
    return scrypt(senha, sal, TAMANHO_HASH, custo);
}

function senhaProtegida(valor) {
    return typeof valor === 'string' && valor.startsWith(`${PREFIXO}$`);
}

async function gerarHash(senha) {
    const sal = crypto.randomBytes(16);
    const hash = await derivar(senha, sal, CUSTO);
    return [PREFIXO, CUSTO.N, CUSTO.r, CUSTO.p, sal.toString('base64'), hash.toString('base64')].join('$');
}

function iguais(a, b) {
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Aceita também a senha antiga, em texto: ela é trocada pelo hash no primeiro login
async function conferirSenha(senha, guardada) {
    if (typeof senha !== 'string') return false;
    if (typeof guardada !== 'string' || !guardada) {
        // Faz a mesma conta sem usuário: o tempo de resposta não revela quem tem cadastro
        await derivar(senha, Buffer.alloc(16), CUSTO);
        return false;
    }
    if (!senhaProtegida(guardada)) {
        const resumo = (texto) => crypto.createHash('sha256').update(texto).digest();
        return iguais(resumo(senha), resumo(guardada));
    }
    const [, N, r, p, sal, hash] = guardada.split('$');
    const calculado = await derivar(senha, Buffer.from(sal, 'base64'), { N: Number(N), r: Number(r), p: Number(p) });
    return iguais(calculado, Buffer.from(hash, 'base64'));
}

module.exports = { gerarHash, conferirSenha, senhaProtegida };

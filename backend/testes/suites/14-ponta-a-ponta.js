const { spawnSync } = require('child_process');
const { path, API_FUNCAO, SENHA, criarPrimeiroTI } = require('../apoio');

module.exports = {
    nome: 'Gravação de ponta a ponta na Cloud Function',
    descricao: 'O que é enviado à API é o que fica gravado no Firestore e no Storage, e a exclusão apaga tudo (roteiro npm run testar).',

    async executar(t) {
        await criarPrimeiroTI();
        const saida = spawnSync(process.execPath, [path.join(__dirname, '..', 'testar_gravacao.js')], {
            encoding: 'utf8',
            env: { ...process.env, BASE_URL: API_FUNCAO, TESTE_LOGIN: 'tina', TESTE_SENHA: SENHA },
        });
        const linhas = saida.stdout.split(/\r?\n/).map((l) => l.trim());
        const checagens = linhas.filter((l) => l.startsWith('✔') || l.startsWith('✘'));
        checagens.forEach((l) => t.conferir(l.startsWith('✔'), l.slice(1).trim()));
        t.conferir(saida.status === 0 && checagens.length >= 10, `roteiro terminou com código ${saida.status} (${checagens.length} checagens)`);
        if (saida.status !== 0) t.anexar('Saída do roteiro', (saida.stdout + saida.stderr).trim().split(/\r?\n/));
    },
};

const { chamar, login, token, esperar, criarPrimeiroTI, criarUsuario, gravarNoBanco, consultarNoBanco, FIRESTORE, DONO } = require('../apoio');

async function codigosEnviados(para) {
    const emails = await consultarNoBanco('emails_locais', 'para', para);
    return emails
        .sort((a, b) => a.createTime.localeCompare(b.createTime))
        .map((doc) => (doc.fields.texto.stringValue.match(/Expresso é: (\d{6})/) || [])[1])
        .filter(Boolean);
}

async function novoCodigo(para, quantosAntes) {
    for (let i = 0; i < 40; i++) {
        const lista = await codigosEnviados(para);
        if (lista.length > quantosAntes) return lista[lista.length - 1];
        await esperar(250);
    }
    return null;
}

const pedir = (email) => chamar(null, 'POST', '/auth/recuperar-senha', { email });
const redefinir = (email, codigo, nova) => chamar(null, 'POST', '/auth/redefinir-senha', { email, codigo, nova_senha: nova });
const errado = (codigo) => (codigo === '000000' ? '111111' : '000000');

module.exports = {
    nome: 'Recuperação de senha',
    descricao: 'Código de 6 dígitos por e-mail, guardado só como hash, válido por 15 minutos, com limite de tentativas e de reenvio.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        const maria = await criarUsuario(ti, 'Maria Teste', 'maria', 'PCP', 'usuario');
        const email = 'maria@teste.com';
        const sessaoAntiga = await token('maria');

        let r = await pedir(email);
        const desconhecido = await pedir('ninguem@teste.com');
        t.conferir(r.status === 200 && desconhecido.status === 200 && r.dados.mensagem === desconhecido.dados.mensagem,
            'e-mail cadastrado e não cadastrado recebem a MESMA resposta (ninguém descobre quem tem conta)');
        const codigo1 = await novoCodigo(email, 0);
        t.conferir(/^\d{6}$/.test(codigo1 || ''), 'o e-mail com o código de 6 dígitos foi enviado');
        const pedido = await fetch(`${FIRESTORE}/recuperacoes/${maria.id}`, { headers: DONO }).then((x) => x.json());
        t.conferir(pedido.fields && pedido.fields.codigo_hash && !JSON.stringify(pedido.fields).includes(codigo1),
            'o banco guarda só o hash do código (com sal), nunca o código');

        await pedir(email);
        await esperar(800);
        t.conferir((await codigosEnviados(email)).length === 1, 'pedir de novo em menos de 1 minuto não envia outro e-mail');

        r = await redefinir(email, codigo1, '123');
        t.conferir(r.status === 400 && /pelo menos 6/.test(r.dados.erro), `senha nova curta é recusada ("${r.dados.erro}")`);
        r = await redefinir(email, '12ab56', 'novaSenha1');
        t.conferir(r.status === 400 && /6 dígitos/.test(r.dados.erro), 'código que não tem 6 dígitos é recusado antes de consultar o banco');
        r = await redefinir(email, errado(codigo1), 'novaSenha1');
        t.conferir(r.status === 400 && /Restam 4/.test(r.dados.erro), `código errado conta tentativa ("${r.dados.erro}")`);

        r = await redefinir(' MARIA@teste.com ', codigo1, 'novaSenha1');
        t.conferir(r.status === 200, 'código certo redefine a senha (e-mail aceito com espaços e maiúsculas)');
        t.conferir((await login('maria', 'novaSenha1')).token && !(await login('maria', 'senha123')).token,
            'entra com a senha nova; a antiga não funciona mais');
        t.conferir((await chamar(sessaoAntiga, 'GET', '/tarefas')).status === 401, 'logins abertos com a senha antiga são encerrados');
        t.conferir((await redefinir(email, codigo1, 'outraSenha1')).status === 400, 'o mesmo código não serve uma segunda vez');

        await pedir(email);
        const codigo2 = await novoCodigo(email, 1);
        for (let i = 0; i < 5; i++) await redefinir(email, errado(codigo2), 'outraSenha1');
        r = await redefinir(email, codigo2, 'outraSenha1');
        t.conferir(r.status === 400, `depois de 5 erros, nem o código certo funciona ("${r.dados.erro}")`);

        await pedir(email);
        const codigo3 = await novoCodigo(email, 2);
        await gravarNoBanco(`recuperacoes/${maria.id}`, { expira_em: new Date('2020-01-01T00:00:00Z') }, true);
        t.conferir((await redefinir(email, codigo3, 'outraSenha1')).status === 400, 'código com os 15 minutos vencidos é recusado');

        await pedir(email);
        await novoCodigo(email, 3);
        await gravarNoBanco(`recuperacoes/${maria.id}`, { expira_em: new Date('2020-01-01T00:00:00Z') }, true);
        const rotina = (await chamar(ti, 'POST', '/manutencao/rotina-diaria')).dados;
        t.conferir(rotina.codigos_vencidos === 1, 'a rotina diária apaga do banco o código vencido que ninguém usou');

        await chamar(ti, 'PUT', `/usuarios/${maria.id}`, { ativo: false });
        const antes = (await codigosEnviados(email)).length;
        r = await pedir(email);
        await esperar(800);
        t.conferir(r.status === 200 && (await codigosEnviados(email)).length === antes, 'usuário inativo recebe a resposta padrão, mas nenhum e-mail');
        t.conferir((await pedir('')).status === 400, 'pedido sem e-mail → 400');
    },
};

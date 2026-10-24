const { fs, path, ASSETS, SITE, chamar, login, token, esperar, criarPrimeiroTI, criarUsuario, arquivosNoStorage, entrarNoSite } = require('../apoio');

module.exports = {
    nome: 'Meu perfil (foto e senha)',
    descricao: 'A foto vira um JPEG 256×256 e a API confere a assinatura; a troca de senha exige a atual e encerra os outros logins.',

    async executar(t) {
        const ti = await criarPrimeiroTI();
        await criarUsuario(ti, 'Ulisses Padrão', 'ulisses', 'PCP', 'usuario');
        await criarUsuario(ti, 'Gabi Gestora', 'gabi', 'PCP', 'gestor');
        const outroAparelho = await token('ulisses');

        const html = 'data:image/jpeg;base64,' + Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
        t.conferir((await chamar(outroAparelho, 'PUT', '/perfil/foto', { imagem: html })).status === 400, 'API recusa HTML disfarçado de JPEG (assinatura)');
        t.conferir((await chamar(outroAparelho, 'PUT', '/perfil/foto', { imagem: 'data:image/png;base64,iVBORw0KGgo=' })).status === 400, 'API só aceita JPEG');
        const enorme = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF]), Buffer.alloc(600 * 1024)]).toString('base64');
        t.conferir((await chamar(outroAparelho, 'PUT', '/perfil/foto', { imagem: enorme })).status === 400, 'foto com mais de 512 KB é recusada');
        let r = await chamar(outroAparelho, 'PUT', '/perfil/senha', { senha_atual: 'senha123', nova_senha: 'senha123' });
        t.conferir(r.status === 400 && /diferente/.test(r.dados.erro), 'a senha nova precisa ser diferente da atual');
        r = await chamar(outroAparelho, 'PUT', '/perfil/tema', { tema: 'roxo' });
        t.conferir(r.status === 400, 'tema fora da lista (claro, escuro, profundo) é recusado');
        t.conferir((await chamar(await token('gabi'), 'GET', '/perfil')).dados.email === 'gabi@teste.com', 'cada pessoa vê só o próprio perfil');

        if (!t.navegador) return;
        const pagina = await entrarNoSite(t.navegador, 'ulisses');
        await pagina.getByRole('button', { name: 'Usuário' }).click();
        await pagina.getByRole('button', { name: 'Meu perfil' }).click();
        await pagina.waitForURL(SITE + '/perfil');
        await pagina.getByText('ulisses@teste.com').waitFor();
        t.conferir(await pagina.getByText('USUÁRIO PADRÃO').isVisible() && await pagina.getByText('PCP', { exact: true }).isVisible(),
            'tela: o menu "Meu perfil" mostra e-mail, setor e função');

        const tamanhoOriginal = fs.statSync(path.join(ASSETS, 'fundo.png')).size;
        await pagina.locator('input[type=file]').setInputFiles(path.join(ASSETS, 'fundo.png'));
        await pagina.getByText('Foto atualizada.').waitFor();
        const perfil1 = (await chamar(outroAparelho, 'GET', '/perfil')).dados;
        const foto1 = await fetch(perfil1.foto_url);
        const bytes1 = Buffer.from(await foto1.arrayBuffer());
        t.conferir(foto1.headers.get('content-type') === 'image/jpeg' && bytes1[0] === 0xFF && bytes1[1] === 0xD8,
            `tela: PNG de ${(tamanhoOriginal / 1024 / 1024).toFixed(1)} MB virou um JPEG de ${(bytes1.length / 1024).toFixed(0)} KB`);
        const fotoNoTopo = pagina.locator('header img[alt="Foto de Ulisses Padrão"]');
        await fotoNoTopo.waitFor();
        t.conferir(await fotoNoTopo.evaluate((img) => img.complete && img.naturalWidth === 256 && img.naturalHeight === 256),
            'tela: a foto aparece na barra do topo (256×256) na hora');
        await t.print(pagina, 'perfil', 'Meu perfil: foto, e-mail, setor, função e troca de senha');

        await pagina.locator('input[type=file]').setInputFiles(path.join(ASSETS, 'logo.png'));
        let perfil2 = perfil1;
        for (let i = 0; i < 50 && perfil2.foto_url === perfil1.foto_url; i++) {
            await esperar(200);
            perfil2 = (await chamar(outroAparelho, 'GET', '/perfil')).dados;
        }
        const fotos = await arquivosNoStorage('usuarios/');
        t.conferir(fotos.length === 1 && perfil2.foto_url.includes(encodeURIComponent(fotos[0])), 'trocar a foto apaga a antiga do Storage (sobra só a nova)');
        await pagina.locator('input[type=file]').setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('não sou imagem') });
        await pagina.getByText('Escolha um arquivo de imagem').waitFor();
        t.conferir(true, 'tela: arquivo que não é imagem é recusado com aviso');

        const senhaAtual = pagina.locator('#senhaAtual');
        await senhaAtual.fill('errada');
        await pagina.locator('#novaSenha').fill('novaSenha9');
        await pagina.locator('#confirmacaoSenha').fill('novaSenha9');
        await pagina.getByRole('button', { name: 'Salvar nova senha' }).click();
        await pagina.getByText('A senha atual está incorreta.').waitFor();
        t.conferir(pagina.url().endsWith('/perfil'), 'tela: senha atual errada mostra o aviso e a pessoa continua logada');
        await senhaAtual.fill('senha123');
        await pagina.locator('#confirmacaoSenha').fill('outraCoisa');
        await pagina.getByRole('button', { name: 'Salvar nova senha' }).click();
        await pagina.getByText('A confirmação não é igual à nova senha.').waitFor();
        t.conferir(true, 'tela: confirmação diferente é recusada antes de enviar');
        await pagina.locator('#confirmacaoSenha').fill('novaSenha9');
        await pagina.getByRole('button', { name: 'Salvar nova senha' }).click();
        await pagina.getByText('Senha alterada.', { exact: false }).waitFor();
        t.conferir(await senhaAtual.inputValue() === '', 'tela: senha alterada, aviso de sucesso e campos limpos');
        t.conferir((await chamar(outroAparelho, 'GET', '/perfil')).status === 401, 'o login aberto em outro aparelho cai (401)');
        t.conferir((await login('ulisses', 'novaSenha9')).token && !(await login('ulisses', 'senha123')).token, 'entra com a senha nova; a antiga não funciona');

        await pagina.getByRole('button', { name: 'Remover foto' }).click();
        await pagina.getByText('Foto removida.').waitFor();
        t.conferir(await pagina.locator('header img[alt^="Foto de"]').count() === 0 && (await arquivosNoStorage('usuarios/')).length === 0,
            'tela: remover a foto volta o ícone na barra e apaga o arquivo');
    },
};

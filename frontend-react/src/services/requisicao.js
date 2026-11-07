const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// O token do login fica guardado junto com o usuário logado (ver AuthContext)
export const CHAVE_SESSAO = "usuarioLogado";

function tokenDaSessao() {
    try {
        const sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null");
        return sessao ? sessao.token : null;
    } catch (erro) {
        return null;
    }
}

export async function requisitar(caminho, opcoes) {
    const token = tokenDaSessao();
    const cabecalhos = { "Content-Type": "application/json" };
    if (token) cabecalhos.Authorization = "Bearer " + token;

    let resposta;
    try {
        resposta = await fetch(BASE_URL + caminho, { ...opcoes, headers: cabecalhos });
    } catch (erro) {
        throw new Error("Servidor fora do ar. Rode o backend com npm run dev.");
    }

    // Sessão vencida ou derrubada (senha trocada, usuário desativado): volta para o login
    if (resposta.status === 401 && token) {
        sessionStorage.removeItem(CHAVE_SESSAO);
        window.location.assign("/login");
    }

    const dados = await resposta.json().catch(function () { return null; });
    if (!resposta.ok) {
        throw new Error((dados && dados.erro) || "Erro " + resposta.status + " na API.");
    }
    return dados;
}

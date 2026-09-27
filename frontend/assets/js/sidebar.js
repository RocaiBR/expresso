document.addEventListener("DOMContentLoaded", function () {
    const usuarioLogado = sessionStorage.getItem("usuarioLogado");
    if (!usuarioLogado) {
        window.location.href = "../login/index.html";
        return;
    }

    try {
        const usuario = JSON.parse(usuarioLogado);
        const nome = document.getElementById("nome-logado");
        if (nome && usuario.nome) nome.textContent = usuario.nome;
    } catch (erro) {
        console.warn("Não foi possível ler o usuário logado.", erro);
    }
});
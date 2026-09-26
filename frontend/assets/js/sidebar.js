document.addEventListener("DOMContentLoaded", function () {
    // Protege as páginas: sem login, volta para a tela de login
    const usuarioLogado = sessionStorage.getItem("usuarioLogado");
    if (!usuarioLogado) {
        window.location.href = "../login/index.html";
        return;
    }

    // Marca o item do menu da página atual (páginas com .menu-lateral)
    const paginaAtual = window.location.pathname.split("/").pop();
    document.querySelectorAll(".menu-lateral a").forEach(function (link) {
        if (link.dataset.pagina === paginaAtual) {
            link.classList.add("ativo");
        }
    });

    // Mostra o nome do usuário logado onde existir #nome-logado
    try {
        const usuario = JSON.parse(usuarioLogado);
        const nome = document.getElementById("nome-logado");
        if (nome && usuario.nome) nome.textContent = usuario.nome;
    } catch (erro) {
        console.warn("Não foi possível ler o usuário logado.", erro);
    }
});

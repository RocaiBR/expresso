document.addEventListener("DOMContentLoaded", function () {
    const paginaAtual = window.location.pathname.split("/").pop();
    document.querySelectorAll(".menu-lateral a").forEach(function (link) {
        if (link.dataset.pagina === paginaAtual) {
            link.classList.add("ativo");
        }
    });

    const usuarioLogado = sessionStorage.getItem("usuarioLogado");
    if (!usuarioLogado) {
        window.location.href = "../login/index.html";
    }
});
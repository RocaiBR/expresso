document.addEventListener("DOMContentLoaded", function () {
    const dados = sessionStorage.getItem("usuarioLogado");
    if (!dados) {
        window.location.href = "../login/index.html";
        return;
    }

    let usuario = {};
    try {
        usuario = JSON.parse(dados);
    } catch (erro) {
        console.warn("Não foi possível ler o usuário logado.", erro);
    }

    const nome = document.getElementById("nome-logado");
    if (nome && usuario.nome) nome.textContent = usuario.nome;

    // "Nome : SETOR" no topo da home
    const setor = document.getElementById("setor-logado");
    if (setor) {
        if (usuario.setor) {
            setor.textContent = usuario.setor;
        } else {
            setor.style.display = "none";
            if (setor.previousElementSibling) setor.previousElementSibling.style.display = "none";
        }
    }

    montarMenuDoUsuario(usuario);
});

function sair() {
    sessionStorage.removeItem("usuarioLogado");
    window.location.href = "../login/index.html";
}

function montarMenuDoUsuario(usuario) {
    const botao = document.querySelector('header button[aria-label="Usuário"]');
    if (!botao) return;

    // Onde o botão mostra texto ("Usuário"), troca pelo primeiro nome
    const texto = botao.querySelector("span.text-sm");
    if (texto && usuario.nome) texto.textContent = usuario.nome.split(" ")[0];

    const funcoes = { usuario: "Usuário comum", gestor: "Gestor" };
    const detalhe = [usuario.setor, funcoes[usuario.funcao]].filter(Boolean).join(" · ");

    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    menu.style.cssText =
        "position:absolute; right:0; top:calc(100% + 10px); min-width:220px; background:#fff;" +
        "border:1px solid #d1d1d6; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.12);" +
        "padding:12px; display:none; z-index:50; color:#1c1c1e; font-size:14px;";
    menu.innerHTML =
        '<div style="font-weight:600;"></div>' +
        '<div style="color:#6e6e73; font-size:12px; margin-top:2px;"></div>' +
        '<hr style="border:0; border-top:1px solid #e2e2e7; margin:10px 0;">' +
        '<button type="button" style="width:100%; text-align:left; background:none; border:0; ' +
        'padding:8px 10px; border-radius:8px; color:#6F0049; font-weight:600; cursor:pointer;">Sair</button>';

    menu.children[0].textContent = usuario.nome || "Usuário";
    menu.children[1].textContent = detalhe || usuario.email || "";
    const botaoSair = menu.querySelector("button");
    botaoSair.addEventListener("mouseenter", function () { botaoSair.style.background = "#f4e8f0"; });
    botaoSair.addEventListener("mouseleave", function () { botaoSair.style.background = "none"; });
    botaoSair.addEventListener("click", sair);

    const container = botao.parentElement;
    container.style.position = "relative";
    container.appendChild(menu);

    botao.addEventListener("click", function (evento) {
        evento.stopPropagation();
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", function (evento) {
        if (!menu.contains(evento.target)) menu.style.display = "none";
    });
    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") menu.style.display = "none";
    });
}
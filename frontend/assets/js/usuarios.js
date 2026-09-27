const ICONE_EDITAR =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">' +
    '<path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>' +
    '<path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>' +
    '</svg>';

function mostrarAviso(texto, tipo) {
    const aviso = document.getElementById("aviso");
    aviso.textContent = texto;
    aviso.className = "w-full rounded-lg px-4 py-3 text-sm " +
        (tipo === "erro"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-green-50 text-green-700 border border-green-200");
}

function montarLinhaUsuario(usuario) {
    const linha = document.createElement("a");
    linha.href = "usuario-form.html?id=" + usuario.id;
    linha.className =
        "w-full h-[44px] bg-white border border-[#b9b9be] rounded-lg px-4 flex items-center justify-between gap-3 " +
        "text-sm text-[#3a3a3c] no-underline hover:border-[#6F0049] hover:bg-[#fbf7fa] transition-colors";

    const inativo = !usuario.ativo
        ? '<span class="ml-2 text-[11px] font-semibold uppercase text-[#6e6e73] bg-[#e7e7e9] px-2 py-0.5 rounded">Inativo</span>'
        : "";

    linha.innerHTML =
        '<span class="truncate ' + (usuario.ativo ? "" : "text-[#8e8e93]") + '">' +
        Formato.texto(usuario.nome) + inativo + "</span>" +
        '<span class="text-[#54565B] shrink-0" title="Editar">' + ICONE_EDITAR + "</span>";

    return linha;
}

async function carregarUsuarios() {
    const lista = document.getElementById("lista-usuarios");

    let usuarios;
    try {
        usuarios = await Api.listarUsuarios();
    } catch (erro) {
        lista.innerHTML = "";
        mostrarAviso(erro.message, "erro");
        return;
    }

    lista.innerHTML = "";
    if (usuarios.length === 0) {
        lista.innerHTML = '<div class="p-6 text-center text-sm text-[#6e6e73]">Nenhum usuário cadastrado ainda.</div>';
        return;
    }
    usuarios.forEach(function (usuario) {
        lista.appendChild(montarLinhaUsuario(usuario));
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // Mensagem deixada pela tela de cadastro/edição
    const mensagem = sessionStorage.getItem("avisoUsuarios");
    if (mensagem) {
        mostrarAviso(mensagem, "sucesso");
        sessionStorage.removeItem("avisoUsuarios");
    }

    carregarUsuarios();
});
const idUsuario = new URLSearchParams(window.location.search).get("id");
const editando = Boolean(idUsuario);

function campo(id) {
    return document.getElementById(id);
}

function mostrarErro(texto) {
    const aviso = campo("aviso");
    aviso.textContent = texto;
    aviso.className = "w-full rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200";
}

function esconderErro() {
    campo("aviso").className = "hidden";
}

async function prepararEdicao() {
    campo("titulo-formulario").textContent = "Usuário";
    campo("btn-salvar").textContent = "Editar";
    campo("campo-estado").classList.remove("hidden");
    campo("campo-estado").classList.add("flex");
    campo("senha").placeholder = "Deixe em branco para manter a atual";

    // Como no protótipo: botão "Editar" na mesma linha do campo Estado
    campo("area-botao").classList.remove("md:col-span-2");

    try {
        const usuario = await Api.buscarUsuario(idUsuario);
        campo("nome").value = usuario.nome || "";
        campo("usuario").value = usuario.usuario || "";
        campo("email").value = usuario.email || "";
        campo("setor").value = usuario.setor || "";
        campo("funcao").value = usuario.funcao || "usuario";
        campo("ativo").value = usuario.ativo ? "1" : "0";
    } catch (erro) {
        mostrarErro(erro.message);
        campo("btn-salvar").disabled = true;
    }
}

function lerFormulario() {
    return {
        nome: campo("nome").value.trim(),
        usuario: campo("usuario").value.trim(),
        email: campo("email").value.trim(),
        senha: campo("senha").value,
        setor: campo("setor").value,
        funcao: campo("funcao").value
    };
}

function validar(dados) {
    if (!dados.nome) return "Preencha o nome completo.";
    if (!dados.email || !campo("email").checkValidity()) return "Informe um e-mail válido.";
    if (!editando && !dados.senha) return "Informe uma senha para o novo usuário.";
    if (!dados.setor) return "Selecione um setor.";
    if (!dados.funcao) return "Selecione uma função.";
    return null;
}

async function salvar(evento) {
    evento.preventDefault();
    esconderErro();

    const dados = lerFormulario();
    const erro = validar(dados);
    if (erro) {
        mostrarErro(erro);
        return;
    }

    const botao = campo("btn-salvar");
    botao.disabled = true;

    try {
        if (editando) {
            dados.ativo = campo("ativo").value === "1";
            if (!dados.senha) delete dados.senha; // em branco = mantém a senha atual
            await Api.atualizarUsuario(idUsuario, dados);
            sessionStorage.setItem("avisoUsuarios", "Usuário \"" + dados.nome + "\" atualizado com sucesso.");
        } else {
            await Api.criarUsuario(dados);
            sessionStorage.setItem("avisoUsuarios", "Usuário \"" + dados.nome + "\" adicionado com sucesso.");
        }
        window.location.href = "usuarios.html";
    } catch (erroApi) {
        mostrarErro(erroApi.message);
        botao.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (editando) prepararEdicao();
    campo("form-usuario").addEventListener("submit", salvar);
    campo("form-usuario").addEventListener("input", esconderErro);
});
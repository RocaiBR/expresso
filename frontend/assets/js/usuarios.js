const API_URL = "http://localhost:3000";

// ELEMENTOS DA TELA 
const formulario = document.getElementById("form-usuario");
const campoId = document.getElementById("usuario-id");
const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");

const tituloFormulario = document.getElementById("titulo-formulario");
const botaoSalvar = document.getElementById("btn-salvar");
const botaoCancelar = document.getElementById("btn-cancelar");

const corpoTabela = document.getElementById("corpo-tabela");
const mensagemVazio = document.getElementById("mensagem-vazio");

const avisoSucesso = document.getElementById("aviso-sucesso");
const avisoErro = document.getElementById("aviso-erro");

// CONTROLE DE ACESSO 
// Quem não passou pelo login não vê esta tela.
const usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");

if (!usuarioLogado) {
    window.location.href = "../login/index.html";
} else {
    document.getElementById("nome-logado").textContent = usuarioLogado.nome;
}

document.getElementById("btn-sair").addEventListener("click", function () {
    sessionStorage.removeItem("usuarioLogado");
    window.location.href = "../login/index.html";
});

// AVISOS 
function mostrarSucesso(texto) {
    avisoErro.style.display = "none";
    avisoSucesso.textContent = texto;
    avisoSucesso.style.display = "block";
    setTimeout(function () {
        avisoSucesso.style.display = "none";
    }, 3000);
}

function mostrarErro(texto) {
    avisoSucesso.style.display = "none";
    avisoErro.textContent = texto;
    avisoErro.style.display = "block";
}

function formatarData(valor) {
    if (!valor) return "-";
    return new Date(valor).toLocaleString("pt-BR");
}

//  READ: GET /usuarios 
async function carregarUsuarios() {
    try {
        const resposta = await fetch(API_URL + "/usuarios");
        const usuarios = await resposta.json();

        if (!resposta.ok) {
            mostrarErro(usuarios.erro || "Erro ao carregar usuários.");
            return;
        }

        corpoTabela.innerHTML = "";
        mensagemVazio.style.display = usuarios.length === 0 ? "block" : "none";

        usuarios.forEach(function (usuario) {
            const linha = document.createElement("tr");

            linha.innerHTML =
                "<td>" + usuario.id + "</td>" +
                "<td>" + usuario.nome + "</td>" +
                "<td>" + usuario.email + "</td>" +
                "<td>" + formatarData(usuario.criado_em) + "</td>" +
                '<td><div class="acoes-linha">' +
                '<button class="botao-mini" data-acao="editar" data-id="' + usuario.id + '">Editar</button>' +
                '<button class="botao-mini perigo" data-acao="excluir" data-id="' + usuario.id + '">Excluir</button>' +
                "</div></td>";

            corpoTabela.appendChild(linha);
        });
    } catch (erro) {
        mostrarErro("Servidor fora do ar. Rode o backend com npm run dev.");
        console.error(erro);
    }
}

// CREATE e UPDATE: POST / PUT 
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const id = campoId.value;
    const editando = id !== "";

    // No cadastro a senha é obrigatória; na edição, só se for trocar.
    const corpo = {
        nome: campoNome.value.trim(),
        email: campoEmail.value.trim()
    };

    if (campoSenha.value !== "") {
        corpo.senha = campoSenha.value;
    } else if (!editando) {
        mostrarErro("Informe uma senha para o novo usuário.");
        return;
    }

    try {
        const resposta = await fetch(
            API_URL + "/usuarios" + (editando ? "/" + id : ""),
            {
                method: editando ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(corpo)
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarErro(dados.erro || "Não foi possível salvar.");
            return;
        }

        mostrarSucesso(editando ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.");
        limparFormulario();
        carregarUsuarios();
    } catch (erro) {
        mostrarErro("Servidor fora do ar. Rode o backend com npm run dev.");
        console.error(erro);
    }
});

//  DELETE 
async function excluirUsuario(id) {
    if (!confirm("Excluir o usuário " + id + "? Essa ação não tem volta.")) {
        return;
    }

    try {
        const resposta = await fetch(API_URL + "/usuarios/" + id, { method: "DELETE" });
        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarErro(dados.erro || "Não foi possível excluir.");
            return;
        }

        mostrarSucesso("Usuário excluído com sucesso.");
        carregarUsuarios();
    } catch (erro) {
        mostrarErro("Servidor fora do ar. Rode o backend com npm run dev.");
        console.error(erro);
    }
}

// PREPARAR EDIÇÃO 
async function prepararEdicao(id) {
    try {
        const resposta = await fetch(API_URL + "/usuarios/" + id);
        const usuario = await resposta.json();

        if (!resposta.ok) {
            mostrarErro(usuario.erro || "Usuário não encontrado.");
            return;
        }

        campoId.value = usuario.id;
        campoNome.value = usuario.nome;
        campoEmail.value = usuario.email;
        campoSenha.value = "";

        tituloFormulario.textContent = "Editando usuário #" + usuario.id;
        botaoSalvar.textContent = "Salvar alterações";
        botaoCancelar.style.display = "inline-block";

        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (erro) {
        mostrarErro("Servidor fora do ar. Rode o backend com npm run dev.");
        console.error(erro);
    }
}

function limparFormulario() {
    formulario.reset();
    campoId.value = "";
    tituloFormulario.textContent = "Novo usuário";
    botaoSalvar.textContent = "Cadastrar";
    botaoCancelar.style.display = "none";
}

botaoCancelar.addEventListener("click", limparFormulario);


corpoTabela.addEventListener("click", function (evento) {
    const botao = evento.target.closest("button");
    if (!botao) return;

    const id = botao.dataset.id;

    if (botao.dataset.acao === "editar") {
        prepararEdicao(id);
    } else if (botao.dataset.acao === "excluir") {
        excluirUsuario(id);
    }
});

// INÍCIO 
carregarUsuarios();

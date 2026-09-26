const API_URL = "http://localhost:3000";

const formulario = document.getElementById("loginForm");
const loading = document.getElementById("loading");
const mensagemErro = document.getElementById("mensagem-erro");
const usuario = document.getElementById("usuario");
const senha = document.getElementById("senha");
const dots = document.querySelector(".dots");

/* ANIMAÇÃO DOS PONTINHOS DO "Carregando..." */
let count = 1;
setInterval(function () {
    count++;
    if (count > 3) {
        count = 1;
    }
    dots.textContent = ".".repeat(count);
}, 450);

/* Mostra a mensagem de erro com o texto que vier da API */
function mostrarErro(texto) {
    mensagemErro.innerHTML = '<span>!</span> ' + texto;
    mensagemErro.style.display = "flex";
}

function esconderErro() {
    mensagemErro.style.display = "none";
}

/* LOGIN */
formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const valorUsuario = usuario.value.trim();
    const valorSenha = senha.value;
    
    esconderErro();

    if (!valorUsuario || !valorSenha) {
        mostrarErro("Preencha usuário e senha.");
        return;
    }
    loading.style.display = "flex";
    try {
        const resposta = await fetch(API_URL + "/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: valorUsuario,
                senha: valorSenha
            })
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            loading.style.display = "none";
            mostrarErro(dados.erro || "Não foi possível entrar.");
            return;
        }
        sessionStorage.setItem("usuarioLogado", JSON.stringify(dados.usuario));
        setTimeout(function () {
            window.location.href = "../views/usuarios.html";
        }, 1200);
    } catch (erro) {
        loading.style.display = "none";
        mostrarErro("Servidor fora do ar. Rode o backend com npm run dev.");
        console.error(erro);
    }
});
const formulario = document.getElementById("loginForm");
const loading = document.getElementById("loading");
const mensagemErro = document.getElementById("mensagem-erro");
const usuario = document.getElementById("usuario");
const senha = document.getElementById("senha");
const dots = document.querySelector(".dots");


/* ANIMAÇÃO DOS PONTINHOS*/
let count = 1;
setInterval(function() {
    count++;
    if (count > 3) {
        count = 1;
    }
    dots.textContent = ".".repeat(count);
}, 450);

/* LOGIN */
formulario.addEventListener("submit", function(event) {
    event.preventDefault();
    const valorUsuario = usuario.value;
    const valorSenha = senha.value;

    /* LOGIN CORRETO*/
    if (
        valorUsuario === "admin" &&
        valorSenha === "1234"
    ) {
        mensagemErro.style.display = "none";
        /* Mostra o carregamento */
        loading.style.display = "flex";
        /* Simula carregamento */
        setTimeout(function() {
            loading.style.display = "none";

        }, 2500);
    }

    /*  LOGIN INCORRETO */
    else {
        mensagemErro.style.display = "block";
    }

});
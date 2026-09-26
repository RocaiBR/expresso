// =========================================
// AUTH.JS
// Controle de login e permissões
// =========================================


// =========================================
// USUÁRIOS DO SISTEMA
// =========================================

// Aqui estão os usuários de exemplo.
// Depois vocês podem substituir pelos usuários
// que vierem do banco de dados.

const usuarios = [

    {
        id: 1,
        nome: "Isadora",
        usuario: "isadora",
        senha: "1234",
        permissao: "TI",
        grupo: "PCP"
    },

    {
        id: 2,
        nome: "João",
        usuario: "joao",
        senha: "1234",
        permissao: "Gestor",
        grupo: "PCP"
    },

    {
        id: 3,
        nome: "Maria",
        usuario: "maria",
        senha: "1234",
        permissao: "Usuario",
        grupo: "PCP"
    }

];


// =========================================
// VERIFICAR LOGIN
// =========================================

function fazerLogin(usuarioDigitado, senhaDigitada) {

    // Procura o usuário
    const usuarioEncontrado = usuarios.find(function (usuario) {

        return (
            usuario.usuario === usuarioDigitado &&
            usuario.senha === senhaDigitada
        );

    });


    // =====================================
    // USUÁRIO NÃO ENCONTRADO
    // =====================================

    if (!usuarioEncontrado) {

        return false;

    }


    // =====================================
    // SALVAR USUÁRIO LOGADO
    // =====================================

    localStorage.setItem(
        "usuario",
        JSON.stringify({
            id: usuarioEncontrado.id,
            nome: usuarioEncontrado.nome,
            usuario: usuarioEncontrado.usuario,
            permissao: usuarioEncontrado.permissao,
            grupo: usuarioEncontrado.grupo
        })
    );


    return true;
}


// =========================================
// PEGAR USUÁRIO LOGADO
// =========================================

function getUsuarioLogado() {

    const usuarioSalvo =
        localStorage.getItem("usuario");


    if (!usuarioSalvo) {

        return null;

    }


    try {

        return JSON.parse(usuarioSalvo);

    } catch (erro) {

        console.log("Erro ao carregar usuário.");

        return null;

    }

}


// =========================================
// VERIFICAR SE ESTÁ LOGADO
// =========================================

function estaLogado() {

    const usuario =
        getUsuarioLogado();


    return usuario !== null;

}


// =========================================
// VERIFICAR PERMISSÃO
// =========================================

function temPermissao(permissaoNecessaria) {

    const usuario =
        getUsuarioLogado();


    if (!usuario) {

        return false;

    }


    return usuario.permissao === permissaoNecessaria;

}


// =========================================
// VERIFICAR SE É TI
// =========================================

function ehTI() {

    const usuario =
        getUsuarioLogado();


    if (!usuario) {

        return false;

    }


    return usuario.permissao === "TI";

}


// =========================================
// VERIFICAR SE É GESTOR
// =========================================

function ehGestor() {

    const usuario =
        getUsuarioLogado();


    if (!usuario) {

        return false;

    }


    return usuario.permissao === "Gestor";

}


// =========================================
// VERIFICAR SE É USUÁRIO COMUM
// =========================================

function ehUsuarioComum() {

    const usuario =
        getUsuarioLogado();


    if (!usuario) {

        return false;

    }


    return usuario.permissao === "Usuario";

}


// =========================================
// VERIFICAR ACESSO À PÁGINA
// =========================================

function protegerPagina() {

    if (!estaLogado()) {

        window.location.href =
            "../login/index.html";

    }

}


// =========================================
// SAIR DA CONTA
// =========================================

function logout() {

    localStorage.removeItem("usuario");

    window.location.href =
        "../login/index.html";

}
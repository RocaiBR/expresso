import { requisitar } from "./requisicao";

export const UsuarioApi = {
    // Quem o usuário logado pode escolher como responsável de uma atividade
    listarAtribuiveis() {
        return requisitar("/usuarios/atribuiveis");
    },
    // Usuários ativos que podem ser marcados como participantes (id, nome e setor)
    listarParticipantes() {
        return requisitar("/usuarios/participantes");
    },
    listarUsuarios() {
        return requisitar("/usuarios");
    },
    buscarUsuario(id) {
        return requisitar("/usuarios/" + encodeURIComponent(id));
    },
    criarUsuario(usuario) {
        return requisitar("/usuarios", { method: "POST", body: JSON.stringify(usuario) });
    },
    excluirUsuario(id) {
        return requisitar("/usuarios/" + encodeURIComponent(id), { method: "DELETE" });
    },
    atualizarUsuario(id, campos) {
        return requisitar("/usuarios/" + encodeURIComponent(id), {
            method: "PUT",
            body: JSON.stringify(campos)
        });
    }
};

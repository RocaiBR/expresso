import { requisitar } from "./requisicao";

// Meu perfil (sempre da pessoa logada)
export const PerfilApi = {
    buscarPerfil() {
        return requisitar("/perfil");
    },
    trocarFotoPerfil(imagem) {
        return requisitar("/perfil/foto", { method: "PUT", body: JSON.stringify({ imagem }) });
    },
    removerFotoPerfil() {
        return requisitar("/perfil/foto", { method: "DELETE" });
    },
    salvarTema(tema) {
        return requisitar("/perfil/tema", { method: "PUT", body: JSON.stringify({ tema }) });
    },
    trocarSenha(senhaAtual, novaSenha) {
        return requisitar("/perfil/senha", {
            method: "PUT",
            body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
        });
    }
};

import { requisitar } from "./requisicao";

export const AuthApi = {
    login(usuario, senha) {
        return requisitar("/auth/login", {
            method: "POST",
            body: JSON.stringify({ usuario, senha })
        });
    },
    sair() {
        return requisitar("/auth/sair", { method: "POST" });
    },
    solicitarRecuperacao(email) {
        return requisitar("/auth/recuperar-senha", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    },
    redefinirSenha(email, codigo, novaSenha) {
        return requisitar("/auth/redefinir-senha", {
            method: "POST",
            body: JSON.stringify({ email, codigo, nova_senha: novaSenha })
        });
    }
};

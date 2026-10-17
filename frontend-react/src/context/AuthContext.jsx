import { createContext, useContext, useState } from "react";
import { Api, CHAVE_SESSAO } from "../services/api";

const AuthContext = createContext(null);

// Usuário logado + token da sessão (o token vai em toda chamada à API)
function lerUsuarioSalvo() {
    const dados = sessionStorage.getItem(CHAVE_SESSAO);
    if (!dados) return null;
    try {
        const usuario = JSON.parse(dados);
        // Login feito antes de existir o token: precisa entrar de novo
        return usuario && usuario.token ? usuario : null;
    } catch (erro) {
        console.warn("Não foi possível ler o usuário logado.", erro);
        return null;
    }
}

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(lerUsuarioSalvo);

    function entrar(dadosUsuario) {
        sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(dadosUsuario));
        setUsuario(dadosUsuario);
    }

    function sair() {
        // Encerra a sessão na API sem fazer a tela esperar; se falhar, ela expira sozinha
        Api.sair().catch(function () {});
        sessionStorage.removeItem(CHAVE_SESSAO);
        setUsuario(null);
    }

    return (
        <AuthContext.Provider value={{ usuario, entrar, sair }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

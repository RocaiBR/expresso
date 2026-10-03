import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

function lerUsuarioSalvo() {
    const dados = sessionStorage.getItem("usuarioLogado");
    if (!dados) return null;
    try {
        return JSON.parse(dados);
    } catch (erro) {
        console.warn("Não foi possível ler o usuário logado.", erro);
        return null;
    }
}

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(lerUsuarioSalvo);

    function entrar(dadosUsuario) {
        sessionStorage.setItem("usuarioLogado", JSON.stringify(dadosUsuario));
        setUsuario(dadosUsuario);
    }

    function sair() {
        sessionStorage.removeItem("usuarioLogado");
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

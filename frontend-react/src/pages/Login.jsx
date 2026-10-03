import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./login.css";

import imgFundo from "../assets/fundo.png";
import imgLogo from "../assets/logo.png";
import imgCafe from "../assets/cafe.png";

export default function Login() {
    const navigate = useNavigate();
    const { entrar } = useAuth();

    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [pontinhos, setPontinhos] = useState(".");

    /* ANIMAÇÃO DOS PONTINHOS DO "Carregando..." */
    useEffect(() => {
        if (!carregando) return;
        const intervalo = setInterval(() => {
            setPontinhos(atual => (atual.length >= 3 ? "." : atual + "."));
        }, 450);
        return () => clearInterval(intervalo);
    }, [carregando]);

    async function fazerLogin(evento) {
        evento.preventDefault();
        setErro("");

        const valorUsuario = usuario.trim();
        if (!valorUsuario || !senha) {
            setErro("Preencha usuário e senha.");
            return;
        }

        setCarregando(true);
        try {
            const dados = await Api.login(valorUsuario, senha);
            entrar(dados.usuario);
            setTimeout(() => {
                navigate("/");
            }, 1200);
        } catch (erroApi) {
            setCarregando(false);
            setErro(erroApi.message);
        }
    }

    return (
        <div className="pagina-login">
            <main className="pagina">

                {/* LADO ESQUERDO */}
                <section className="lado-esquerdo">
                    <img src={imgFundo} alt="Café" />
                </section>

                {/* LADO DIREITO */}
                <section className="lado-direito">
                    <div className="login-box">
                        <img src={imgLogo} className="logo" alt="Pinhalense" />
                        <form onSubmit={fazerLogin}>

                            {/* USUÁRIO */}
                            <div className="campo">
                                <label htmlFor="usuario">Usuário</label>
                                <input
                                    type="text"
                                    id="usuario"
                                    value={usuario}
                                    onChange={evento => setUsuario(evento.target.value)}
                                />
                            </div>

                            {/* SENHA */}
                            <div className="campo">
                                <label htmlFor="senha">Senha</label>
                                <input
                                    type="password"
                                    id="senha"
                                    value={senha}
                                    onChange={evento => setSenha(evento.target.value)}
                                />
                            </div>

                            {erro && (
                                <p className="mensagem-erro">
                                    <span>!</span> {erro}
                                </p>
                            )}

                            <button type="submit">LOGIN</button>
                        </form>
                    </div>
                </section>
            </main>

            {/* TELA DE CARREGAMENTO */}
            {carregando && (
                <div className="loading">
                    <div className="loading-conteudo">
                        <div className="cup-area">

                            {/* FUMAÇA */}
                            <svg className="steam" viewBox="0 0 100 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <defs>
                                    <linearGradient id="steamGradient" x1="0" y1="1" x2="0" y2="0">
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                                        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.70" />
                                        <stop offset="65%" stopColor="#ffffff" stopOpacity="0.30" />
                                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    className="steam-shape"
                                    d="M48 165
                                       C25 150, 20 137, 38 125
                                       C58 112, 82 113, 82 96
                                       C82 82, 55 78, 38 70
                                       C20 62, 20 49, 37 42
                                       C53 35, 72 38, 72 25
                                       C72 17, 64 10, 61 2
                                       L72 0
                                       C70 10, 82 17, 80 28
                                       C78 43, 52 45, 43 51
                                       C34 57, 48 62, 68 67
                                       C91 73, 98 88, 88 103
                                       C78 119, 52 119, 43 129
                                       C35 138, 47 149, 61 165
                                       Z"
                                />
                            </svg>

                            {/* CANECA */}
                            <img src={imgCafe} className="cup-image" alt="Café" />

                            {/* TEXTO */}
                            <div className="loading-text">
                                Carregando <span className="dots">{pontinhos}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

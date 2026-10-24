import { useState } from "react";
import { Link } from "react-router-dom";
import { Api } from "../services/api";
import "./login.css";

import imgFundo from "../assets/fundo.png";
import imgLogo from "../assets/logo.png";
import imgLogoBranca from "../assets/logobranca.png";
import { useTema } from "../utils/tema";

const TAMANHO_MINIMO_SENHA = 6;

export default function RecuperarSenha() {
    // Nos temas escuros o logo cinza some; usa o branco
    const tema = useTema();
    // "email": pede o código | "codigo": digita o código e a nova senha | "concluido"
    const [etapa, setEtapa] = useState("email");
    const [email, setEmail] = useState("");
    const [codigo, setCodigo] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [aviso, setAviso] = useState("");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);

    async function pedirCodigo(evento) {
        if (evento) evento.preventDefault();
        setErro("");

        const valorEmail = email.trim();
        if (!valorEmail) {
            setErro("Informe o e-mail cadastrado.");
            return;
        }

        setEnviando(true);
        try {
            const resposta = await Api.solicitarRecuperacao(valorEmail);
            setAviso(resposta.mensagem);
            setEtapa("codigo");
        } catch (erroApi) {
            setErro(erroApi.message);
        } finally {
            setEnviando(false);
        }
    }

    async function salvarSenha(evento) {
        evento.preventDefault();
        setErro("");

        if (!/^\d{6}$/.test(codigo.trim())) {
            setErro("O código tem 6 números.");
            return;
        }
        if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
            setErro("A nova senha deve ter pelo menos " + TAMANHO_MINIMO_SENHA + " caracteres.");
            return;
        }
        if (novaSenha !== confirmacao) {
            setErro("As senhas digitadas não são iguais.");
            return;
        }

        setEnviando(true);
        try {
            await Api.redefinirSenha(email.trim(), codigo.trim(), novaSenha);
            setEtapa("concluido");
        } catch (erroApi) {
            setErro(erroApi.message);
        } finally {
            setEnviando(false);
        }
    }

    const mensagemDeErro = erro && (
        <p className="mensagem-erro">
            <span>!</span> {erro}
        </p>
    );

    return (
        <div className="pagina-login pagina-recuperacao">
            <main className="pagina">

                {/* LADO ESQUERDO */}
                <section className="lado-esquerdo">
                    <img src={imgFundo} alt="Café" />
                </section>

                {/* LADO DIREITO */}
                <section className="lado-direito">
                    <div className="login-box caixa-recuperacao">
                        <img src={tema === "claro" ? imgLogo : imgLogoBranca} className="logo" alt="Pinhalense" />
                        <h1 className="titulo-caixa">Recuperar senha</h1>

                        {/* 1. PEDIR O CÓDIGO */}
                        {etapa === "email" && (
                            <form onSubmit={pedirCodigo}>
                                <p className="texto-ajuda">
                                    Informe o e-mail cadastrado. Vamos enviar um código para você criar uma nova senha.
                                </p>
                                <div className="campo">
                                    <label htmlFor="email">E-mail</label>
                                    <input
                                        type="email"
                                        id="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={evento => setEmail(evento.target.value)}
                                    />
                                </div>
                                {mensagemDeErro}
                                <button type="submit" disabled={enviando}>
                                    {enviando ? "ENVIANDO..." : "ENVIAR CÓDIGO"}
                                </button>
                            </form>
                        )}

                        {/* 2. CÓDIGO + NOVA SENHA */}
                        {etapa === "codigo" && (
                            <>
                                <form onSubmit={salvarSenha}>
                                    <p className="texto-ajuda">
                                        {aviso} Confira também a caixa de spam.
                                    </p>
                                    <div className="campo">
                                        <label htmlFor="codigo">Código recebido</label>
                                        <input
                                            type="text"
                                            id="codigo"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            value={codigo}
                                            onChange={evento => setCodigo(evento.target.value.replace(/\D/g, ""))}
                                        />
                                    </div>
                                    <div className="campo">
                                        <label htmlFor="novaSenha">Nova senha</label>
                                        <input
                                            type="password"
                                            id="novaSenha"
                                            autoComplete="new-password"
                                            value={novaSenha}
                                            onChange={evento => setNovaSenha(evento.target.value)}
                                        />
                                    </div>
                                    <div className="campo">
                                        <label htmlFor="confirmacao">Confirmar nova senha</label>
                                        <input
                                            type="password"
                                            id="confirmacao"
                                            autoComplete="new-password"
                                            value={confirmacao}
                                            onChange={evento => setConfirmacao(evento.target.value)}
                                        />
                                    </div>
                                    {mensagemDeErro}
                                    <button type="submit" disabled={enviando}>
                                        {enviando ? "SALVANDO..." : "SALVAR NOVA SENHA"}
                                    </button>
                                </form>
                                <button type="button" className="link-secundario" onClick={() => pedirCodigo()} disabled={enviando}>
                                    Não recebeu? Reenviar código
                                </button>
                            </>
                        )}

                        {/* 3. PRONTO */}
                        {etapa === "concluido" && (
                            <>
                                <p className="mensagem-sucesso">Senha alterada com sucesso!</p>
                                <p className="texto-ajuda">Agora é só entrar com a nova senha.</p>
                                <Link to="/login" className="botao-entrar">ENTRAR</Link>
                            </>
                        )}

                        {etapa !== "concluido" && (
                            <Link to="/login" className="link-secundario">Voltar ao login</Link>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

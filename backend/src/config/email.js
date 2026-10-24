const nodemailer = require('nodemailer');
const { db, FieldValue } = require('./firebase');

// Conta Gmail que envia os e-mails do sistema (com "senha de app", não a senha normal).
// Espaços e quebras de linha são ignorados: o Google mostra a senha de app como "abcd efgh ijkl mnop"
function remetente() {
    return (process.env.GMAIL_USUARIO || '').trim();
}

function senhaDeApp() {
    return (process.env.GMAIL_SENHA_APP || '').replace(/\s+/g, '');
}

function emailConfigurado() {
    return Boolean(remetente() && senhaDeApp());
}
function emModoLocal() {
    return Boolean(process.env.FUNCTIONS_EMULATOR || process.env.FIRESTORE_EMULATOR_HOST);
}

let transporte = null;
function obterTransporte() {
    if (!transporte) {
        transporte = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: remetente(), pass: senhaDeApp() },
        });
    }
    return transporte;
}

async function enviarEmail({ para, assunto, texto, html }) {
    if (!emailConfigurado()) {
        if (emModoLocal()) {
            console.log(`[EMAIL] (modo local, não enviado) Para: ${para} | ${assunto}\n${texto}`);
            if (process.env.FIRESTORE_EMULATOR_HOST) {
                await db.collection('emails_locais').add({ para, assunto, texto, criado_em: FieldValue.serverTimestamp() });
            }
            return;
        }
        const erro = new Error('O envio de e-mails não está configurado.');
        erro.status = 503;
        throw erro;
    }
    await obterTransporte().sendMail({
        from: `"Expresso" <${remetente()}>`,
        to: para,
        subject: assunto,
        text: texto,
        html,
    });
}

module.exports = { enviarEmail, emailConfigurado, emModoLocal };

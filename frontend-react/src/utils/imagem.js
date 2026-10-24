/* Foto de perfil: recorta o centro da imagem num quadrado e reduz para 256x256 em JPEG.
   Assim qualquer foto (até de celular, com vários MB) vira um arquivo de uns 30 KB. */

const LADO = 256;
const TAMANHO_MAXIMO_ORIGINAL = 15 * 1024 * 1024; // 15 MB

export function prepararFotoDePerfil(arquivo) {
    return new Promise(function (resolver, rejeitar) {
        if (!arquivo.type.startsWith("image/")) {
            rejeitar(new Error("Escolha um arquivo de imagem (JPG, PNG ou WEBP)."));
            return;
        }
        if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
            rejeitar(new Error("A imagem deve ter até 15 MB."));
            return;
        }

        const endereco = URL.createObjectURL(arquivo);
        const imagem = new Image();
        imagem.onload = function () {
            const menor = Math.min(imagem.naturalWidth, imagem.naturalHeight);
            const canvas = document.createElement("canvas");
            canvas.width = LADO;
            canvas.height = LADO;
            const contexto = canvas.getContext("2d");
            // Fundo branco: o JPEG não tem transparência (um PNG transparente ficaria preto)
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, LADO, LADO);
            contexto.drawImage(
                imagem,
                (imagem.naturalWidth - menor) / 2, (imagem.naturalHeight - menor) / 2, menor, menor,
                0, 0, LADO, LADO
            );
            URL.revokeObjectURL(endereco);
            resolver(canvas.toDataURL("image/jpeg", 0.85));
        };
        imagem.onerror = function () {
            URL.revokeObjectURL(endereco);
            rejeitar(new Error("Não foi possível abrir essa imagem. Use JPG, PNG ou WEBP."));
        };
        imagem.src = endereco;
    });
}

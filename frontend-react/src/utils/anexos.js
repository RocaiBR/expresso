/* Regras dos anexos (as mesmas de backend/src/controllers/anexoController.js) */

export const TAMANHO_MAXIMO = 200 * 1024 * 1024; // 200 MB

const EXTENSOES = [
    "pdf", "txt", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "heic",
    "mp4", "mov", "webm", "avi", "mkv",
    "mp3", "wav", "ogg", "m4a", "aac"
];

// Para o atributo "accept" do <input type="file">
export const ACEITOS = EXTENSOES.map(function (ext) { return "." + ext; }).join(",");

// Devolve a mensagem de erro ou null
export function validarArquivo(arquivo) {
    const partes = arquivo.name.toLowerCase().split(".");
    const extensao = partes.length > 1 ? partes.pop() : "";
    if (!EXTENSOES.includes(extensao)) {
        return arquivo.name + ": tipo de arquivo não permitido.";
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
        return arquivo.name + ": passa do limite de " + formatarTamanho(TAMANHO_MAXIMO) + ".";
    }
    if (arquivo.size === 0) {
        return arquivo.name + ": arquivo vazio.";
    }
    return null;
}

// 1536 -> "1,5 KB"
export function formatarTamanho(bytes) {
    const unidades = ["B", "KB", "MB", "GB"];
    let valor = bytes;
    let indice = 0;
    while (valor >= 1024 && indice < unidades.length - 1) {
        valor = valor / 1024;
        indice++;
    }
    const casas = indice === 0 ? 0 : 1;
    return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas }) + " " + unidades[indice];
}

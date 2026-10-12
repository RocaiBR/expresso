// Confere se o conteúdo do arquivo é mesmo do formato que a extensão diz.
// Todo formato binário começa com bytes fixos (a "assinatura" ou "número mágico"):
// um .exe renomeado para .pdf começa com "MZ", não com "%PDF-", e é recusado.
// Não é antivírus: um PDF verdadeiro com conteúdo malicioso ainda passa.

// Basta ler o começo do arquivo (e o fim, no caso do Office), nunca o arquivo inteiro
const TAMANHO_AMOSTRA = 64 * 1024;

function comecaCom(bytes, assinatura, posicao = 0) {
    const esperado = typeof assinatura === 'string' ? Buffer.from(assinatura, 'latin1') : Buffer.from(assinatura);
    return bytes.length >= posicao + esperado.length
        && bytes.subarray(posicao, posicao + esperado.length).equals(esperado);
}

// MP4, MOV, M4A e HEIC usam o mesmo formato de "caixas": a primeira costuma ser "ftyp"
function ehIsoMidia(bytes) {
    return ['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide'].some((caixa) => comecaCom(bytes, caixa, 4));
}

// RIFF é o "envelope" de WAV, AVI e WEBP; o tipo vem nos bytes 8 a 11
function ehRiff(bytes, tipo) {
    return (comecaCom(bytes, 'RIFF') || comecaCom(bytes, 'RF64')) && comecaCom(bytes, tipo, 8);
}

// Texto não tem assinatura, mas arquivo binário quase sempre tem bytes zero
function ehTexto(bytes) {
    const utf16 = comecaCom(bytes, [0xFF, 0xFE]) || comecaCom(bytes, [0xFE, 0xFF]);
    return utf16 || !bytes.includes(0);
}

const EBML = [0x1A, 0x45, 0xDF, 0xA3];                          // Matroska (MKV e WEBM)
const OLE = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];   // Office antigo (.doc, .xls, .ppt)
const ZIP = [0x50, 0x4B, 0x03, 0x04];                           // Office atual é um ZIP por dentro
const MARCAS_HEIC = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];

const VERIFICACOES = {
    pdf: (b) => b.subarray(0, 1024).includes('%PDF-'), // o padrão aceita lixo antes, até 1 KB
    txt: ehTexto,
    csv: ehTexto,
    doc: (b) => comecaCom(b, OLE),
    xls: (b) => comecaCom(b, OLE),
    ppt: (b) => comecaCom(b, OLE),

    png: (b) => comecaCom(b, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    jpg: (b) => comecaCom(b, [0xFF, 0xD8, 0xFF]),
    jpeg: (b) => comecaCom(b, [0xFF, 0xD8, 0xFF]),
    gif: (b) => comecaCom(b, 'GIF87a') || comecaCom(b, 'GIF89a'),
    webp: (b) => ehRiff(b, 'WEBP'),
    bmp: (b) => comecaCom(b, 'BM'),
    heic: (b) => comecaCom(b, 'ftyp', 4) && MARCAS_HEIC.includes(b.toString('latin1', 8, 12)),

    mp4: ehIsoMidia,
    mov: ehIsoMidia,
    webm: (b) => comecaCom(b, EBML),
    mkv: (b) => comecaCom(b, EBML),
    avi: (b) => ehRiff(b, 'AVI '),

    mp3: (b) => comecaCom(b, 'ID3') || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0),
    wav: (b) => ehRiff(b, 'WAVE'),
    ogg: (b) => comecaCom(b, 'OggS'),
    m4a: ehIsoMidia,
    aac: (b) => (b[0] === 0xFF && (b[1] & 0xF6) === 0xF0) || comecaCom(b, 'ADIF') || ehIsoMidia(b),
};

// Word, Excel e PowerPoint atuais são ZIPs com uma pasta própria dentro
const PASTAS_OFFICE = { docx: 'word/', xlsx: 'xl/', pptx: 'ppt/' };

function temVerificacao(extensao) {
    return Boolean(VERIFICACOES[extensao] || PASTAS_OFFICE[extensao]);
}

// Lê só um trecho do arquivo no Storage (os bytes de "inicio" a "fim", inclusive)
async function lerTrecho(arquivo, inicio, fim) {
    const [bytes] = await arquivo.download({ start: inicio, end: fim });
    return bytes;
}

// "arquivo" é o arquivo no Storage (bucket().file(...)); devolve true se o conteúdo bate com a extensão
async function conteudoConfere(arquivo, extensao, tamanho) {
    const inicio = await lerTrecho(arquivo, 0, Math.min(tamanho, TAMANHO_AMOSTRA) - 1);

    const pasta = PASTAS_OFFICE[extensao];
    if (pasta) {
        if (!comecaCom(inicio, ZIP)) return false;
        if (inicio.includes(pasta)) return true;
        // Os nomes de tudo que está dentro do ZIP também ficam listados no fim do arquivo
        const fim = await lerTrecho(arquivo, Math.max(0, tamanho - TAMANHO_AMOSTRA), tamanho - 1);
        return fim.includes(pasta);
    }

    const verificar = VERIFICACOES[extensao];
    return Boolean(verificar && verificar(inicio));
}

module.exports = { conteudoConfere, temVerificacao, VERIFICACOES, PASTAS_OFFICE };

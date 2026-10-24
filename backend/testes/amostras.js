const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { ASSETS } = require('./apoio');

const zeros = (n) => Buffer.alloc(n);
const bytes = (...partes) => Buffer.concat(partes.map((p) => (Buffer.isBuffer(p) ? p : Array.isArray(p) ? Buffer.from(p) : Buffer.from(p, 'latin1'))));

function zip(entradas) {
    const locais = [];
    const centrais = [];
    let posicao = 0;
    for (const [nome, conteudo] of entradas) {
        const dados = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo);
        const nomeBytes = Buffer.from(nome);
        const crc = zlib.crc32(dados);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(dados.length, 18); local.writeUInt32LE(dados.length, 22); local.writeUInt16LE(nomeBytes.length, 26);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(dados.length, 20); central.writeUInt32LE(dados.length, 24); central.writeUInt16LE(nomeBytes.length, 28);
        central.writeUInt32LE(posicao, 42);
        locais.push(local, nomeBytes, dados);
        centrais.push(central, nomeBytes);
        posicao += 30 + nomeBytes.length + dados.length;
    }
    const diretorio = Buffer.concat(centrais);
    const fim = Buffer.alloc(22);
    fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(entradas.length, 8); fim.writeUInt16LE(entradas.length, 10);
    fim.writeUInt32LE(diretorio.length, 12); fim.writeUInt32LE(posicao, 16);
    return Buffer.concat([...locais, diretorio, fim]);
}

const CT = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>';
const OLE = bytes([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], zeros(504));
const ftyp = (marca) => bytes([0, 0, 0, 24], 'ftyp', marca, [0, 0, 2, 0], marca, 'isom', zeros(64));
const riff = (tipo, extra) => bytes('RIFF', [100, 0, 0, 0], tipo, extra, zeros(60));
const EXECUTAVEL = bytes('MZ', [0x90, 0x00, 0x03, 0x00], zeros(2048)); // começo de um .exe do Windows

function amostrasValidas() {
    const logo = fs.readFileSync(path.join(ASSETS, 'logo.png'));
    return [
        ['relatorio.pdf', bytes('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')],
        ['notas.txt', Buffer.from('Reunião às 14h — anotações com acentuação.\n', 'utf8')],
        ['planilha-excel-br.csv', Buffer.from('nome;cidade\nJoão;São Paulo\n', 'latin1')],
        ['documento.docx', zip([['[Content_Types].xml', CT], ['_rels/.rels', '<Relationships/>'], ['word/document.xml', '<w:document/>']])],
        ['planilha.xlsx', zip([['docProps/app.xml', '<Properties/>'], ['xl/workbook.xml', '<workbook/>'], ['[Content_Types].xml', CT]])],
        ['apresentacao.pptx', zip([['[Content_Types].xml', CT], ['docProps/thumbnail.jpeg', Buffer.alloc(150 * 1024, 7)], ['ppt/presentation.xml', '<p:presentation/>']])],
        ['antigo.doc', OLE], ['antigo.xls', OLE], ['antigo.ppt', OLE],
        ['logo.png', logo],
        ['foto.jpg', bytes([0xFF, 0xD8, 0xFF, 0xE0, 0, 16], 'JFIF', zeros(60))],
        ['foto.jpeg', bytes([0xFF, 0xD8, 0xFF, 0xE0, 0, 16], 'JFIF', zeros(60))],
        ['animacao.gif', bytes('GIF89a', zeros(60))],
        ['imagem.webp', riff('WEBP', 'VP8 ')],
        ['imagem.bmp', bytes('BM', zeros(60))],
        ['foto.heic', ftyp('heic')],
        ['video.mp4', ftyp('mp42')],
        ['iphone.mov', ftyp('qt  ')],
        ['video.webm', bytes([0x1A, 0x45, 0xDF, 0xA3], zeros(60))],
        ['video.mkv', bytes([0x1A, 0x45, 0xDF, 0xA3], zeros(60))],
        ['video.avi', riff('AVI ', 'LIST')],
        ['musica.mp3', bytes('ID3', [4, 0], zeros(60))],
        ['musica-sem-tag.mp3', bytes([0xFF, 0xFB, 0x90, 0x64], zeros(60))],
        ['alarme.wav', riff('WAVE', 'fmt ')],
        ['audio.ogg', bytes('OggS', [0, 2], zeros(60))],
        ['audio.m4a', ftyp('M4A ')],
        ['audio.aac', bytes([0xFF, 0xF1, 0x50, 0x80], zeros(60))],
    ];
}

function amostrasDisfarcadas() {
    const logo = fs.readFileSync(path.join(ASSETS, 'logo.png'));
    return [
        ['executavel-renomeado.pdf', EXECUTAVEL],
        ['executavel-renomeado.txt', EXECUTAVEL],
        ['executavel-renomeado.wav', EXECUTAVEL],
        ['html-disfarcado.png', bytes('<html><script>alert("xss")</script></html>')],
        ['png-fingindo.jpg', logo],
        ['pdf-fingindo.docx', bytes('%PDF-1.4\n%%EOF\n')],
        ['zip-comum.docx', zip([['fotos/ferias.jpg', zeros(2000)]])],
        ['docx-fingindo.xlsx', zip([['[Content_Types].xml', CT], ['word/document.xml', '<w:document/>']])],
        ['texto-fingindo.mp4', bytes('isto é só um texto qualquer, sem caixa ftyp nenhuma')],
    ];
}

module.exports = { amostrasValidas, amostrasDisfarcadas };

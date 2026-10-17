const { randomUUID } = require('crypto');
const { db, FieldValue, bucket, urlDeDownload, paraJson } = require('../config/firebase');
const { conteudoConfere, temVerificacao } = require('../utils/assinaturas');
const { carregarTarefa } = require('../utils/permissoes');

// Limite por arquivo (vídeos são os maiores).
const TAMANHO_MAXIMO = 200 * 1024 * 1024; // 200 MB

// Extensões aceitas e o tipo gravado no Storage (é ele que faz o navegador abrir ou baixar).
const TIPOS_PERMITIDOS = {
    // Documentos
    pdf: 'application/pdf',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Imagens
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    heic: 'image/heic',
    // Vídeos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    // Áudios
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
};

// Falha ao subir a API, e não no primeiro envio, se alguém esquecer a assinatura de um tipo novo
const semAssinatura = Object.keys(TIPOS_PERMITIDOS).filter((ext) => !temVerificacao(ext));
if (semAssinatura.length > 0) {
    throw new Error(`Extensões sem assinatura em src/utils/assinaturas.js: ${semAssinatura.join(', ')}`);
}

function anexosDa(tarefaId) {
    return db.collection('tarefas').doc(String(tarefaId)).collection('anexos');
}

function extensao(nome) {
    const partes = nome.toLowerCase().split('.');
    return partes.length > 1 ? partes.pop() : '';
}

// Nome usado no caminho do Storage
function nomeSeguro(nome) {
    return nome.replace(/[^\w.\- ]/g, '_').slice(-100);
}

// O token fica só no banco; para fora vai o link pronto
function paraJsonAnexo(doc) {
    const { token, ...anexo } = paraJson(doc);
    if (anexo.status === 'pronto') anexo.url = urlDeDownload(anexo.caminho, token);
    return anexo;
}

// GET /tarefas/:id/anexos
async function listarAnexos(req, res, next) {
    try {
        if (!(await carregarTarefa(req.usuario, req.params.id))) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }
        const resultado = await anexosDa(req.params.id).where('status', '==', 'pronto').get();
        const lista = resultado.docs.map(paraJsonAnexo).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
        res.status(200).json(lista);
    } catch (error) {
        next(error);
    }
}

// POST /tarefas/:id/anexos  { nome, tamanho }
async function iniciarAnexo(req, res, next) {
    try {
        const { id } = req.params;
        const { nome, tamanho } = req.body;

        if (!nome || typeof nome !== 'string' || nome.length > 200) {
            return res.status(400).json({ erro: 'Informe o nome do arquivo (até 200 caracteres).' });
        }
        const tipo = TIPOS_PERMITIDOS[extensao(nome)];
        if (!tipo) {
            return res.status(400).json({
                erro: 'Tipo de arquivo não permitido.',
                extensoes_aceitas: Object.keys(TIPOS_PERMITIDOS),
            });
        }
        if (!Number.isInteger(tamanho) || tamanho <= 0 || tamanho > TAMANHO_MAXIMO) {
            return res.status(400).json({ erro: `O arquivo deve ter até ${TAMANHO_MAXIMO / 1024 / 1024} MB.` });
        }
        // Anexar segue a permissão de mudar o status da atividade
        const tarefa = await carregarTarefa(req.usuario, id);
        if (!tarefa) {
            return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        }
        if (!tarefa.permissoes.status) {
            return res.status(403).json({ erro: 'Você não pode anexar arquivos nesta atividade.' });
        }

        const ref = anexosDa(id).doc();
        const caminho = `tarefas/${id}/${ref.id}/${nomeSeguro(nome)}`;
        const token = randomUUID();

        // "origin" libera o envio direto pelo navegador (CORS) só para o site que pediu
        const [urlEnvio] = await bucket().file(caminho).createResumableUpload({
            origin: req.get('origin'),
            metadata: {
                contentType: tipo,
                contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
                metadata: { firebaseStorageDownloadTokens: token },
            },
        });

        await ref.set({
            id: ref.id,
            nome,
            tipo,
            tamanho,
            caminho,
            token,
            enviado_por: req.usuario.id,
            status: 'enviando',
            criado_em: FieldValue.serverTimestamp(),
        });

        res.status(201).json({ anexo: paraJsonAnexo(await ref.get()), url_envio: urlEnvio });
    } catch (error) {
        next(error);
    }
}

// POST /tarefas/:id/anexos/:anexoId/concluir  (depois que o navegador terminou o envio)
async function concluirAnexo(req, res, next) {
    try {
        const tarefa = await carregarTarefa(req.usuario, req.params.id);
        if (!tarefa || !tarefa.permissoes.status) {
            return res.status(404).json({ erro: 'Anexo não encontrado.' });
        }
        const ref = anexosDa(req.params.id).doc(req.params.anexoId);
        const doc = await ref.get();
        if (!doc.exists) {
            return res.status(404).json({ erro: 'Anexo não encontrado.' });
        }

        const arquivo = bucket().file(doc.data().caminho);
        const [existe] = await arquivo.exists();
        if (!existe) {
            return res.status(409).json({ erro: 'O arquivo ainda não chegou ao Storage.' });
        }

        // Confere o tamanho real, não o que o navegador informou
        const [metadados] = await arquivo.getMetadata();
        const tamanho = Number(metadados.size);
        if (tamanho > TAMANHO_MAXIMO) {
            await arquivo.delete();
            await ref.delete();
            return res.status(400).json({ erro: `O arquivo deve ter até ${TAMANHO_MAXIMO / 1024 / 1024} MB.` });
        }

        // Confere se o conteúdo é mesmo do formato da extensão (ex.: .exe renomeado para .pdf)
        const { nome } = doc.data();
        const ext = extensao(nome);
        if (!(await conteudoConfere(arquivo, ext, tamanho))) {
            await arquivo.delete();
            await ref.delete();
            console.warn(`[ANEXOS] "${nome}" recusado: o conteúdo não é de um arquivo .${ext}`);
            return res.status(400).json({
                erro: `O conteúdo de "${nome}" não corresponde a um arquivo .${ext}. O arquivo foi descartado.`,
            });
        }

        await ref.update({ status: 'pronto', tamanho });
        console.log(`[ANEXOS] "${doc.data().nome}" (${tamanho} bytes) anexado à tarefa #${req.params.id}`);
        res.status(200).json(paraJsonAnexo(await ref.get()));
    } catch (error) {
        next(error);
    }
}

// DELETE /tarefas/:id/anexos/:anexoId
async function excluirAnexo(req, res, next) {
    try {
        const tarefa = await carregarTarefa(req.usuario, req.params.id);
        if (!tarefa) {
            return res.status(404).json({ erro: 'Anexo não encontrado.' });
        }
        const ref = anexosDa(req.params.id).doc(req.params.anexoId);
        const doc = await ref.get();
        if (!doc.exists) {
            return res.status(404).json({ erro: 'Anexo não encontrado.' });
        }

        // Remove quem pode editar a atividade, ou quem enviou o próprio arquivo
        const enviouEste = doc.data().enviado_por === req.usuario.id && tarefa.permissoes.status;
        if (!tarefa.permissoes.editar && !enviouEste) {
            return res.status(403).json({ erro: 'Você só pode remover os arquivos que você mesmo enviou.' });
        }

        await bucket().file(doc.data().caminho).delete({ ignoreNotFound: true });
        await ref.delete();
        res.status(200).json({ mensagem: 'Anexo excluído com sucesso.', id: doc.id });
    } catch (error) {
        next(error);
    }
}

// Usado ao excluir a tarefa: apaga os arquivos dela no Storage
async function excluirArquivosDaTarefa(tarefaId) {
    await bucket().deleteFiles({ prefix: `tarefas/${tarefaId}/` });
}

module.exports = {
    listarAnexos,
    iniciarAnexo,
    concluirAnexo,
    excluirAnexo,
    excluirArquivosDaTarefa
};

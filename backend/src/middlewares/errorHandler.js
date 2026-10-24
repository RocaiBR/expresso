function rotaNaoEncontrada(req, res, next) {
    res.status(404).json({
        erro: 'Rota não encontrada.',
        metodo: req.method,
        caminho: req.originalUrl
    });
}

function tratadorDeErros(err, req, res, next) {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ erro: 'A requisição passou do limite de 1 MB.' });
    }
    console.error('[ERRO]', err);
    res.status(err.status || 500).json({
        erro: err.status ? err.message : 'Erro interno do servidor.'
    });
}

module.exports = { rotaNaoEncontrada, tratadorDeErros };

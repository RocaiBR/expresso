function rotaNaoEncontrada(req, res, next) {
    res.status(404).json({
        erro: 'Rota não encontrada.',
        metodo: req.method,
        caminho: req.originalUrl
    });
}

function tratadorDeErros(err, req, res, next) {
    console.error('[ERRO]', err);
    res.status(err.status || 500).json({
        erro: err.message || 'Erro interno do servidor.'
    });
}

module.exports = { rotaNaoEncontrada, tratadorDeErros };
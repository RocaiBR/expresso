const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacaoController');

router.get('/contagem', notificacaoController.contarNaoLidas);
router.get('/', notificacaoController.listarNotificacoes);
router.post('/lidas', notificacaoController.marcarTodasComoLidas);
router.post('/:id/lida', notificacaoController.marcarComoLida);

module.exports = router;

const express = require('express');
const router = express.Router();
const tarefaController = require('../controllers/tarefaController');
const anexoController = require('../controllers/anexoController');
const { somenteTI } = require('../middlewares/autenticacao');

router.post('/verificar-prazos', somenteTI, tarefaController.verificarPrazosAgora);
router.get('/', tarefaController.listarTarefas);
router.get('/:id', tarefaController.buscarTarefaPorId);
router.post('/', tarefaController.criarTarefa);
router.put('/:id', tarefaController.atualizarTarefa);
router.delete('/:id', tarefaController.excluirTarefa);

router.get('/:id/anexos', anexoController.listarAnexos);
router.post('/:id/anexos', anexoController.iniciarAnexo);
router.post('/:id/anexos/:anexoId/concluir', anexoController.concluirAnexo);
router.delete('/:id/anexos/:anexoId', anexoController.excluirAnexo);

module.exports = router;

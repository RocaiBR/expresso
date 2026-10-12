const express = require('express');
const router = express.Router();
const tarefaController = require('../controllers/tarefaController');
const anexoController = require('../controllers/anexoController');

router.get('/', tarefaController.listarTarefas);
router.get('/:id', tarefaController.buscarTarefaPorId);
router.post('/', tarefaController.criarTarefa);
router.put('/:id', tarefaController.atualizarTarefa);
router.delete('/:id', tarefaController.excluirTarefa);

// Anexos: o navegador pede um endereço de envio, manda o arquivo direto ao Storage e confirma
router.get('/:id/anexos', anexoController.listarAnexos);
router.post('/:id/anexos', anexoController.iniciarAnexo);
router.post('/:id/anexos/:anexoId/concluir', anexoController.concluirAnexo);
router.delete('/:id/anexos/:anexoId', anexoController.excluirAnexo);

module.exports = router;

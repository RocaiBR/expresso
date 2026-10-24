const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { somenteTI } = require('../middlewares/autenticacao');

router.get('/atribuiveis', usuarioController.listarAtribuiveis);
router.get('/participantes', usuarioController.listarParticipantes);

router.get('/', somenteTI, usuarioController.listarUsuarios);
router.get('/:id', usuarioController.buscarUsuarioPorId);
router.post('/', somenteTI, usuarioController.criarUsuario);
router.put('/:id', somenteTI, usuarioController.atualizarUsuario);
router.delete('/:id', somenteTI, usuarioController.excluirUsuario);
module.exports = router;

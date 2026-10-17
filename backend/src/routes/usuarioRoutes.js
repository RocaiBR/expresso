const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { somenteTI } = require('../middlewares/autenticacao');

// Qualquer pessoa logada: quem ela pode escolher como responsável de uma atividade
router.get('/atribuiveis', usuarioController.listarAtribuiveis);

// Cadastro de usuários: só o TI 
router.get('/', somenteTI, usuarioController.listarUsuarios);
router.get('/:id', usuarioController.buscarUsuarioPorId);
router.post('/', somenteTI, usuarioController.criarUsuario);
router.put('/:id', somenteTI, usuarioController.atualizarUsuario);
router.delete('/:id', somenteTI, usuarioController.excluirUsuario);
module.exports = router;

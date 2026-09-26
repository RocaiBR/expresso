const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.get('/', usuarioController.listarUsuarios);         
router.get('/:id', usuarioController.buscarUsuarioPorId);  
router.post('/', usuarioController.criarUsuario);         
router.put('/:id', usuarioController.atualizarUsuario); 
router.delete('/:id', usuarioController.excluirUsuario);   
module.exports = router;

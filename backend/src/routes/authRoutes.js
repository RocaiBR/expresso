const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar } = require('../middlewares/autenticacao');

router.post('/login', authController.login);
router.post('/sair', autenticar, authController.sair);
router.post('/recuperar-senha', authController.solicitarRecuperacao);
router.post('/redefinir-senha', authController.redefinirSenha);

module.exports = router;

const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');

router.get('/', perfilController.verPerfil);
router.put('/foto', perfilController.trocarFoto);
router.delete('/foto', perfilController.removerFoto);
router.put('/senha', perfilController.trocarSenha);
router.put('/tema', perfilController.salvarTema);

module.exports = router;

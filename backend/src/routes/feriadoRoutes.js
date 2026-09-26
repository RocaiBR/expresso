const express = require('express');
const router = express.Router();
const feriadoController = require('../controllers/feriadoController');

router.get('/:ano', feriadoController.listarFeriados);

module.exports = router;
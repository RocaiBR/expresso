const express = require('express');
const router = express.Router();
const { somenteTI } = require('../middlewares/autenticacao');
const { executarRotinaDiaria, verificarConsistencia } = require('../utils/manutencao');

router.use(somenteTI);
router.get('/consistencia', async (req, res, next) => {
    try {
        res.status(200).json(await verificarConsistencia());
    } catch (error) {
        next(error);
    }
});

router.post('/rotina-diaria', async (req, res, next) => {
    try {
        res.status(200).json(await executarRotinaDiaria());
    } catch (error) {
        next(error);
    }
});

module.exports = router;

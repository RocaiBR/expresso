async function listarFeriados(req, res) {
    try {
        const { ano } = req.params;
        if (!/^\d{4}$/.test(ano)) {
            return res.status(400).json({ erro: 'Informe um ano válido, ex: /feriados/2026' });
        }

        const respostas = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);

        if (!respostas.ok) {
            return res.status(respostas.status).json({ erro: 'Não foi possível buscar os feriados para esse ano.' });
        }

        const feriados = await respostas.json();
        res.status(200).json(feriados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao consultar a API externa de feriados.' });
    }
}

module.exports = { listarFeriados };
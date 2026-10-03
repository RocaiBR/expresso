const { pool } = require('./db');

// Colunas que a API usa e que bancos criados antes delas ainda não têm.
// Cada uma só é criada se estiver faltando, então rodar de novo não muda nada.
const COLUNAS_NOVAS = [
    {
        // Momento em que a tarefa foi concluída ou cancelada (usado nos relatórios)
        tabela: 'tarefas',
        coluna: 'finalizado_em',
        definicao: 'TIMESTAMP NULL DEFAULT NULL'
    }
];

async function atualizarEstruturaDoBanco() {
    for (const { tabela, coluna, definicao } of COLUNAS_NOVAS) {
        const [existentes] = await pool.query(
            `SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [tabela, coluna]
        );
        if (existentes.length === 0) {
            await pool.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
            console.log(`[DB] Coluna "${coluna}" criada na tabela "${tabela}".`);
        }
    }
}

module.exports = { atualizarEstruturaDoBanco };

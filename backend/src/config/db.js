require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testarConexao() {
    try {
        const conexao = await pool.getConnection();
        await conexao.ping();
        conexao.release();
        console.log(`[DB] Conectado ao MySQL: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
        return true;
    } catch (error) {
      console.error('[DB] Falha ao conectar no MySQL:', error.message);
      console.error('[DB] Confira o arquivo.env (DB_USER, DB_PASSWORD, DB_NAME) e se o MySQL está ligado.');
      return false;
    }
}

module.exports = { pool, testConnection: testarConexao };
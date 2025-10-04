// db.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false, // obrigatório para Render
  },
});

// teste de conexão
pool.query("SELECT NOW()")
  .then(res => console.log("Conectado ao Postgres! Hora atual:", res.rows[0].now))
  .catch(err => console.error("Erro ao conectar ao Postgres:", err));

export default pool;

import dotenv from "dotenv";
dotenv.config();

console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL);

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // obrigatório para Render
});

pool.connect()
  .then(() => console.log("✅ Conectado ao banco de dados PostgreSQL"))
  .catch(err => console.error("❌ Erro ao conectar ao Postgres:", err));

export default pool;

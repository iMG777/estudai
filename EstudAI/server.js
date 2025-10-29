// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import nodeFetch from "node-fetch";
import bcrypt from "bcrypt";
import pool from "./db.js"; // conexão PostgreSQL

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const safeFetch = globalThis.fetch ?? nodeFetch;

/* ======== FUNÇÕES AUXILIARES ======== */
function normalizarTexto(txt) {
  return (txt || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function similaridade(a, b) {
  const strA = normalizarTexto(a);
  const strB = normalizarTexto(b);
  if (!strA || !strB) return 0;
  const setA = new Set(strA.split(" "));
  const setB = new Set(strB.split(" "));
  const inter = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return inter.length / union.size;
}

// Funções auxiliares Gemini (mantidas igual)

// ======== ROTA: GERAR PERGUNTAS (Gemini) ========
app.post("/api/generate-questions", async (req, res) => {
  // código igual ao anterior
});

// ======== ROTA: CORRIGIR RESPOSTAS E ATUALIZAR MOEDAS ========
app.post("/api/submit-answers", async (req, res) => {
  try {
    const { respostas, usuarioId } = req.body;
    if (!Array.isArray(respostas)) return res.status(400).json({ error: "Campo 'respostas' precisa ser um array" });
    if (!usuarioId) return res.status(400).json({ error: "Campo 'usuarioId' é obrigatório" });

    let acertos = 0;
    const details = [];

    respostas.forEach(r => {
      const idx = r.index ?? null;
      const corretaRaw = (r.respostaCorreta ?? "").toString();
      const usuarioRaw = (r.respostaUsuario ?? "").toString();

      const usuarioNorm = normalizarTexto(usuarioRaw);
      const partesCorretas = corretaRaw
        .split(/[,/;]| ou /i)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => normalizarTexto(s));

      const vf = { v: "verdadeiro", verdadeiro: "verdadeiro", f: "falso", falso: "falso" };

      let acertou = false;
      let bestSimilarity = 0;
      let matchedCorreta = partesCorretas.length ? partesCorretas[0] : "";

      for (const c of partesCorretas) {
        const corretaFinal = vf[c] || c;
        const usuarioFinal = vf[usuarioNorm] || usuarioNorm;

        if (usuarioFinal === corretaFinal) {
          acertou = true;
          bestSimilarity = 1;
          matchedCorreta = corretaFinal;
          break;
        }

        const sim = similaridade(usuarioFinal, corretaFinal);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          matchedCorreta = corretaFinal;
        }
        if (sim >= 0.45) {
          acertou = true;
          break;
        }
      }

      if (acertou) acertos++;

      details.push({
        index: idx,
        pergunta: r.pergunta,
        correta: matchedCorreta,
        usuario: usuarioRaw,
        similarity: bestSimilarity,
        acertou
      });
    });

    // Atualiza moedas no banco
    let resultUser = await pool.query("SELECT moedas FROM usuarios WHERE id = $1", [usuarioId]);
    let moedasAtuais = (resultUser.rows[0]?.moedas) || 0;
    const moedasGanhas = acertos; // 1 moeda por acerto
    let moedasTotais = moedasAtuais + moedasGanhas;

    // 🪙 Bônus +10 se acertou todas
    if (acertos === respostas.length) moedasTotais += 10;

    await pool.query("UPDATE usuarios SET moedas = $1 WHERE id = $2", [moedasTotais, usuarioId]);

    res.json({
      total: respostas.length,
      acertos,
      erros: respostas.length - acertos,
      details,
      moedasTotais
    });

  } catch (err) {
    console.error("Erro ao corrigir:", err);
    res.status(500).json({ error: "Erro ao corrigir respostas" });
  }
});

// ======== ROTAS DE PERFIL, LOGIN E GET MOEDAS ========
// Mantidas iguais, apenas GET /api/perfil/:id e POST /api/login

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

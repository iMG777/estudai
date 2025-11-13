// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import nodeFetch from "node-fetch";
import bcrypt from "bcrypt";
import pool from "./db.js";

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

function extractTextFromGeminiResponse(apiResponse) {
  try {
    if (!apiResponse) return "";
    if (typeof apiResponse === "string") return apiResponse.trim();
    if (apiResponse.candidates?.[0]?.content?.parts?.[0]?.text)
      return apiResponse.candidates[0].content.parts[0].text.trim();
    if (apiResponse.output && typeof apiResponse.output === "string") return apiResponse.output.trim();
    return "";
  } catch {
    return "";
  }
}

function parseQuestionsFromText(text) {
  if (!text) return [];
  try {
    const maybe = text.replace(/```json/i, "").replace(/```/g, "").trim();
    const j = JSON.parse(maybe);
    if (Array.isArray(j.questions)) return j.questions;
  } catch {
    return [];
  }
  return [];
}

/* ======== ROTA: GERAR PERGUNTAS ======== */
app.post("/api/generate-questions", async (req, res) => {
  const { resumo = "", topicos = "", dificuldade = [], tipo = [] } = req.body;
  const prompt = `
Gere 10 perguntas de ${Array.isArray(tipo) ? tipo.join(", ") : tipo}
com nível de dificuldade: ${Array.isArray(dificuldade) ? dificuldade.join(", ") : dificuldade}.
Resumo: ${resumo}
Tópicos: ${topicos}
Retorne APENAS JSON no formato:
{
  "questions": [
    {"tipo": "multipla" | "vf" | "discursiva", "pergunta": "texto", "alternativas": ["A","B"], "resposta": "correta"}
  ]
}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await safeFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    const rawText = extractTextFromGeminiResponse(data);
    const questions = parseQuestionsFromText(rawText);
    res.json({ questions, rawText });
  } catch (err) {
    console.error("Erro em /api/generate-questions:", err);
    res.status(500).json({ error: err.message });
  }
});


/* ======== ROTA: CORRIGIR RESPOSTAS ======== */
app.post("/api/submit-answers", async (req, res) => {
  const { usuarioId, respostas, tema, dificuldade, tipo } = req.body;

  console.log("📥 [API] Recebido em /api/submit-answers:");
  console.log("usuarioId:", usuarioId);
  console.log("tema:", tema);
  console.log("dificuldade:", dificuldade);
  console.log("tipo:", tipo);
  console.log("qtd respostas:", Array.isArray(respostas) ? respostas.length : "N/A");

  if (!usuarioId || !Array.isArray(respostas)) {
    console.error("❌ Dados inválidos recebidos no body:", req.body);
    return res.status(400).json({ error: "Dados inválidos" });
  }

  try {
    // --- Etapa 1: cálculo de acertos
    let acertos = 0;
    const detalhes = respostas.map((r, i) => {
      const correta = (r.respostaCorreta || "").toString().trim().toLowerCase();
      const usuario = (r.respostaUsuario || "").toString().trim().toLowerCase();
      const acertou = correta === usuario;
      if (acertou) acertos++;
      return {
        index: i,
        pergunta: r.pergunta,
        correta: r.respostaCorreta,
        usuario: r.respostaUsuario,
        acertou,
      };
    });

    const total = respostas.length;
    const erros = total - acertos;
    const bonus = acertos === total ? 50 : 0;
    const moedasGanhas = acertos + bonus;

    console.log(`✅ Acertos: ${acertos}/${total} | 💰 +${moedasGanhas} moedas`);

    // --- Etapa 2: atualizar moedas do usuário
    const updateUser = await pool.query(
      "UPDATE usuarios SET moedas = moedas + $1 WHERE id = $2 RETURNING moedas",
      [moedasGanhas, usuarioId]
    );

    if (!updateUser.rows.length) {
      console.error("❌ Usuário não encontrado no banco ao atualizar moedas!");
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const moedasTotais = updateUser.rows[0].moedas;
    console.log(`🪙 Novo saldo de moedas: ${moedasTotais}`);

    // --- Etapa 3: salvar resultado no histórico
    await pool.query(
  `INSERT INTO resultados_quiz 
    (usuario_id, tema, acertos, erros, bonus, dificuldade, tipos, moedas, data_realizacao)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
  [
    usuarioId,
    tema || "Geral",
    acertos,
    erros,
    bonus,
    [dificuldade || "Não especificada"],
    [tipo || "Não especificado"],
    moedasGanhas // 👈 adiciona o total de moedas ganhas na rodada
  ]
);


    console.log("📊 Resultado salvo com sucesso no banco ✅");

    // --- Etapa final: resposta ao frontend
    res.json({
      sucesso: true,
      acertos,
      erros,
      total,
      bonus,
      moedasGanhas,
      moedasTotais,
      details: detalhes,
    });
  } catch (err) {
    console.error("💥 Erro interno em /api/submit-answers:", err);
    res.status(500).json({ error: "Erro interno ao processar respostas." });
  }
});


/* ======== ROTAS DE USUÁRIO ======== */
app.post("/api/signup", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1,$2,$3) RETURNING id,nome,email,moedas",
      [nome, email, hash]
    );
    res.json({ usuario: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Erro ao cadastrar" });
  }
});

// === Buscar histórico de quizzes do usuário ===
app.get("/api/resultados/:usuario_id", async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, tema, dificuldade, tipos, acertos, erros, bonus, moedas, data_realizacao
       FROM resultados_quiz
       WHERE usuario_id = $1
       ORDER BY data_realizacao DESC`,
      [usuario_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar resultados:", err);
    res.status(500).json({ error: "Erro interno ao buscar resultados" });
  }
});


// === Buscar dados do usuário pelo ID ===
app.get("/api/usuario/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, nome, moedas, qtdbonus, acertos, erros FROM usuarios WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({ error: "Erro interno ao buscar usuário" });
  }
});


app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: "Senha incorreta" });
    delete user.senha;
    res.json({ usuario: user });
  } catch {
    res.status(500).json({ error: "Erro no login" });
  }
});

/* ======== START ======== */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import nodeFetch from "node-fetch";
import bcrypt from "bcrypt";
import pool from "./db.js"; // <- conexão com PostgreSQL

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
    if (apiResponse.candidates && apiResponse.candidates.length > 0) {
      const parts = apiResponse.candidates[0].content?.parts;
      if (parts && parts.length > 0 && parts[0].text) return parts[0].text.trim();
    }
    if (apiResponse.output && typeof apiResponse.output === "string") return apiResponse.output.trim();
    return "";
  } catch (err) {
    console.error("Erro ao extrair texto do Gemini:", err);
    return "";
  }
}

function parseQuestionsFromText(text) {
  if (!text) return [];
  try {
    const maybe = text.replace(/```json/i, "").replace(/```/g, "").trim();
    const j = JSON.parse(maybe);
    if (Array.isArray(j.questions)) return j.questions;
  } catch (e) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const sub = text.substring(start, end + 1);
      try {
        const j2 = JSON.parse(sub);
        if (Array.isArray(j2.questions)) return j2.questions;
      } catch (e2) {
        console.error("parseQuestionsFromText: não conseguiu parsear JSON extraído", e2);
      }
    }
    console.error("parseQuestionsFromText: JSON parse falhou", e);
  }
  return [];
}

/* ======== ROTA: GERAR PERGUNTAS (Gemini) ======== */
app.post("/api/generate-questions", async (req, res) => {
  const { resumo = "", topicos = "", dificuldade = [], tipo = [] } = req.body;

  const prompt = `
Gere 10 perguntas de ${Array.isArray(tipo) ? tipo.join(", ") : tipo} 
com nível de dificuldade: ${Array.isArray(dificuldade) ? dificuldade.join(", ") : dificuldade}.
Resumo: ${resumo}
Tópicos: ${topicos}

⚠️ Retorne APENAS JSON válido no formato:
{
  "questions": [
    {
      "tipo": "multipla" | "vf" | "discursiva",
      "pergunta": "texto da pergunta",
      "alternativas": ["A", "B", "C", "D"],
      "resposta": "resposta correta ou 'Verdadeiro/Falso'"
    }
  ]
}
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada em .env");

    const response = await safeFetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro da API Gemini: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log("Resposta completa Gemini:", JSON.stringify(data, null, 2));

    const rawText = extractTextFromGeminiResponse(data) || JSON.stringify(data);
    const questions = parseQuestionsFromText(rawText);

    res.json({ questions, rawText });
  } catch (err) {
    console.error("Erro em /api/generate-questions:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* ======== ROTA: CORRIGIR RESPOSTAS ======== */
app.post("/api/submit-answers", (req, res) => {
  try {
    const { respostas } = req.body;
    if (!Array.isArray(respostas)) return res.status(400).json({ error: "Campo 'respostas' precisa ser um array" });

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

    res.json({ total: respostas.length, acertos, erros: respostas.length - acertos, details });
  } catch (err) {
    console.error("Erro ao corrigir:", err);
    res.status(500).json({ error: "Erro ao corrigir respostas" });
  }
});

/* ======== ROTA: CADASTRAR USUÁRIO ======== */
app.post("/api/signup", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Preencha todos os campos." });
    }

    // Faz o hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *",
      [nome, email, hashedPassword]
    );

    // Remove senha do objeto antes de enviar
    const usuario = result.rows[0];
    delete usuario.senha;

    res.json({ usuario });
  } catch (err) {
    console.error("Erro no /api/signup:", err);

    // Tratamento para duplicatas
    if (err.code === "23505") {
      if (err.constraint === "usuarios_email_key") {
        res.status(400).json({ error: "Este e-mail já está cadastrado." });
      } else if (err.constraint === "usuarios_nome_key") {
        res.status(400).json({ error: "Este nome de usuário já está em uso." });
      } else {
        res.status(400).json({ error: "Usuário já existente." });
      }
    } else {
      res.status(500).json({ error: "Erro ao criar conta." });
    }
  }
});



/* ======== ROTA: LOGIN ======== */
app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "Preencha todos os campos." });

    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: "Senha incorreta." });

    delete user.senha;
    res.json({ usuario: user });
  } catch (err) {
    console.error("Erro no /api/login:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

/* ======== INICIAR SERVIDOR ======== */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

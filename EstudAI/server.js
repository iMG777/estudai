// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import nodeFetch from "node-fetch"; // fallback para Node <18
import pool from "./db.js"; // importa a conexão


dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// usa global fetch se existir (Node 18+), senão usa node-fetch
const safeFetch = globalThis.fetch ?? nodeFetch;

/** Normaliza texto (remove acentos, pontuação, trim, lower) */
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

/** Similaridade simples (Jaccard sobre palavras) */
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

/** Extrai texto da resposta do Gemini (tenta vários formatos) */
function extractTextFromGeminiResponse(apiResponse) {
  try {
    if (!apiResponse) return "";
    if (typeof apiResponse === "string") return apiResponse.trim();
    if (apiResponse.candidates && apiResponse.candidates.length > 0) {
      const parts = apiResponse.candidates[0].content?.parts;
      if (parts && parts.length > 0 && parts[0].text) return parts[0].text.trim();
    }
    // fallback para procurar string em object
    if (apiResponse.output && typeof apiResponse.output === "string") return apiResponse.output.trim();
    return "";
  } catch (err) {
    console.error("Erro ao extrair texto do Gemini:", err);
    return "";
  }
}

/** Tenta extrair JSON válido do texto (mais robusto que JSON.parse direto) */
function parseQuestionsFromText(text) {
  if (!text) return [];
  // tenta JSON.parse direto
  try {
    const maybe = text.replace(/```json/i, "").replace(/```/g, "").trim();
    const j = JSON.parse(maybe);
    if (Array.isArray(j.questions)) return j.questions;
  } catch (e) {
    // tenta extrair substring que pareça JSON
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

/** Rota para gerar perguntas via Gemini */
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
      "alternativas": ["A", "B", "C", "D"], // apenas se for múltipla
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

/** Rota para corrigir respostas */
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

      // VF mapping
      const vf = {
        v: "verdadeiro",
        verdadeiro: "verdadeiro",
        f: "falso",
        falso: "falso"
      };

      let acertou = false;
      let bestSimilarity = 0;
      let matchedCorreta = partesCorretas.length ? partesCorretas[0] : "";

      for (const c of partesCorretas) {
        const corretaFinal = vf[c] || c;
        const usuarioFinal = vf[usuarioNorm] || usuarioNorm;

        // igualdade exata
        if (usuarioFinal === corretaFinal) {
          acertou = true;
          bestSimilarity = 1;
          matchedCorreta = corretaFinal;
          break;
        }

        // similaridade (útil para discursivas)
        const sim = similaridade(usuarioFinal, corretaFinal);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          matchedCorreta = corretaFinal;
        }
        // threshold (ajustável)
        if (sim >= 0.45) {
          acertou = true;
          break;
        }
      }

      if (acertou) acertos++;

      details.push({
        index: idx,
        pergunta: r.pergunta,
        corretas: partesCorretas,
        correta: matchedCorreta,
        usuario: usuarioRaw,
        usuarioNorm,
        similarity: bestSimilarity,
        acertou
      });
    });

    res.json({
      total: respostas.length,
      acertos,
      erros: respostas.length - acertos,
      details
    });
  } catch (err) {
    console.error("Erro ao corrigir:", err);
    res.status(500).json({ error: "Erro ao corrigir respostas" });
  }
});

// rota para listar todas as perguntas do banco
app.get("/admin/perguntas", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM perguntas ORDER BY id ASC");
    const rows = result.rows;

    // cria um HTML simples para visualizar
    let html = `
      <h1>Perguntas no Banco de Dados</h1>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>ID</th>
          <th>Pergunta</th>
          <th>Resposta</th>
          <th>Tipo</th>
        </tr>
    `;

    rows.forEach(row => {
      html += `
        <tr>
          <td>${row.id}</td>
          <td>${row.pergunta}</td>
          <td>${row.resposta}</td>
          <td>${row.tipo}</td>
        </tr>
      `;
    });

    html += "</table>";
    res.send(html);
  } catch (err) {
    console.error("Erro ao buscar perguntas:", err);
    res.status(500).send("Erro ao acessar o banco de dados");
  }
});

app.get("/admin/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nome, email, criado_em FROM usuarios ORDER BY id ASC");
    const usuarios = result.rows;

    // cria um HTML simples
    let html = `
      <h1>Usuários Cadastrados</h1>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Email</th>
          <th>Criado em</th>
        </tr>
    `;

    usuarios.forEach(u => {
      html += `
        <tr>
          <td>${u.id}</td>
          <td>${u.nome}</td>
          <td>${u.email}</td>
          <td>${u.criado_em}</td>
        </tr>
      `;
    });

    html += "</table>";
    res.send(html);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).send("Erro ao acessar o banco de dados");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

function extractTextFromGeminiResponse(data) {
  try {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("Erro ao extrair texto:", e);
    return "";
  }
}

function parseQuestionsFromText(text) {
  try {
    const clean = text
      .replace(/```json/i, "")
      .replace(/```/g, "")
      .trim();

    const j = JSON.parse(clean);

    if (Array.isArray(j.questions)) {
      return j.questions;
    }
  } catch (e) {
    console.error("Erro ao parsear JSON:", e, "\nTexto recebido:", text);
  }
  return [];
}

app.post("/api/generate-questions", async (req, res) => {
  const { resumo, topicos, dificuldade, tipo } = req.body;

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
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
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

    const rawText = extractTextFromGeminiResponse(data);
    const questions = parseQuestionsFromText(rawText);

    res.json({ questions, rawText });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

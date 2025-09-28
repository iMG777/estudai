import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/generate-questions", async (req, res) => {
  try {
    const { resumo, topicos, dificuldade, tipo } = req.body;

    const prompt = `
      Crie perguntas para estudo com base no seguinte conteúdo:

      Resumo: ${resumo}
      Tópicos: ${topicos}
      Nível de dificuldade: ${dificuldade.join(", ")}
      Tipo de pergunta: ${tipo.join(", ")}

      Gere perguntas claras, cada uma numerada. Se for múltipla escolha, inclua alternativas.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);

    res.json({ questions: result.response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao gerar perguntas" });
  }
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));

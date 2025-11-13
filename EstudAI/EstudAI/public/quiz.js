// quiz.js
document.getElementById("quizForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const resumo = document.getElementById("resumo")?.value.trim() || "";
  const topicos = document.getElementById("topicos")?.value.trim() || "";

  const dificuldade = Array.from(document.querySelectorAll("input[name='dificuldade']:checked")).map(el => el.value);
  const tipoPergunta = Array.from(document.querySelectorAll("input[name='tipo']:checked")).map(el => el.value);

  const perguntasDiv = document.getElementById("perguntas");
  perguntasDiv.innerHTML = "<p>Gerando perguntas...</p>";
  perguntasDiv.style.pointerEvents = "auto";
  perguntasDiv.style.opacity = "1";

  try {
    const response = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumo, topicos, dificuldade, tipo: tipoPergunta })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro na API: ${response.status} - ${text}`);
    }

    const data = await response.json();

    if (!data.questions || data.questions.length === 0) {
      perguntasDiv.innerHTML = `<p>Nenhuma pergunta foi gerada.</p>
        <pre>${data.rawText || "Sem dados retornados"}</pre>`;
      return;
    }

    perguntasDiv.innerHTML = "<h3>Perguntas Geradas:</h3>";

    const lista = document.createElement("ol");

    const criarRadio = (nome, valor) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.style.cursor = "pointer";
      label.style.display = "block";
      label.style.padding = "6px 10px";
      label.style.marginBottom = "4px";
      label.style.userSelect = "none";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = nome;
      input.value = valor;
      label.appendChild(input);
      label.appendChild(document.createTextNode(valor));
      li.appendChild(label);
      return li;
    };

    data.questions.forEach((q, idx) => {
      const item = document.createElement("li");
      item.dataset.index = idx;

      if (q && typeof q === "object" && q.pergunta) {
        let perguntaText = q.pergunta.trim();
        if (q.tipo === "vf" && !perguntaText.endsWith("?")) perguntaText += "?";

        const p = document.createElement("div");
        p.textContent = perguntaText;
        item.appendChild(p);

        if (q.tipo === "multipla" && Array.isArray(q.alternativas)) {
          const ul = document.createElement("ul");
          q.alternativas.forEach((alt) => ul.appendChild(criarRadio(`pergunta_${idx}`, alt)));
          item.appendChild(ul);
        } else if (q.tipo === "vf") {
          const ul = document.createElement("ul");
          ["Verdadeiro", "Falso"].forEach((alt) => ul.appendChild(criarRadio(`pergunta_${idx}`, alt)));
          item.appendChild(ul);
        } else if (q.tipo === "discursiva") {
          const textarea = document.createElement("textarea");
          textarea.placeholder = "Digite sua resposta...";
          textarea.name = `resposta_${idx}`;
          textarea.style.width = "100%";
          textarea.style.padding = "6px";
          textarea.style.marginTop = "4px";
          item.appendChild(textarea);
        }

        if (q.resposta) {
          const ans = document.createElement("div");
          ans.classList.add("resposta");
          ans.style.display = "none";
          ans.textContent = `Resposta correta: ${q.resposta}`;
          item.appendChild(ans);
        }
      }

      lista.appendChild(item);
    });

    perguntasDiv.appendChild(lista);

    // Botão enviar respostas
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Enviar Respostas";

    submitBtn.addEventListener("click", async () => {
      const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
      const usuarioId = usuario.id;
      if (!usuarioId) {
        alert("Usuário não encontrado. Faça login novamente.");
        return;
      }

      const respostas = data.questions.map((q, idx) => {
        let respostaUsuario = null;
        if (q.tipo === "multipla" || q.tipo === "vf") {
          const marcado = document.querySelector(`input[name="pergunta_${idx}"]:checked`);
          if (marcado) respostaUsuario = marcado.value;
        } else if (q.tipo === "discursiva") {
          const textarea = document.querySelector(`textarea[name="resposta_${idx}"]`);
          if (textarea) respostaUsuario = textarea.value.trim();
        }
        return {
          index: idx,
          tipo: q.tipo,
          pergunta: q.pergunta,
          alternativas: q.alternativas || null,
          respostaCorreta: q.resposta,
          respostaUsuario
        };
      });

      try {
        const response = await fetch("/api/submit-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ respostas, usuarioId })
        });

        if (!response.ok) {
          const txt = await response.text();
          throw new Error(`Erro na correção: ${response.status} - ${txt}`);
        }

        let result;
        try {
          result = await response.json();
        } catch {
          const text = await response.text();
          console.error("Resposta do servidor não é JSON:", text);
          throw new Error("Resposta do servidor não é JSON");
        }

        let totalMoedas = result.moedasTotais;
        let bonus = 0;
        let moedasGanhas = result.acertos;

        if (result.acertos === result.total) {
          bonus = 50;
          totalMoedas += bonus;
        }

        usuario.moedas = totalMoedas;
        localStorage.setItem("usuario", JSON.stringify(usuario));

        function numeroParaEmoji(n) {
          if (n === 10) return "🔟";
          const emojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
          if (n < 10) return emojis[n];
          return n.toString().split("").map(d => emojis[parseInt(d)]).join("");
        }

        // Container do resultado com borda
        const resultadoDiv = document.createElement("div");
        resultadoDiv.style.border = "2px solid white";
        resultadoDiv.style.borderRadius = "10px";
        resultadoDiv.style.padding = "12px";
        resultadoDiv.style.marginTop = "12px";
        resultadoDiv.style.backgroundColor = "transparent";

        // Lista de detalhes
        const detalhesUL = document.createElement("ul");
        result.details.forEach(d => {
          const li = document.createElement("li");
          const numeroEmoji = numeroParaEmoji((d.index ?? 0) + 1);
          li.innerHTML = `${numeroEmoji}: <strong>${d.acertou ? "Correta" : "Incorreta"}</strong> — Sua resposta: "${d.usuario}"`;
          li.style.color = d.acertou ? "green" : "crimson";
          detalhesUL.appendChild(li);
        });
        resultadoDiv.appendChild(detalhesUL);

        // Estatísticas
        const stats = document.createElement("div");
        stats.style.marginTop = "8px";
        stats.innerHTML = `✅ Acertos: ${result.acertos} / ${result.total} <br> ❌ Erros: ${result.erros} <br>
          💰 Moedas ganhas: ${moedasGanhas}`;
        if (bonus > 0) stats.innerHTML += `<br>🏆 Bônus: +${bonus} moedas por acertar tudo!`;
        stats.innerHTML += `<br>💰 Total de moedas: ${totalMoedas}`;

        resultadoDiv.appendChild(stats);

        const existing = document.getElementById("resultado-geral");
        if (existing) existing.remove();
        resultadoDiv.id = "resultado-geral";
        perguntasDiv.appendChild(resultadoDiv);

        submitBtn.style.display = "none";

      } catch (err) {
        console.error("Erro ao enviar respostas:", err);
        alert("Erro ao enviar respostas. Veja console (F12).");
      }
    });

    perguntasDiv.appendChild(submitBtn);

  } catch (err) {
    console.error("Erro:", err);
    perguntasDiv.innerHTML = `<p>Erro ao gerar perguntas. Veja o console.</p><pre>${err.message || String(err)}</pre>`;
  }
});

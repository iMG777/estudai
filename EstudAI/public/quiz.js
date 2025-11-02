document.getElementById("quizForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const resumo = document.getElementById("resumo")?.value.trim() || "";
  const topicos = document.getElementById("topicos")?.value.trim() || "";

  const dificuldadeSelecionada = Array.from(document.querySelectorAll("input[name='dificuldade']:checked")).map(el => el.value);
  const tiposSelecionados = Array.from(document.querySelectorAll("input[name='tipo']:checked")).map(el => el.value);

  const perguntasDiv = document.getElementById("perguntas");
  perguntasDiv.innerHTML = "<p>Gerando perguntas...</p>";
  perguntasDiv.style.pointerEvents = "auto";
  perguntasDiv.style.opacity = "1";

  try {
    const response = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumo, topicos, dificuldade: dificuldadeSelecionada, tipo: tiposSelecionados })
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
      label.style.padding = "8px 12px";
      label.style.border = "1px solid transparent";
      label.style.borderRadius = "6px";
      label.style.marginBottom = "4px";
      label.style.userSelect = "none";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = nome;
      input.value = valor;

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + valor));
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
          body: JSON.stringify({
            respostas,
            usuarioId,
            dificuldade: dificuldadeSelecionada.join(", ") || "Não especificada",
            tipo: tiposSelecionados.join(", ") || "Não especificado",
            tema: resumo || topicos || "Geral"
          })
        });

        if (!response.ok) {
          const txt = await response.text();
          throw new Error(`Erro na correção: ${response.status} - ${txt}`);
        }

        const result = await response.json();

        usuario.moedas = result.moedasTotais;
        localStorage.setItem("usuario", JSON.stringify(usuario));

        const resultadoDiv = document.createElement("div");
        resultadoDiv.style.marginTop = "12px";
        resultadoDiv.innerHTML = `
          <strong>Resultado:</strong><br>
          ✅ Acertos: ${result.acertos} / ${result.total}<br>
          ❌ Erros: ${result.erros}<br>
          💰 Total de moedas: ${result.moedasTotais}
        `;

        if (result.bonus > 0) {
          resultadoDiv.innerHTML += `<br>🎉 Bônus: +${result.bonus} moedas por acertar tudo!`;
        }

        perguntasDiv.querySelectorAll(".resposta").forEach(r => r.style.display = "block");

        const detalhesUL = document.createElement("ul");
        result.details.forEach(d => {
          const li = document.createElement("li");
          li.innerHTML = `Q${(d.index ?? 0) + 1}: <strong>${d.acertou ? "Correta" : "Incorreta"}</strong> — Sua resposta: "${d.usuario}"`;
          if (!d.acertou) li.style.color = "crimson";
          detalhesUL.appendChild(li);
        });
        resultadoDiv.appendChild(detalhesUL);

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

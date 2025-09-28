document.getElementById("quizForm").addEventListener("submit", async function (e) {
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
    console.log("Resposta da API:", data);

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
      label.style.transition = "background 0.2s";

      label.addEventListener("mouseenter", () => label.style.backgroundColor = "transparent");
      label.addEventListener("mouseleave", () => label.style.backgroundColor = "transparent");

      const input = document.createElement("input");
      input.type = "radio";
      input.name = nome;
      input.value = valor;
      input.style.marginRight = "8px";

      label.appendChild(input);
      label.appendChild(document.createTextNode(valor));
      li.appendChild(label);

      return li;
    };

    data.questions.forEach((q, idx) => {
      const item = document.createElement("li");

      if (typeof q === "string") {
        item.textContent = q;
      } else if (q && typeof q === "object" && q.pergunta) {
        let perguntaText = q.pergunta.trim();
        if (q.tipo === "vf" && !perguntaText.endsWith("?")) {
          perguntaText += "?";
        }
        const p = document.createElement("div");
        p.textContent = perguntaText;
        item.appendChild(p);

        if (q.tipo === "multipla" && q.alternativas && Array.isArray(q.alternativas)) {
          const ul = document.createElement("ul");
          q.alternativas.forEach((alt) => {
            ul.appendChild(criarRadio(`pergunta_${idx}`, alt));
          });
          item.appendChild(ul);
        }

        else if (q.tipo === "vf") {
          const ul = document.createElement("ul");
          ["Verdadeiro", "Falso"].forEach((alt) => {
            ul.appendChild(criarRadio(`pergunta_${idx}`, alt));
          });
          item.appendChild(ul);
        }

        else if (q.tipo === "discursiva") {
          const textarea = document.createElement("textarea");
          textarea.placeholder = "Digite sua resposta...";
          textarea.style.width = "100%";
          textarea.style.padding = "6px";
          textarea.style.marginTop = "4px";
          item.appendChild(textarea);
        }

        if (q.resposta) {
          const ans = document.createElement("div");
          ans.classList.add("resposta");
          ans.style.fontStyle = "italic";
          ans.style.display = "none";
          ans.textContent = `Resposta: ${q.resposta}`;
          item.appendChild(ans);
        }
      }

      lista.appendChild(item);
    });

    perguntasDiv.appendChild(lista);

    const showBtn = document.createElement("button");
    showBtn.type = "button";
    showBtn.textContent = "Mostrar Respostas";
    showBtn.style.marginTop = "12px";
    showBtn.addEventListener("click", () => {
      const respostas = perguntasDiv.querySelectorAll(".resposta");
      respostas.forEach(r => r.style.display = "block");
      showBtn.remove();
    });

    perguntasDiv.appendChild(showBtn);

  } catch (err) {
    console.error("Erro:", err);
    perguntasDiv.innerHTML = `<p>Erro ao gerar perguntas. Veja o console.</p><pre>${err.message || String(err)}</pre>`;
  }
});

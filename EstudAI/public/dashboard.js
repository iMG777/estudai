// dashboard.js
document.addEventListener("DOMContentLoaded", async () => {
  await atualizarUsuario();
  await carregarHistorico();
});

// Atualiza dados do usuário (nome e moedas)
async function atualizarUsuario() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (!usuario.id) {
    alert("Usuário não encontrado. Faça login novamente.");
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch(`/api/usuario/${usuario.id}`);
    if (!res.ok) throw new Error("Erro ao buscar usuário");

    const data = await res.json();
    document.getElementById("username").textContent = data.nome || "Usuário";
    document.getElementById("moedas").textContent = data.moedas ?? 0;
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
  }
}

// Carrega histórico de quizzes
async function carregarHistorico() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const quizHistory = document.getElementById("quizHistory");
  quizHistory.innerHTML = "<p>Carregando histórico...</p>";

  try {
    const res = await fetch(`/api/resultados/${usuario.id}`);
    if (!res.ok) throw new Error("Erro ao buscar histórico");

    const data = await res.json();

    if (data.length === 0) {
      quizHistory.innerHTML = "<p>Nenhum quiz realizado ainda.</p>";
      return;
    }

    quizHistory.innerHTML = "";
    data.forEach(r => {
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `
        <h3>🧠 ${r.tema || "Sem tema"}</h3>
        <p><strong>Acertos:</strong> ${r.acertos ?? 0} / ${(r.acertos ?? 0) + (r.erros ?? 0)}</p>
        <p class="bonus">💰 Bônus: ${r.bonus ?? 0}</p>
        <p class="tema">Tema: ${r.tema || "—"}</p>
        <p class="dificuldade">Dificuldade: ${(r.dificuldade || []).join(", ")}</p>
        <p class="tipos">Tipo: ${(r.tipos || []).join(", ")}</p>
        <p class="data">🕒 ${new Date(r.data_realizacao).toLocaleString("pt-BR")}</p>
      `;
      quizHistory.appendChild(card);
    });
  } catch (err) {
    console.error("Erro ao carregar histórico:", err);
    quizHistory.innerHTML = "<p>Erro ao carregar histórico.</p>";
  }
}

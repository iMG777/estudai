// Evita acesso ao login se já estiver logado
const usuarioLogado = localStorage.getItem("usuario");
if (usuarioLogado) {
  window.location.href = "index.html";
}


// signin.js (substitua seu arquivo)
const form = document.getElementById("loginForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    if (!email || !senha) {
      alert("Preencha email e senha.");
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        // salva usuário no localStorage para user-state.js usar
        localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));
        alert(`Bem-vindo(a), ${data.usuario.nome || data.usuario.email || "usuário"}!`);

        // tenta atualizar a UI nesta página (se existir userProfile)
        const loginLink = document.querySelector(".login");
        const userProfile = document.getElementById("userProfile");
        if (loginLink) loginLink.style.display = "none";
        if (userProfile) userProfile.style.display = "block";

        // redireciona para index (se desejar ficar na mesma página, remova a linha abaixo)
        window.location.href = "index.html";
      } else {
        alert(data.error || "Erro ao fazer login");
      }
    } catch (err) {
      alert("Erro de rede: " + (err.message || err));
    }
  });
} else {
  console.warn("signin.js: form #loginForm não encontrado.");
}
// Evita acesso ao cadastro se já estiver logado
const usuarioLogado = localStorage.getItem("usuario");
if (usuarioLogado) {
  window.location.href = "index.html";
}


// signup.js
const form = document.getElementById("signupForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpa mensagens antigas
    document.getElementById("error-username").textContent = "";
    document.getElementById("error-email").textContent = "";
    document.getElementById("error-password").textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    if (!nome || !email || !senha) {
      if (!nome) document.getElementById("error-username").textContent = "Informe um nome de usuário.";
      if (!email) document.getElementById("error-email").textContent = "Informe um email válido.";
      if (!senha) document.getElementById("error-password").textContent = "Informe uma senha.";
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        // salva o usuário
        localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));
        // redireciona para a página inicial
        window.location.href = "index.html";
      } else {
        // Trata mensagens específicas vindas do servidor
        if (data.error?.includes("e-mail")) {
          document.getElementById("error-email").textContent = data.error;
        } else if (data.error?.includes("nome")) {
          document.getElementById("error-username").textContent = data.error;
        } else {
          // Erro genérico
          document.getElementById("error-password").textContent = data.error || "Erro ao criar conta.";
        }
      }
    } catch (err) {
      document.getElementById("error-password").textContent = "Erro de rede: " + (err.message || err);
    }
  });
} else {
  console.warn("signup.js: form #signupForm não encontrado.");
}

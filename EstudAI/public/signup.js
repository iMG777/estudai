// sign-up.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const emailInput = document.querySelector("input[type='email']");
  const passwordInput = document.querySelector("input[type='password']");

  // div para exibir mensagens de erro ou sucesso
  let msgDiv = document.createElement("div");
  msgDiv.id = "signupMessage";
  msgDiv.style.marginTop = "10px";
  form.appendChild(msgDiv);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    msgDiv.textContent = ""; // limpa mensagens antigas
    msgDiv.style.color = "red";

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !email || !password) {
      msgDiv.textContent = "Preencha todos os campos!";
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: username, email, senha: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // mostra a mensagem de erro retornada pelo backend
        msgDiv.textContent = data.error || "Erro ao criar conta.";
        return;
      }

      // sucesso
      msgDiv.style.color = "green";
      msgDiv.textContent = "Conta criada com sucesso! Você pode fazer login.";

      // limpa campos
      usernameInput.value = "";
      emailInput.value = "";
      passwordInput.value = "";

    } catch (err) {
      msgDiv.textContent = "Erro de conexão com o servidor.";
      console.error(err);
    }
  });
});

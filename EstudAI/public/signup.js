const form = document.getElementById("signupForm");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const errorUsername = document.getElementById("error-username");
const errorEmail = document.getElementById("error-email");
const errorPassword = document.getElementById("error-password");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Limpa mensagens antigas
  errorUsername.textContent = "";
  errorEmail.textContent = "";
  errorPassword.textContent = "";

  const nome = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const senha = passwordInput.value.trim();

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error.includes("Email")) errorEmail.textContent = data.error;
      else if (data.error.includes("nome")) errorUsername.textContent = data.error;
      else alert(data.error);
      return;
    }

    alert(data.message);
    form.reset();
  } catch (err) {
    console.error("Erro no signup:", err);
  }
});

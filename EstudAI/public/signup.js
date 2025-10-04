// signup.js
const form = document.getElementById("signupForm");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Cria spans para erros
[usernameInput, emailInput, passwordInput].forEach(input => {
  const span = document.createElement("span");
  span.className = "error-message";
  span.style.color = "red";
  span.style.fontSize = "12px";
  span.style.marginTop = "5px";
  span.style.display = "block";
  input.parentNode.insertBefore(span, input.nextSibling);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // limpa mensagens anteriores
  document.querySelectorAll(".error-message").forEach(span => (span.textContent = ""));

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
      // trata mensagens específicas
      if (data.error.includes("Email")) {
        emailInput.nextElementSibling.textContent = data.error;
      } else if (data.error.includes("nome")) {
        usernameInput.nextElementSibling.textContent = data.error;
      } else {
        alert(data.error);
      }
      return;
    }

    // sucesso
    alert(data.message);
    form.reset();
  } catch (err) {
    console.error("Erro no signup:", err);
  }
});

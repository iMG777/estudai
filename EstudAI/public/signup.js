const form = document.getElementById("signup-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      alert("Conta criada com sucesso!");
      window.location.href = "index.html";
    } else {
      alert(data.error || "Erro ao criar conta");
    }
  } catch (err) {
    alert("Erro de rede: " + err.message);
  }
});

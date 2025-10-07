const form = document.getElementById("login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      alert(`Bem-vindo(a), ${data.usuario.nome}!`);
      window.location.href = "index.html";
    } else {
      alert(data.error || "Erro ao fazer login");
    }
  } catch (err) {
    alert("Erro de rede: " + err.message);
  }
});

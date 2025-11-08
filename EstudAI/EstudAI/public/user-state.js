document.addEventListener("DOMContentLoaded", async () => {
  const loginLink = document.querySelector(".login") ||
                    document.querySelector(".login-link") ||
                    document.getElementById("login-link");

  const userProfile = document.getElementById("userProfile");
  const logoutButton = document.getElementById("logoutButton");
  const coinsDisplay = document.getElementById("coins-display");

  // --- Recupera usuário logado do localStorage ---
  let usuario = null;
  let coins = 0;

  const usuarioStr = localStorage.getItem("usuario");
  if (usuarioStr) {
    try {
      usuario = JSON.parse(usuarioStr);
      coins = usuario.moedas ?? 0;
    } catch(e) {
      console.error("Erro ao parsear usuario do localStorage:", e);
    }
  }

  // --- Mostra/oculta elementos de login ---
  if (usuario && (usuario.email || usuario.nome || usuario.id)) {
    if (loginLink) loginLink.style.display = "none";
    if (userProfile) userProfile.style.display = "block";
  } else {
    if (loginLink) loginLink.style.display = "block";
    if (userProfile) userProfile.style.display = "none";
  }

  // --- Atualiza exibição de moedas ---
  if (coinsDisplay) {
    coinsDisplay.textContent = `💰 ${coins}`;
  }

  // --- Logout ---
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("usuario");
      if (userProfile) userProfile.style.display = "none";
      if (loginLink) loginLink.style.display = "block";
      window.location.href = "index.html";
    });
  }
});

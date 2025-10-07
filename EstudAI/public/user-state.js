document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.querySelector(".login") ||
                    document.querySelector(".login-link") ||
                    document.getElementById("login-link");

  const userProfile = document.getElementById("userProfile");
  const logoutButton = document.getElementById("logoutButton");

  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem("usuario")); }
    catch(e){ return null; }
  })();

  if (usuario && (usuario.email || usuario.nome || usuario.id)) {
    if (loginLink) loginLink.style.display = "none";
    if (userProfile) userProfile.style.display = "block";
  } else {
    if (loginLink) loginLink.style.display = "block";
    if (userProfile) userProfile.style.display = "none";
  }

  // Função de logout
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("usuario");
      // Atualiza visualmente
      if (userProfile) userProfile.style.display = "none";
      if (loginLink) loginLink.style.display = "block";
      // Redireciona para login
      window.location.href = "index.html";
    });
  }
});

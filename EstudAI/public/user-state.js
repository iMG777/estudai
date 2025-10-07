document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.querySelector(".login");
  const userProfile = document.getElementById("userProfile");

  // Verifica se o usuário está salvo no localStorage
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (usuario && usuario.email) {
    // Usuário logado → mostra o círculo do perfil
    loginLink.style.display = "none";
    userProfile.style.display = "block";
  } else {
    // Usuário não logado → mostra o botão de login
    loginLink.style.display = "block";
    userProfile.style.display = "none";
  }
});

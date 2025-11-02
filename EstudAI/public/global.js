function initializeGlobalScripts() {
  // --- MENU PRINCIPAL ---
  const subMenu = document.getElementById("subMenu");
  const openMissions = document.getElementById("openMissions");

  window.toggleMenu = function () {
    if (subMenu) subMenu.classList.toggle("open-menu");
  };

  window.toggleMissions = function () {
    if (openMissions) openMissions.classList.toggle("open-missions");
  };

  // --- NOME DO USUÁRIO ---
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  const nomeUsuario = usuario.nome || "Usuário";
  const usernameEl = document.getElementById("username");
  if (usernameEl) usernameEl.textContent = nomeUsuario;

  // --- DESTAQUE DO LINK ATIVO ---
  const menuLinks = document.querySelectorAll('.home-bar nav a');
  const currentPage = window.location.pathname.split('/').pop();

  menuLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (
      linkPage !== "#" &&
      !link.classList.contains('btn-logo') &&
      currentPage.includes(linkPage)
    ) {
      link.classList.add('active');
    }
  });
}

// Executa automaticamente ao carregar a página
window.addEventListener("DOMContentLoaded", initializeGlobalScripts);

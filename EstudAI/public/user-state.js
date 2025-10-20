document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.querySelector(".login") ||
                    document.querySelector(".login-link") ||
                    document.getElementById("login-link");

  const userProfile = document.getElementById("userProfile");
  const logoutButton = document.getElementById("logoutButton");
  const coinsDisplay = document.getElementById("coins-display");

  // --- Recupera dados do usuário ---
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem("usuario")); }
    catch(e){ return null; }
  })();

  // --- Recupera moedas e progresso ---
  let coins = parseInt(localStorage.getItem("coins")) || 0;
  let studiedOneHour = localStorage.getItem("studiedOneHour") === "true";

  // --- Mostra/oculta elementos de login ---
  if (usuario && (usuario.email || usuario.nome || usuario.id)) {
    if (loginLink) loginLink.style.display = "none";
    if (userProfile) userProfile.style.display = "block";
  } else {
    if (loginLink) loginLink.style.display = "block";
    if (userProfile) userProfile.style.display = "none";
  }

  // --- Atualiza exibição de moedas ---
  function updateCoinsDisplay() {
    if (coinsDisplay) {
      coinsDisplay.textContent = `💰 ${coins}`;
    }
  }
  updateCoinsDisplay();

  // --- Atualiza status das missões ---
  function updateMissionsStatus() {
    const studyMission = document.getElementById("studyMission");
    const quizMission = document.getElementById("quizMission");

    if (studyMission) studyMission.checked = studiedOneHour;
    if (quizMission) {
      const quizCompleted = localStorage.getItem("quizCompleted") === "true";
      quizMission.checked = quizCompleted;
    }
  }
  updateMissionsStatus();

  // --- Logout ---
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("usuario");
      if (userProfile) userProfile.style.display = "none";
      if (loginLink) loginLink.style.display = "block";
      window.location.href = "index.html";
    });
  }

  // --- Exporta função global para o cronômetro atualizar moedas e missões ---
  window.addCoinsAndCheckMissions = function(hoursPassed) {
    // +10 moedas por hora
    coins += 10;
    localStorage.setItem("coins", coins);
    updateCoinsDisplay();

    // Missão “Estude por 1 hora”
    if (hoursPassed >= 1 && !studiedOneHour) {
      studiedOneHour = true;
      localStorage.setItem("studiedOneHour", "true");
      updateMissionsStatus();
      alert("🎯 Missão concluída: Estude por 1 hora!");
    }

    alert(`🎉 Você ganhou +10 moedas! Total: ${coins}`);
  };
});

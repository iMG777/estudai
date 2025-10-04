document.addEventListener("DOMContentLoaded", () => {
    const loginLink = document.querySelector(".login-link");
    const userProfile = document.getElementById("userProfile");

    const loggedUser = JSON.parse(localStorage.getItem("user"));
    if (loggedUser) {
        // esconde botão login
        if (loginLink) loginLink.style.display = "none";

        // mostra bolinha
        if (userProfile) userProfile.style.display = "block";

        // clique na bolinha
        userProfile.addEventListener("click", () => {
            alert(`Bem-vindo, ${loggedUser.nome}!`);
            // aqui você pode abrir o perfil ou menu
        });
    }
});

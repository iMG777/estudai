const form = document.getElementById("loginForm");
const emailInput = form.querySelector('input[type="email"]');
const passwordInput = form.querySelector('input[type="password"]');
const loginButton = form.querySelector(".entrar");

const userProfile = document.getElementById("userProfile");

function showProfileCircle() {
    loginButton.style.display = "none"; // some com o botão de login
    userProfile.style.display = "block"; // mostra bolinha
}

// se o usuário já estiver logado no localStorage, mostra a bolinha
const loggedUser = JSON.parse(localStorage.getItem("user"));
if (loggedUser) {
    showProfileCircle();
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Erro ao logar");
            return;
        }

        // salva usuário no localStorage
        localStorage.setItem("user", JSON.stringify(data.usuario));

        // mostra a bolinha e esconde botão
        showProfileCircle();

    } catch (err) {
        console.error("Erro no login:", err);
    }
});

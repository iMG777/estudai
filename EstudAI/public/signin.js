const form = document.getElementById("loginForm");
const emailInput = form.querySelector('input[type="email"]');
const passwordInput = form.querySelector('input[type="password"]');

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

        // redireciona para a página inicial (onde o userState.js vai mostrar a bolinha)
        window.location.href = "index.html";

    } catch (err) {
        console.error("Erro no login:", err);
    }
});

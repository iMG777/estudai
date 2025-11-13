// ------------------------
// FORMULÁRIO DE CADASTRO
// ------------------------
const form = document.getElementById("signupForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpa mensagens de erro
    document.getElementById("error-username").textContent = "";
    document.getElementById("error-email").textContent = "";
    document.getElementById("error-password").textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    // Validação simples
    let temErro = false;
    if (!nome) {
      document.getElementById("error-username").textContent = "Informe um nome de usuário.";
      temErro = true;
    }
    if (!email) {
      document.getElementById("error-email").textContent = "Informe um email válido.";
      temErro = true;
    }
    if (!senha) {
      document.getElementById("error-password").textContent = "Informe uma senha.";
      temErro = true;
    }
    if (temErro) return;

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));
        window.location.href = "index.html";
      } else if (data.error) {
        const msg = data.error.toLowerCase();
        if (msg.includes("email") || msg.includes("e-mail")) {
          document.getElementById("error-email").textContent = data.error;
        } else if (msg.includes("nome")) {
          document.getElementById("error-username").textContent = data.error;
        } else if (msg.includes("senha")) {
          document.getElementById("error-password").textContent = data.error;
        } else {
          document.getElementById("error-password").textContent = data.error;
        }
      } else {
        document.getElementById("error-password").textContent = "Erro ao criar conta.";
      }
    } catch (err) {
      document.getElementById("error-password").textContent = "Erro de rede: " + (err.message || err);
    }
  });
} else {
  console.warn("signup.js: form #signupForm não encontrado.");
}

// ------------------------
// LOGIN COM GOOGLE
// ------------------------
function initGoogleSignIn() {
  const googleButton = document.getElementById("googleSignIn");
  if (!googleButton || !window.google) return;

  google.accounts.id.initialize({
    client_id: "SEU_CLIENT_ID_DO_GOOGLE.apps.googleusercontent.com",
    callback: handleGoogleCredentialResponse
  });

  googleButton.addEventListener("click", () => {
    google.accounts.id.prompt(); // Abre popup de login
  });
}

function handleGoogleCredentialResponse(response) {
  try {
    const token = response.credential;
    fetch("/api/google-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (ok) {
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        window.location.href = "index.html";
      } else {
        alert(data.error || "Erro no login com Google");
      }
    });
  } catch (err) {
    alert("Erro ao conectar com o Google: " + err.message);
  }
}

// Espera o SDK carregar
window.addEventListener("load", () => {
  const scriptGoogle = document.querySelector('script[src*="accounts.google.com"]');
  if (scriptGoogle) {
    scriptGoogle.onload = initGoogleSignIn;
  }
});

// ------------------------
// LOGIN COM FACEBOOK
// ------------------------
function initFacebookLogin() {
  const fbButton = document.getElementById("facebookSignIn");
  if (!fbButton || !window.FB) return;

  fbButton.addEventListener("click", () => {
    FB.login(async (response) => {
      if (response.authResponse) {
        try {
          const accessToken = response.authResponse.accessToken;
          const res = await fetch("/api/facebook-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });
          const data = await res.json();

          if (res.ok) {
            localStorage.setItem("usuario", JSON.stringify(data.usuario));
            window.location.href = "index.html";
          } else {
            alert(data.error || "Erro no login com Facebook");
          }
        } catch (err) {
          alert("Erro ao conectar com o Facebook: " + err.message);
        }
      }
    }, { scope: "email,public_profile" });
  });
}

// Chama quando o FB SDK inicializa
window.fbAsyncInit = function() {
  FB.init({
    appId: "SEU_APP_ID_DO_FACEBOOK",
    cookie: true,
    xfbml: true,
    version: "v19.0",
  });

  initFacebookLogin();
};

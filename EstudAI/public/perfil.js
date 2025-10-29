document.addEventListener("DOMContentLoaded", async () => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario || !usuario.id) {
    document.getElementById("perfilNome").innerText = "Usuário não logado";
    document.getElementById("perfilMoedas").innerText = "-";
    return;
  }

  try {
    // Faz requisição ao backend para pegar dados atualizados
    const res = await fetch(`/api/perfil/${usuario.id}`);
    if (!res.ok) throw new Error("Erro ao buscar perfil");
    const data = await res.json();

    // Mostra nome e moedas na tela
    document.getElementById("perfilNome").innerText = data.nome;
    document.getElementById("perfilMoedas").innerText = data.moedas;
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
    document.getElementById("perfilMoedas").innerText = "Erro ao carregar";
  }
});

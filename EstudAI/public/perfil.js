document.addEventListener("DOMContentLoaded", () => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario || !usuario.id) {
    document.getElementById("perfilNome").innerText = "Usuário não logado";
    document.getElementById("perfilMoedas").innerText = "-";
    return;
  }

  // Nome e moedas aparecem instantaneamente
  document.getElementById("perfilNome").innerText = usuario.nome;
  document.getElementById("perfilMoedas").innerText = usuario.moedas ?? 0;
  });
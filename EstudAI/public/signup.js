const form = document.getElementById('signupForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Conta criada com sucesso!');
            window.location.href = 'index.html'; // redireciona após criar conta
        } else {
            alert('Erro: ' + (data.error || 'Não foi possível criar a conta'));
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao criar conta');
    }
});

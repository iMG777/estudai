document.addEventListener('DOMContentLoaded', () => {
  const timerEl = document.getElementById('timer');
  const marksList = document.getElementById('marks-list');
  const studyMission = document.getElementById('studyMission'); // checkbox missão
  const encerrarBtn = document.querySelector('.encerrar'); // botão "Encerrar Estudo"

  const STUDY_MISSION_TIME = 100; // Defina o tempo da missão em centésimos

  let intervalId = 0;
  let timer = parseInt(localStorage.getItem('studyTimer')) || 0; // carregar tempo salvo
  let marks = [];

  if (studyMission) studyMission.disabled = true;

  // Carregar moedas salvas
  let moedas = parseInt(localStorage.getItem('moedas')) || 0;

  // Verificar status da missão
  let rewardGiven = localStorage.getItem('studyMissionDone') === 'true';
  if (rewardGiven && studyMission) studyMission.checked = true;

  const formatTime = (time) => {
    const hours = Math.floor(time / 360000);
    const minutes = Math.floor((time % 360000) / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    const hundredths = time % 100;
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}:${hundredths.toString().padStart(2,'0')}`;
  };

  const setTimer = (time) => {
    timerEl.innerText = formatTime(time);
  };

  const addMarkToList = (markIndex, markTime) => {
    marksList.innerHTML += `<p>Marca ${markIndex}: ${formatTime(markTime)}</p>`;
  };

  const markTime = () => {
    marks.push(timer);
    addMarkToList(marks.length, timer);
  };

  const toggleTimer = () => {
    const button = document.getElementById('power');
    let action = button.getAttribute('action');

    if (action === 'start' || action === 'continue') {
      intervalId = setInterval(() => {
        timer += 1;
        setTimer(timer);
        localStorage.setItem('studyTimer', timer);

        if (timer >= STUDY_MISSION_TIME && !rewardGiven) {
          rewardGiven = true;
          if (studyMission) studyMission.checked = true;
          moedas += 10;
          localStorage.setItem('moedas', moedas);
          localStorage.setItem('studyMissionDone', 'true');
          alert('🎉 Missão diária concluída! Você ganhou +10 moedas!');
        }
      }, 10);

      button.setAttribute('action', 'pause');
      button.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else if (action === 'pause') {
      clearInterval(intervalId);
      button.setAttribute('action', 'continue');
      button.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  };

  // Reset manual do cronômetro — apenas zera o timer, **não apaga a missão concluída**
  const resetTimer = () => {
    clearInterval(intervalId);
    timer = 0;
    setTimer(timer);
    marksList.innerHTML = '';
    const button = document.getElementById('power');
    button.setAttribute('action', 'start');
    button.innerHTML = '<i class="fa-solid fa-play"></i>';
  };

  // Botão Encerrar Estudo — salva o tempo atual e zera o cronômetro na tela
  if (encerrarBtn) {
    encerrarBtn.addEventListener('click', () => {
        clearInterval(intervalId);           // para o cronômetro
        localStorage.setItem('studyTimer', 0); // salva 0 no localStorage
        timer = 0;                           // zera o timer na memória
        setTimer(timer);                     // atualiza cronômetro na tela
        marksList.innerHTML = '';            // limpa marcas
        const button = document.getElementById('power');
        button.setAttribute('action', 'start');
        button.innerHTML = '<i class="fa-solid fa-play"></i>'; // reset ícone
    });
    }


  setTimer(timer);

  document.getElementById('power').addEventListener('click', toggleTimer);
  document.getElementById('reset').addEventListener('click', resetTimer);
  document.getElementById('mark').addEventListener('click', markTime);
});

document.addEventListener('DOMContentLoaded', () => {
  const studyMission = document.getElementById('studyMission');
  if (studyMission) {
    studyMission.disabled = true;
    const missionStatus = localStorage.getItem('studyMissionDone');
    if (missionStatus === 'true') {
      studyMission.checked = true;
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const quizMission = document.getElementById('studyMission');
  if (quizMission) {
    studyMission.disabled = true;
    const missionStatus = localStorage.getItem('quizMissionDone');
    if (missionStatus === 'true') {
      quizMission.checked = true;
    }
  }
});
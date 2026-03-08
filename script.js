const avatar = document.getElementById('avatar');
const mouth = document.getElementById('mouth');
const energy = document.getElementById('energy');
const bubble = document.getElementById('speech-bubble');
const promptInput = document.getElementById('prompt');
const talkBtn = document.getElementById('talk-btn');
const idleBtn = document.getElementById('idle-btn');
const speedSlider = document.getElementById('speed');
const speedLabel = document.getElementById('speed-label');

let speechTimer = null;
let currentUtterance = null;

function setEnergy(value) {
  const clamped = Math.max(0, Math.min(100, value));
  energy.style.width = `${clamped}%`;
  energy.parentElement.setAttribute('aria-valuenow', String(Math.round(clamped)));
}

function setIdle() {
  avatar.classList.remove('talking');
  mouth.classList.remove('speaking');
  setEnergy(0);
  if (speechTimer) {
    clearInterval(speechTimer);
    speechTimer = null;
  }
}

function animateTalking() {
  avatar.classList.add('talking');
  speechTimer = setInterval(() => {
    mouth.classList.toggle('speaking');
    setEnergy(30 + Math.random() * 70);
  }, 90);
}

function talk(text) {
  const safeText = text.trim();
  if (!safeText) {
    bubble.textContent = 'Give me a line and I will perform it on stream!';
    return;
  }

  bubble.textContent = safeText;

  if (!('speechSynthesis' in window)) {
    animateTalking();
    const ms = Math.max(1400, safeText.length * 46);
    setTimeout(setIdle, ms);
    return;
  }

  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(safeText);
  currentUtterance.pitch = 1.18;
  currentUtterance.rate = Number(speedSlider.value);

  currentUtterance.onstart = () => {
    setIdle();
    animateTalking();
  };

  currentUtterance.onend = () => {
    setIdle();
  };

  currentUtterance.onerror = () => {
    setIdle();
  };

  window.speechSynthesis.speak(currentUtterance);
}

talkBtn.addEventListener('click', () => talk(promptInput.value));
promptInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    talk(promptInput.value);
  }
});

idleBtn.addEventListener('click', () => {
  window.speechSynthesis?.cancel();
  bubble.textContent = 'Standing by, chat.';
  setIdle();
});

speedSlider.addEventListener('input', () => {
  speedLabel.textContent = `${Number(speedSlider.value).toFixed(1)}x`;
});

setIdle();

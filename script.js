const symbols = ["☀", "☾", "✿", "◆", "●", "★", "♣", "♥", "☘", "◈", "✚", "♫", "☁", "⚡", "☯", "✦", "❖", "✧"];
const board = document.querySelector("#board");
const levelSelect = document.querySelector("#levelSelect");
const timerElement = document.querySelector("#timer");
const movesElement = document.querySelector("#moves");
const bestElement = document.querySelector("#best");
const progressBar = document.querySelector("#progressBar");
const difficultyLabel = document.querySelector("#difficultyLabel");
const winModal = document.querySelector("#winModal");
const startModal = document.querySelector("#startModal");

let unlockedLevel = Math.max(1, Math.min(100, Number(localStorage.getItem("memory-unlocked")) || 1));
let level = Math.min(Number(localStorage.getItem("memory-level")) || 1, unlockedLevel);
let cards = [];
let firstCard = null;
let secondCard = null;
let moves = 0;
let matchedPairs = 0;
let seconds = 0;
let timerId = null;
let lockBoard = false;
let paused = false;
let soundEnabled = localStorage.getItem("memory-sound") !== "off";
let round = 0;
let winTimeoutId = null;
let hintTimeoutId = null;
let audioContext = null;
let ambientTimerId = null;
let ambientGain = null;
let ambientLevel = null;
let gameStarted = false;

if (localStorage.getItem("memory-theme") === "dark") document.body.classList.add("dark");

function difficultyForLevel(currentLevel) {
  if (currentLevel <= 5) return "Beginner";
  if (currentLevel <= 12) return "Easy";
  if (currentLevel <= 20) return "Medium";
  if (currentLevel <= 28) return "Hard";
  if (currentLevel <= 36) return "Difficult";
  if (currentLevel <= 44) return "Advanced";
  if (currentLevel <= 52) return "Expert";
  if (currentLevel <= 60) return "Candidate Master";
  if (currentLevel <= 68) return "Master";
  if (currentLevel <= 76) return "Leader";
  if (currentLevel <= 84) return "Grand Master";
  if (currentLevel <= 99) return "Heroic";
  return "Champion";
}

function updateLevelOptions() {
  levelSelect.innerHTML = "";
  for (let index = 1; index <= 100; index += 1) {
  const option = document.createElement("option");
  option.value = index;
    option.textContent = index <= unlockedLevel ? `Level ${index}` : `Level ${index} · Locked`;
    option.disabled = index > unlockedLevel;
    levelSelect.append(option);
  }
}

updateLevelOptions();

function updateDifficulty() {
  difficultyLabel.textContent = difficultyForLevel(level);
}

function pairsForLevel(currentLevel) {
  return Math.min(18, 3 + Math.floor((currentLevel - 1) / 6));
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function startGame(selectedLevel = level, beginImmediately = true) {
  const previousLevel = level;
  level = Math.max(1, Math.min(unlockedLevel, selectedLevel));
  const levelChanged = previousLevel !== level;
  round += 1;
  localStorage.setItem("memory-level", level);
  levelSelect.value = level;
  updateDifficulty();
  clearInterval(timerId);
  clearTimeout(winTimeoutId);
  clearTimeout(hintTimeoutId);
  winModal.hidden = true;
  gameStarted = beginImmediately;
  firstCard = null;
  secondCard = null;
  moves = 0;
  matchedPairs = 0;
  seconds = 0;
  lockBoard = false;
  paused = false;
  board.setAttribute("aria-busy", "false");
  document.querySelector("#pauseButton").innerHTML = "Pause <kbd>Space</kbd>";
  timerElement.textContent = "00:00";
  movesElement.textContent = "0";
  progressBar.style.width = `${level}%`;
  updateBest();
  renderBoard();
  if (!beginImmediately) return;
  startAmbientMusic(level);
  if (levelChanged) playLevelChangeSong(level);
  startTimer();
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    if (!paused) {
      seconds += 1;
      timerElement.textContent = formatTime(seconds);
    }
  }, 1000);
}

function renderBoard() {
  const pairCount = pairsForLevel(level);
  const deck = shuffle(symbols.slice(0, pairCount).flatMap((symbol, index) => [
    { symbol, id: index },
    { symbol, id: index },
  ]));
  cards = deck;
  board.innerHTML = deck.map((card, index) => `
    <button class="card" type="button" data-index="${index}" aria-label="Face-down card">
      <span class="card-inner"><span class="card-face card-front"></span><span class="card-face card-back">${card.symbol}</span></span>
    </button>
  `).join("");
  board.querySelectorAll(".card").forEach((card) => card.addEventListener("click", () => flipCard(card)));
}

function flipCard(card) {
  if (!gameStarted || lockBoard || paused || card === firstCard || card.classList.contains("is-matched")) return;
  card.classList.add("is-flipped");
  playTone(360, .045, "sine", .018);
  if (!firstCard) {
    firstCard = card;
    return;
  }
  secondCard = card;
  moves += 1;
  movesElement.textContent = moves;
  checkMatch();
}

function checkMatch() {
  lockBoard = true;
  const activeRound = round;
  const activeCards = cards;
  const firstSelection = firstCard;
  const secondSelection = secondCard;
  const first = activeCards[firstSelection.dataset.index];
  const second = activeCards[secondSelection.dataset.index];
  if (first.id === second.id) {
    firstSelection.classList.add("is-matched");
    secondSelection.classList.add("is-matched");
    matchedPairs += 1;
    playTone(520, .12, "sine", .04);
    setTimeout(() => playTone(780, .14, "sine", .03), 70);
    resetTurn();
    if (matchedPairs === pairsForLevel(level)) finishLevel();
    return;
  }
  playTone(150, .16, "triangle", .025);
  setTimeout(() => {
    if (round !== activeRound || cards !== activeCards) return;
    firstSelection.classList.remove("is-flipped");
    secondSelection.classList.remove("is-flipped");
    resetTurn();
  }, 700);
}

function resetTurn() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function finishLevel() {
  clearInterval(timerId);
  stopAmbientMusic();
  playWinSong();
  const bestKey = `memory-best-${level}`;
  const oldBest = Number(localStorage.getItem(bestKey));
  if (!oldBest || moves < oldBest) localStorage.setItem(bestKey, moves);
  updateBest();
  document.querySelector("#bestSummary").textContent = `Best moves: ${localStorage.getItem(bestKey)}`;
  if (level < 100) {
    unlockedLevel = Math.max(unlockedLevel, level + 1);
    localStorage.setItem("memory-unlocked", unlockedLevel);
    localStorage.setItem("memory-level", level + 1);
    updateLevelOptions();
  }
  document.querySelector("#winTitle").textContent = level === 100 ? "Wonderful! All levels complete." : "Beautifully done.";
  document.querySelector("#completionSummary").innerHTML = level === 100
    ? `You completed all 100 levels in <strong id="completedMoves">${moves}</strong> moves. Your memory is officially elite.`
    : `You cleared level <strong id="completedLevel">${level}</strong> in <strong id="completedMoves">${moves}</strong> moves.`;
  document.querySelector("#nextButton").textContent = level === 100 ? "Play again ↻" : "Next level →";
  const completedRound = round;
  winTimeoutId = setTimeout(() => {
    if (round === completedRound) winModal.hidden = false;
  }, 450);
}

function updateBest() {
  const best = localStorage.getItem(`memory-best-${level}`);
  bestElement.textContent = best ? `${best} moves` : "--";
}

function formatTime(totalSeconds) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function showHint() {
  if (lockBoard || paused || firstCard) return;
  const hidden = [...board.querySelectorAll(".card:not(.is-matched):not(.is-flipped)")];
  if (!hidden.length) return;
  const firstHint = hidden[Math.floor(Math.random() * hidden.length)];
  const hintIndex = Number(firstHint.dataset.index);
  const pairId = cards[hintIndex].id;
  const secondHint = hidden.find((card) => card !== firstHint && cards[Number(card.dataset.index)].id === pairId);
  if (!secondHint) return;
  const activeRound = round;
  lockBoard = true;
  firstHint.classList.add("is-flipped");
  secondHint.classList.add("is-flipped");
  hintTimeoutId = setTimeout(() => {
    if (round !== activeRound) return;
    firstHint.classList.remove("is-flipped");
    secondHint.classList.remove("is-flipped");
    lockBoard = false;
  }, 900);
}

function playTone(frequency, duration, type = "sine", volume = .035) {
  if (!soundEnabled) return;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  const context = audioContext;
  if (context.state === "suspended") context.resume();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function startAmbientMusic(currentLevel) {
  if (!soundEnabled) return;
  if (ambientGain && ambientLevel === currentLevel) return;
  stopAmbientMusic();
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  ambientGain = audioContext.createGain();
  ambientGain.gain.value = .8;
  ambientGain.connect(audioContext.destination);
  ambientLevel = currentLevel;
  let step = 0;
  const playAmbientNote = () => {
    if (!ambientGain || !soundEnabled) return;
    const scale = [1, 1.125, 1.25, 1.5, 1.6667, 1.5, 1.25, 1.125];
    const root = 130.81 * Math.pow(2, ((currentLevel - 1) % 12) / 12);
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = step % 4 === 0 ? "triangle" : "sine";
    oscillator.frequency.value = root * scale[step % scale.length];
    noteGain.gain.setValueAtTime(.001, now);
    noteGain.gain.exponentialRampToValueAtTime(.035, now + .08);
    noteGain.gain.exponentialRampToValueAtTime(.001, now + 1.25);
    oscillator.connect(noteGain).connect(ambientGain);
    oscillator.start(now);
    oscillator.stop(now + 1.3);
    step += 1;
  };
  playAmbientNote();
  ambientTimerId = setInterval(playAmbientNote, 1500);
}

function stopAmbientMusic() {
  clearInterval(ambientTimerId);
  ambientTimerId = null;
  ambientGain?.disconnect();
  ambientGain = null;
  ambientLevel = null;
}

function playLevelChangeSong(currentLevel) {
  if (!soundEnabled) return;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  const startTime = audioContext.currentTime;
  const root = 220 * Math.pow(2, ((currentLevel - 1) % 12) / 12);
  [root, root * 1.25, root * 1.5].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noteStart = startTime + index * .12;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.001, noteStart);
    gain.gain.exponentialRampToValueAtTime(.07, noteStart + .025);
    gain.gain.exponentialRampToValueAtTime(.001, noteStart + .32);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + .34);
  });
}

function playWinSong() {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    setTimeout(() => playTone(frequency, .22, "sine", .045), index * 100);
  });
}

document.querySelector("#restartButton").addEventListener("click", () => startGame(level));
document.querySelector("#hintButton").addEventListener("click", showHint);
document.querySelector("#pauseButton").addEventListener("click", () => {
  paused = !paused;
  document.querySelector("#pauseButton").innerHTML = paused ? "Resume <kbd>Space</kbd>" : "Pause <kbd>Space</kbd>";
});
document.querySelector("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("memory-theme", document.body.classList.contains("dark") ? "dark" : "light");
});
document.querySelector("#soundButton").addEventListener("click", (event) => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("memory-sound", soundEnabled ? "on" : "off");
  event.currentTarget.textContent = soundEnabled ? "♫" : "♩";
  if (soundEnabled && gameStarted) startAmbientMusic(level);
  if (!soundEnabled) stopAmbientMusic();
});
levelSelect.addEventListener("change", (event) => startGame(Number(event.target.value)));
document.querySelector("#closeModal").addEventListener("click", () => { winModal.hidden = true; });
document.querySelector("#replayButton").addEventListener("click", () => { winModal.hidden = true; startGame(level); });
document.querySelector("#nextButton").addEventListener("click", () => {
  winModal.hidden = true;
  startGame(level === 100 ? 1 : level + 1);
});
document.querySelector("#playButton").addEventListener("click", () => {
  gameStarted = true;
  paused = false;
  startModal.hidden = true;
  startTimer();
  startAmbientMusic(level);
  board.querySelector(".card")?.focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "h") showHint();
  if (event.code === "Space" && document.activeElement.tagName !== "BUTTON") {
    event.preventDefault();
    document.querySelector("#pauseButton").click();
  }
  if (event.key === "Escape") winModal.hidden = true;
});

if (!soundEnabled) document.querySelector("#soundButton").textContent = "♩";
startGame(level, false);
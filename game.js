'use strict';

const X = 'X';
const O = 'O';
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const STORAGE_KEY = 'tic-tac-toe:v1';
const AI_DELAY_MS = 420;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const newRoundBtn = document.getElementById('new-round');
const resetScoresBtn = document.getElementById('reset-scores');
const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
const scoreValueEls = {
  X: document.getElementById('score-x'),
  O: document.getElementById('score-o'),
  draw: document.getElementById('score-draw'),
};
const scoreLabelEls = {
  X: document.getElementById('label-x'),
  O: document.getElementById('label-o'),
};

const state = {
  board: Array(9).fill(null),
  winning: null,
  current: X,
  starter: X,
  mode: 'pvp',
  over: false,
  thinking: false,
  scores: {
    pvp: { X: 0, O: 0, draw: 0 },
    ai: { X: 0, O: 0, draw: 0 },
  },
};

let aiTimer = null;

const cells = Array.from({ length: 9 }, (_, index) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.dataset.index = String(index);
  cell.addEventListener('click', () => handleCellClick(index));
  boardEl.appendChild(cell);
  return cell;
});

/* ------------------------------------------------------------------ */
/* Game flow                                                           */
/* ------------------------------------------------------------------ */

function handleCellClick(index) {
  if (state.over || state.board[index] || state.thinking) return;
  if (state.mode === 'ai' && state.current === O) return;
  play(index);
}

function play(index) {
  if (state.over || state.board[index]) return;

  const player = state.current;
  state.board[index] = player;
  state.winning = findWin(state.board);

  let scored = null;
  if (state.winning) {
    state.over = true;
    state.scores[state.mode][player] += 1;
    scored = player;
  } else if (!state.board.includes(null)) {
    state.over = true;
    state.scores[state.mode].draw += 1;
    scored = 'draw';
  } else {
    state.current = player === X ? O : X;
  }

  render();
  popCell(index);
  if (scored) bumpScore(scored);
  save();

  if (!state.over && state.mode === 'ai' && state.current === O) scheduleAi();
}

function startRound(starter) {
  state.board = Array(9).fill(null);
  state.winning = null;
  state.over = false;
  state.thinking = false;
  state.current = starter;
  render();
  if (state.mode === 'ai' && state.current === O) scheduleAi();
}

function newRound() {
  cancelAi();
  const nextStarter = state.mode === 'pvp'
    ? (state.starter === X ? O : X)
    : X;
  state.starter = nextStarter;
  startRound(nextStarter);
}

function setMode(mode) {
  if (mode !== 'pvp' && mode !== 'ai') return;
  if (state.mode === mode) return;

  state.mode = mode;
  state.starter = X;
  cancelAi();
  updateModeUI();
  startRound(X);
  save();
}

function resetScores() {
  state.scores = {
    pvp: { X: 0, O: 0, draw: 0 },
    ai: { X: 0, O: 0, draw: 0 },
  };
  updateScores();
  save();
}

/* ------------------------------------------------------------------ */
/* Computer opponent (minimax — cannot be beaten)                      */
/* ------------------------------------------------------------------ */

function scheduleAi() {
  state.thinking = true;
  render();

  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    state.thinking = false;

    if (state.over || state.current !== O) {
      render();
      return;
    }

    const move = chooseMove(state.board);
    if (move !== -1) play(move);
  }, AI_DELAY_MS);
}

function cancelAi() {
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
  state.thinking = false;
}

function chooseMove(board) {
  const { index } = minimax(board.slice(), O, 0);
  return index ?? -1;
}

function minimax(board, player, depth) {
  const win = findWin(board);
  if (win) {
    const winner = board[win[0]];
    return { score: winner === O ? 10 - depth : depth - 10 };
  }
  if (!board.includes(null)) {
    return { score: 0 };
  }

  let bestScore = player === O ? -Infinity : Infinity;
  let bestMoves = [];

  for (let index = 0; index < board.length; index += 1) {
    if (board[index]) continue;

    board[index] = player;
    const { score } = minimax(board, player === O ? X : O, depth + 1);
    board[index] = null;

    const better = player === O ? score > bestScore : score < bestScore;
    if (better) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }

  const index = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return { index, score: bestScore };
}

function findWin(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  const locked = state.over || (state.mode === 'ai' && state.current === O);

  state.board.forEach((mark, index) => {
    const cell = cells[index];
    const isWinningCell = Boolean(state.winning && state.winning.includes(index));

    cell.textContent = mark ?? '';
    cell.classList.toggle('is-filled', Boolean(mark));
    cell.classList.toggle('mark--x', mark === X);
    cell.classList.toggle('mark--o', mark === O);
    cell.classList.toggle('is-win', isWinningCell);
    cell.disabled = locked || Boolean(mark);
    cell.setAttribute(
      'aria-label',
      mark ? `Cell ${index + 1}, ${mark}` : `Cell ${index + 1}, empty`,
    );
  });

  updateStatus();
  updateScores();
}

function updateStatus() {
  statusEl.classList.remove('status--win', 'status--draw');

  if (state.winning) {
    const winner = state.board[state.winning[0]];
    statusEl.textContent = state.mode === 'ai'
      ? (winner === X ? 'You win!' : 'Computer wins')
      : `${winner} wins!`;
    statusEl.classList.add('status--win');
    return;
  }

  if (state.over) {
    statusEl.textContent = "It's a draw";
    statusEl.classList.add('status--draw');
    return;
  }

  if (state.mode === 'ai') {
    statusEl.textContent = state.current === X ? 'Your turn' : 'Computer is thinking…';
  } else {
    statusEl.textContent = `${state.current}'s turn`;
  }
}

function updateScores() {
  const scores = state.scores[state.mode];
  scoreValueEls.X.textContent = String(scores.X);
  scoreValueEls.O.textContent = String(scores.O);
  scoreValueEls.draw.textContent = String(scores.draw);
}

function updateModeUI() {
  for (const button of modeButtons) {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }

  const aiMode = state.mode === 'ai';
  scoreLabelEls.X.textContent = aiMode ? 'You' : 'Player X';
  scoreLabelEls.O.textContent = aiMode ? 'Computer' : 'Player O';
}

function popCell(index) {
  const cell = cells[index];
  cell.classList.remove('is-new');
  void cell.offsetWidth;
  cell.classList.add('is-new');
  cell.addEventListener(
    'animationend',
    () => cell.classList.remove('is-new'),
    { once: true },
  );
}

function bumpScore(key) {
  const el = scoreValueEls[key];
  if (!el) return;
  el.classList.remove('is-bumped');
  void el.offsetWidth;
  el.classList.add('is-bumped');
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function isScoreSet(value) {
  return Boolean(value)
    && ['X', 'O', 'draw'].every(
      (key) => Number.isFinite(value[key]) && value[key] >= 0,
    );
}

function loadSaved() {
  let data;
  try {
    data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return;
  }
  if (!data || typeof data !== 'object') return;

  if (data.mode === 'ai' || data.mode === 'pvp') {
    state.mode = data.mode;
  }

  for (const mode of ['pvp', 'ai']) {
    const entry = data.scores?.[mode];
    if (isScoreSet(entry)) {
      state.scores[mode] = { X: entry.X, O: entry.O, draw: entry.draw };
    }
  }
}

function save() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: state.mode, scores: state.scores }),
    );
  } catch {
    /* Storage unavailable — scores simply reset on reload. */
  }
}

/* ------------------------------------------------------------------ */
/* Keyboard navigation + wiring                                        */
/* ------------------------------------------------------------------ */

boardEl.addEventListener('keydown', (event) => {
  const index = cells.indexOf(document.activeElement);
  if (index === -1) return;

  let next = null;
  switch (event.key) {
    case 'ArrowLeft':
      if (index % 3 > 0) next = index - 1;
      break;
    case 'ArrowRight':
      if (index % 3 < 2) next = index + 1;
      break;
    case 'ArrowUp':
      if (index >= 3) next = index - 3;
      break;
    case 'ArrowDown':
      if (index <= 5) next = index + 3;
      break;
    default:
      return;
  }

  if (next === null) return;
  event.preventDefault();
  cells[next].focus();
});

for (const button of modeButtons) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

newRoundBtn.addEventListener('click', newRound);
resetScoresBtn.addEventListener('click', resetScores);

loadSaved();
updateModeUI();
startRound(X);

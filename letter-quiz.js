/**
 * Главные вкладки («Текст» / «Тест») и тест по выбранным буквам.
 * Использует глобальную playGeorgianLetterSound из script.js.
 */

const LETTER_QUIZ_FEEDBACK_MS = 1000;

function initMainTabs() {
  const tablist = document.querySelector('[data-main-tabs-tablist]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) =>
    document.getElementById(t.getAttribute('aria-controls'))
  );
  if (panels.some((p) => !p)) return;

  function activate(index) {
    tabs.forEach((tab, i) => {
      const sel = i === index;
      tab.setAttribute('aria-selected', sel);
      tab.tabIndex = sel ? 0 : -1;
      panels[i].hidden = !sel;
    });
  }

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab || !tabs.includes(tab)) return;
    activate(tabs.indexOf(tab));
  });

  tablist.addEventListener('keydown', (e) => {
    const current = tabs.findIndex(
      (t) => t.getAttribute('aria-selected') === 'true'
    );
    let next = current;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (current + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    tabs[next].focus();
    activate(next);
  });
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getQuizLetterPool() {
  const pool = [];
  document
    .querySelectorAll('.alphabet__character-checkbox-input')
    .forEach((input) => {
      if (!input.checked) return;
      const card = input.closest('.alphabet__card');
      const img = card?.querySelector('.alphabet__card-thumb-img');
      pool.push({
        geo: input.name,
        ru: (input.value || '').trim(),
        imgSrc: img?.getAttribute('src') || '',
      });
    });
  return pool;
}

/**
 * Очередь: сначала по одному разу каждая выбранная буква (перемешано),
 * затем равномерные «волны» перестановок, пока не доберём nQ вопросов.
 */
function buildQuestionQueue(pool, nQ) {
  const n = pool.length;
  if (nQ <= 0 || n === 0) return [];
  if (nQ <= n) {
    const sh = pool.map((p) => p);
    shuffleInPlace(sh);
    return sh.slice(0, nQ);
  }
  const out = [];
  const first = pool.map((p) => p);
  shuffleInPlace(first);
  for (let i = 0; i < n; i++) out.push(first[i]);
  let remaining = nQ - n;
  while (remaining > 0) {
    const order = [...Array(n).keys()];
    shuffleInPlace(order);
    for (const i of order) {
      if (remaining <= 0) break;
      out.push(pool[i]);
      remaining--;
    }
  }
  return out;
}

/** Число колонок сетки вариантов: компактно (4 → 2×2, 6 → 3×2, …). */
function choiceGridColumns(optionCnt) {
  switch (optionCnt) {
    case 4:
      return 2;
    case 5:
    case 6:
      return 3;
    case 7:
    case 8:
      return 4;
    case 9:
      return 3;
    case 10:
      return 5;
    default:
      if (optionCnt <= 3) return optionCnt;
      return Math.min(5, Math.ceil(optionCnt / 2));
  }
}

function initLetterQuiz() {
  const setup = document.getElementById('letter-quiz-setup');
  const play = document.getElementById('letter-quiz-play');
  const done = document.getElementById('letter-quiz-done');
  const err = document.getElementById('letter-quiz-error');
  const inputCount = document.getElementById('letter-quiz-count');
  const inputOptions = document.getElementById('letter-quiz-options');
  const btnStart = document.getElementById('letter-quiz-start');
  const btnReplay = document.getElementById('letter-quiz-replay');
  const btnReset = document.getElementById('letter-quiz-reset');
  const progressEl = document.getElementById('letter-quiz-progress');
  const geoEl = document.getElementById('letter-quiz-geo');
  const imgEl = document.getElementById('letter-quiz-img');
  const choicesEl = document.getElementById('letter-quiz-choices');
  const doneText = document.getElementById('letter-quiz-done-text');
  const statsEl = document.getElementById('letter-quiz-stats');

  if (
    !setup ||
    !play ||
    !done ||
    !inputCount ||
    !inputOptions ||
    !btnStart ||
    !choicesEl
  ) {
    return;
  }

  let queue = [];
  let qIndex = 0;
  let optionCount = 4;
  let solved = false;
  /** Неверные нажатия по вариантам (всего за сессию). */
  let wrongAttempts = 0;
  /** Совпадения с правильным ответом (вопросов завершено). */
  let correctAnswers = 0;
  let feedbackTimer = null;

  function clearFeedbackTimer() {
    if (feedbackTimer != null) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
  }

  function showError(msg) {
    if (!err) return;
    err.textContent = msg;
    err.classList.add('letter-quiz__error--visible');
  }

  function hideError() {
    if (!err) return;
    err.classList.remove('letter-quiz__error--visible');
    err.textContent = '';
  }

  function resetSessionStats() {
    wrongAttempts = 0;
    correctAnswers = 0;
  }

  function showSetup() {
    clearFeedbackTimer();
    setup.hidden = false;
    play.hidden = true;
    done.hidden = true;
    hideError();
    if (statsEl) statsEl.textContent = '';
    if (doneText) doneText.textContent = '';
  }

  function showDone() {
    setup.hidden = true;
    play.hidden = true;
    done.hidden = false;
    if (statsEl) {
      statsEl.textContent = [
        'Результат',
        `Правильных ответов: ${correctAnswers}`,
        `Неверных попыток: ${wrongAttempts}`,
        `Вопросов в тесте: ${queue.length}`,
      ].join('\n');
    }
    if (doneText) {
      doneText.textContent = 'Можно начать новый тест с теми же или другими настройками.';
    }
  }

  function applyChoicesGrid(n) {
    const cols = choiceGridColumns(n);
    choicesEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  }

  function buildQuestion(correct) {
    clearFeedbackTimer();
    const pool = getQuizLetterPool();
    const others = pool.filter((p) => p.geo !== correct.geo);
    shuffleInPlace(others);
    const needWrong = Math.min(optionCount - 1, others.length);
    const wrong = others.slice(0, needWrong);
    const opts = shuffleInPlace([correct, ...wrong]);
    const ruCounts = {};
    opts.forEach((o) => {
      const r = o.ru || '—';
      ruCounts[r] = (ruCounts[r] || 0) + 1;
    });

    geoEl.textContent = correct.geo;
    if (correct.imgSrc && imgEl) {
      imgEl.src = correct.imgSrc;
      imgEl.alt = `Образец почерта буквы ${correct.geo}`;
      imgEl.classList.remove('letter-quiz__thumb--hidden');
    } else if (imgEl) {
      imgEl.removeAttribute('src');
      imgEl.alt = '';
      imgEl.classList.add('letter-quiz__thumb--hidden');
    }

    choicesEl.replaceChildren();
    applyChoicesGrid(opts.length);

    opts.forEach((opt) => {
      const r = opt.ru || '—';
      const lbl = ruCounts[r] > 1 ? `${r} (${opt.geo})` : r;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letter-quiz__choice';
      btn.dataset.geo = opt.geo;
      btn.setAttribute(
        'aria-label',
        `${lbl}: прослушать произношение соответствующей грузинской буквы`
      );
      btn.textContent = lbl;

      btn.addEventListener('click', () => onChoice(btn, correct.geo));
      choicesEl.appendChild(btn);
    });

    solved = false;
    progressEl.textContent = `Вопрос ${qIndex + 1} из ${queue.length}`;
  }

  function onChoice(btn, correctGeo) {
    const geo = btn.dataset.geo;
    if (typeof playGeorgianLetterSound === 'function') {
      playGeorgianLetterSound(geo);
    }
    if (solved) return;

    const isCorrect = geo === correctGeo;
    if (isCorrect) {
      clearFeedbackTimer();
      btn.classList.add('letter-quiz__choice--correct');
      solved = true;
      correctAnswers += 1;
      choicesEl.querySelectorAll('.letter-quiz__choice').forEach((b) => {
        b.disabled = true;
      });
      qIndex += 1;
      feedbackTimer = window.setTimeout(() => {
        feedbackTimer = null;
        if (qIndex >= queue.length) {
          showDone();
        } else {
          buildQuestion(queue[qIndex]);
        }
      }, LETTER_QUIZ_FEEDBACK_MS);
    } else {
      wrongAttempts += 1;
      btn.classList.add('letter-quiz__choice--wrong');
      btn.disabled = true;
      window.setTimeout(() => {
        btn.classList.remove('letter-quiz__choice--wrong');
      }, LETTER_QUIZ_FEEDBACK_MS);
    }
  }

  btnStart.addEventListener('click', () => {
    hideError();
    const pool = getQuizLetterPool();
    const nQ = Math.max(
      1,
      Math.min(500, parseInt(String(inputCount.value).trim(), 10) || 10)
    );
    optionCount = Math.max(
      4,
      Math.min(10, parseInt(String(inputOptions.value).trim(), 10) || 4)
    );
    inputCount.value = String(nQ);
    inputOptions.value = String(optionCount);

    if (pool.length < 2) {
      showError(
        'Отметьте в сетке алфавита хотя бы две буквы, чтобы собрать варианты ответа.'
      );
      return;
    }
    if (pool.length < optionCount) {
      showError(
        `Для ${optionCount} вариантов ответа отметьте не меньше ${optionCount} разных букв (сейчас ${pool.length}).`
      );
      return;
    }

    resetSessionStats();
    queue = buildQuestionQueue(pool, nQ);
    qIndex = 0;
    setup.hidden = true;
    play.hidden = false;
    done.hidden = true;
    buildQuestion(queue[0]);
  });

  function hardReset() {
    clearFeedbackTimer();
    queue = [];
    qIndex = 0;
    solved = false;
    resetSessionStats();
    showSetup();
  }

  btnReset?.addEventListener('click', hardReset);
  btnReplay?.addEventListener('click', showSetup);
}

initMainTabs();
initLetterQuiz();

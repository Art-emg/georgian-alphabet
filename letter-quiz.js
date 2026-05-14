const LETTER_QUIZ_FEEDBACK_MS = 1000;

const LETTER_QUIZ_VOICE_KEY = 'georgian-letter-quiz-voice-enabled';

/** Включено ли воспроизведение звука буквы при нажатии на вариант в тесте. */
function loadLetterQuizVoicePref() {
  try {
    const raw = localStorage.getItem(LETTER_QUIZ_VOICE_KEY);
    if (raw === '0' || raw === 'false') return false;
  } catch (_) {}
  return true;
}

function saveLetterQuizVoicePref(on) {
  try {
    localStorage.setItem(LETTER_QUIZ_VOICE_KEY, on ? '1' : '0');
  } catch (_) {}
}

const QUIZ_LETTER_STATS_KEY = 'georgian-alphabet-quiz-letter-stats';
const QUIZ_LETTER_STATS_WINDOW = 15;
const QUIZ_BADGES_PIN_KEY = 'georgian-alphabet-quiz-badges-pinned';

function loadQuizBadgesPinned() {
  try {
    return localStorage.getItem(QUIZ_BADGES_PIN_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function saveQuizBadgesPinned(on) {
  try {
    if (on) localStorage.setItem(QUIZ_BADGES_PIN_KEY, '1');
    else localStorage.removeItem(QUIZ_BADGES_PIN_KEY);
  } catch (_) {}
}

function shouldShowQuizStatBadges() {
  return isLetterQuizTabActive() || loadQuizBadgesPinned();
}

function quizLetterNormalizeKey(letter) {
  const ch = letter && [...String(letter).trim()][0];
  if (!ch) return null;
  const cp = ch.codePointAt(0);
  if (cp < 0x10a0 || cp > 0x10ff) return null;
  return ch;
}

function loadLetterQuizStats() {
  try {
    const raw = localStorage.getItem(QUIZ_LETTER_STATS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      const key = quizLetterNormalizeKey(k);
      if (!key || !Array.isArray(v)) continue;
      const bools = v
        .filter((x) => x === true || x === false)
        .slice(-QUIZ_LETTER_STATS_WINDOW);
      if (bools.length > 0) out[key] = bools;
    }
    return out;
  } catch (_) {
    return {};
  }
}

function saveLetterQuizStats(map) {
  try {
    localStorage.setItem(QUIZ_LETTER_STATS_KEY, JSON.stringify(map));
  } catch (_) {}
}

function recordLetterQuizAttempt(letter, ok) {
  const key = quizLetterNormalizeKey(letter);
  if (!key) return;
  const map = loadLetterQuizStats();
  const prev = Array.isArray(map[key]) ? map[key] : [];
  const next = [...prev, !!ok].slice(-QUIZ_LETTER_STATS_WINDOW);
  map[key] = next;
  saveLetterQuizStats(map);
  refreshQuizLetterStatBadges();
}

function isLetterQuizTabActive() {
  const tab = document.getElementById('main-tab-quiz');
  return tab?.getAttribute('aria-selected') === 'true';
}

function refreshQuizLetterStatBadges() {
  const show = shouldShowQuizStatBadges();
  const map = loadLetterQuizStats();
  document.querySelectorAll('.alphabet__card[data-letter]').forEach((card) => {
    let el = card.querySelector('.alphabet__card-quiz-stat');
    if (!el) {
      el = document.createElement('span');
      el.className = 'alphabet__card-quiz-stat';
      el.setAttribute('aria-hidden', 'true');
      card.prepend(el);
    }
    const letter = card.dataset.letter;
    const arr = map[letter] || [];
    const n = arr.length;
    if (!show || n === 0) {
      el.hidden = true;
      el.textContent = '';
      el.removeAttribute('title');
      el.classList.remove(
        'alphabet__card-quiz-stat--warn',
        'alphabet__card-quiz-stat--bad'
      );
      return;
    }
    el.classList.remove(
      'alphabet__card-quiz-stat--warn',
      'alphabet__card-quiz-stat--bad'
    );
    const correct = arr.filter(Boolean).length;
    el.textContent = `${correct}/${n}`;
    el.title = `Верно за последние ${n} попыток на букве: ${correct}/${n} (учитываются последние ${QUIZ_LETTER_STATS_WINDOW} ответов, оценивается только первый выбор в каждом вопросе)`;
    if (n > 5) {
      const rate = correct / n;
      if (rate < 0.3) el.classList.add('alphabet__card-quiz-stat--bad');
      else if (rate < 0.6) el.classList.add('alphabet__card-quiz-stat--warn');
    }
    el.hidden = false;
  });
}

function syncQuizBadgesToggleButton() {
  const btn = document.getElementById('alphabet-quiz-stats-toggle');
  if (!btn) return;
  const pinned = loadQuizBadgesPinned();
  btn.setAttribute('aria-pressed', pinned ? 'true' : 'false');
  btn.textContent = pinned
    ? 'Скрыть счёт теста на буквах'
    : 'Показать счёт теста на буквах';
}

function initQuizBadgesToggleButton() {
  const btn = document.getElementById('alphabet-quiz-stats-toggle');
  if (!btn) return;
  syncQuizBadgesToggleButton();
  btn.addEventListener('click', () => {
    saveQuizBadgesPinned(!loadQuizBadgesPinned());
    syncQuizBadgesToggleButton();
    refreshQuizLetterStatBadges();
  });
}

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
    refreshQuizLetterStatBadges();
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

function getQuizRuParts(card, valueFallback) {
  const shortEl = card?.querySelector(
    '.alphabet__card-ru-block .alphabet__card-ru-short'
  );
  const parenEl = card?.querySelector(
    '.alphabet__card-ru-block .alphabet__card-ru-paren'
  );
  if (shortEl) {
    const main = shortEl.textContent.trim();
    let parenInside = '';
    if (parenEl) {
      parenInside = parenEl.textContent
        .replace(/^\s*\(/, '')
        .replace(/\)\s*$/, '')
        .trim();
    }
    return { main, parenInside };
  }

  const legacy = card?.querySelector('.alphabet__card-main .alphabet__card-ru');
  const raw = (legacy?.textContent || valueFallback || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\?/g, '');
  const lm = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (lm) return { main: lm[1].trim(), parenInside: lm[2].trim() };
  return { main: raw || '—', parenInside: '' };
}

function quizRuKey(parts) {
  return parts.parenInside
    ? `${parts.main} (${parts.parenInside})`
    : parts.main;
}

function getQuizLetterPool() {
  const pool = [];
  const cap =
    typeof window.getGeorgianAlphabetCaptionMode === 'function'
      ? window.getGeorgianAlphabetCaptionMode()
      : 'classic';
  document
    .querySelectorAll('.alphabet__character-checkbox-input')
    .forEach((input) => {
      if (!input.checked) return;
      const card = input.closest('.alphabet__card');
      const img = card?.querySelector('.alphabet__card-thumb-img');

      let ruMain;
      let ruParen;
      let ruKey;
      if (
        typeof window.getGeorgianLetterCaptionParts === 'function' &&
        typeof window.getGeorgianQuizLabelKey === 'function'
      ) {
        const pr = window.getGeorgianLetterCaptionParts(input.name, cap);
        ruMain = pr.main;
        ruParen = pr.paren || '';
        ruKey = window.getGeorgianQuizLabelKey(input.name, cap);
      } else {
        const parts = getQuizRuParts(card, input.value);
        ruMain = parts.main;
        ruParen = parts.parenInside;
        ruKey = quizRuKey(parts);
      }

      pool.push({
        geo: input.name,
        ruMain,
        ruParen,
        ruKey,
        imgSrc: img?.getAttribute('src') || '',
      });
    });
  return pool;
}

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
  const voiceSwitch = document.getElementById('letter-quiz-voice-switch');
  const progressEl = document.getElementById('letter-quiz-progress');
  const geoEl = document.getElementById('letter-quiz-geo');
  const imgEl = document.getElementById('letter-quiz-img');
  const choicesEl = document.getElementById('letter-quiz-choices');
  const doneText = document.getElementById('letter-quiz-done-text');
  const statsEl = document.getElementById('letter-quiz-stats');

  window.refreshLetterQuizIfActive = function refreshLetterQuizIfActiveNoop() {};

  function applyLetterVoiceUi(on) {
    if (!voiceSwitch) return;
    voiceSwitch.setAttribute('aria-checked', on ? 'true' : 'false');
    voiceSwitch.classList.toggle('quiz-voice-switch--off', !on);
  }

  function letterQuizVoiceEnabled() {
    return voiceSwitch
      ? voiceSwitch.getAttribute('aria-checked') === 'true'
      : loadLetterQuizVoicePref();
  }

  if (voiceSwitch) {
    applyLetterVoiceUi(loadLetterQuizVoicePref());
    voiceSwitch.addEventListener('click', () => {
      const next = !(voiceSwitch.getAttribute('aria-checked') === 'true');
      saveLetterQuizVoicePref(next);
      applyLetterVoiceUi(next);
    });
  }

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
  let firstChoiceRecorded = false;
  let wrongAttempts = 0;
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
    /** Актуальные подписи из текущего режима и отмеченных букв (очередь теста хранит снимок). */
    const correctFresh =
      pool.find((p) => p.geo === correct.geo) ||
      correct;

    const others = pool.filter((p) => p.geo !== correctFresh.geo);
    shuffleInPlace(others);
    const needWrong = Math.min(optionCount - 1, others.length);
    const wrong = others.slice(0, needWrong);
    const opts = shuffleInPlace([correctFresh, ...wrong]);
    const ruCounts = {};
    opts.forEach((o) => {
      const k = o.ruKey || '—';
      ruCounts[k] = (ruCounts[k] || 0) + 1;
    });

    if (geoEl) {
      geoEl.dataset.mkhedruli = correctFresh.geo;
      geoEl.textContent =
        typeof window.toDisplayGeorgianGlyph === 'function' &&
        typeof window.getGeorgianGlyphStyle === 'function'
          ? window.toDisplayGeorgianGlyph(
              correctFresh.geo,
              window.getGeorgianGlyphStyle()
            )
          : correctFresh.geo;
    }
    if (correctFresh.imgSrc && imgEl) {
      imgEl.src = correctFresh.imgSrc;
      imgEl.alt = `Образец почерта буквы ${correctFresh.geo}`;
      imgEl.classList.remove('letter-quiz__thumb--hidden');
    } else if (imgEl) {
      imgEl.removeAttribute('src');
      imgEl.alt = '';
      imgEl.classList.add('letter-quiz__thumb--hidden');
    }

    choicesEl.replaceChildren();
    applyChoicesGrid(opts.length);

    opts.forEach((opt, ix) => {
      const k = opt.ruKey || '—';
      let dupSuffix = '';
      if (ruCounts[k] > 1) {
        const before = opts
          .slice(0, ix)
          .filter((x) => (x.ruKey || '—') === k).length;
        dupSuffix = `${before + 1}/${ruCounts[k]}`;
      }

      const ariaBase =
        (opt.ruParen ? `${opt.ruMain} (${opt.ruParen})` : opt.ruMain) +
        (dupSuffix ? ` ${dupSuffix}` : '');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'letter-quiz__choice';
      btn.dataset.geo = opt.geo;
      btn.setAttribute(
        'aria-label',
        `${ariaBase}: прослушать произношение соответствующей грузинской буквы`
      );

      const mainSpan = document.createElement('span');
      mainSpan.className = 'letter-quiz__choice-main';
      mainSpan.textContent = opt.ruMain || '—';
      btn.appendChild(mainSpan);

      if (opt.ruParen) {
        const pSpan = document.createElement('span');
        pSpan.className = 'letter-quiz__choice-paren';
        pSpan.textContent = `(${opt.ruParen})`;
        btn.appendChild(pSpan);
      }

      if (dupSuffix) {
        const dSpan = document.createElement('span');
        dSpan.className = 'letter-quiz__choice-dup';
        dSpan.textContent = `\u00a0${dupSuffix}`;
        btn.appendChild(dSpan);
      }

      btn.addEventListener('click', () => onChoice(btn, correctFresh.geo));
      choicesEl.appendChild(btn);
    });

    solved = false;
    firstChoiceRecorded = false;
    progressEl.textContent = `Вопрос ${qIndex + 1}/${queue.length}`;
  }

  function onChoice(btn, correctGeo) {
    const geo = btn.dataset.geo;
    if (
      letterQuizVoiceEnabled() &&
      typeof playGeorgianLetterSound === 'function'
    ) {
      playGeorgianLetterSound(geo);
    }
    if (solved) return;

    const isCorrect = geo === correctGeo;

    if (!firstChoiceRecorded) {
      firstChoiceRecorded = true;
      recordLetterQuizAttempt(correctGeo, isCorrect);
      if (isCorrect) correctAnswers += 1;
      else wrongAttempts += 1;
    }

    if (isCorrect) {
      clearFeedbackTimer();
      btn.classList.add('letter-quiz__choice--correct');
      solved = true;
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

  /** Перерисовать текущий вопрос под новый «Аналог звука» / чертание без смены прогресса. */
  function refreshLetterQuizIfActive() {
    if (!setup.hidden) return;
    if (!done.hidden) return;
    if (!queue.length || qIndex >= queue.length) return;
    if (feedbackTimer != null) return;
    buildQuestion(queue[qIndex]);
  }

  window.refreshLetterQuizIfActive = refreshLetterQuizIfActive;
}

initQuizBadgesToggleButton();
initMainTabs();
refreshQuizLetterStatBadges();
initLetterQuiz();

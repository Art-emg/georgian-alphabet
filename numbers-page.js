const NUMBERS_QUIZ_FEEDBACK_MS = 1000;

/** Верхний предел «Вопросов»; внутри умножитель на размер пула. */
const NUMBERS_QUIZ_HARD_CAP = 500;
const NUMBERS_QUIZ_POOL_LEN_MULTIPLIER = 30;

const GEOLANG_VOCABULARY_MP3 = 'https://geolang.ru/audio/mp3/vocabulary/';

/** Иконка динамика (раздел-пояснения и таблицы). */
const NUMBERS_VOICE_SVG_HTML =
  '<svg class="numbers__voice-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>' +
  '</svg>';

let geolangVocabAudio = null;
let geolangVocabPlayingTarget = null;

const THEME_STORAGE_KEY = 'georgian-alphabet-theme';
const GEO_GLYPH_STORAGE_KEY = 'georgian-alphabet-glyph-style';
const NUMBERS_READING_STORAGE_KEY = 'georgian-numbers-reading-mode';
/** Раньше: отдельно «только текст в тесте»; перенесено в georgian-numbers-reading-mode как hide */
const LEGACY_NUMBERS_QUIZ_HINT_KEY = 'georgian-numbers-quiz-phonetic-hints';
const NUMBERS_QUIZ_SPEAK_ON_CHOICE_KEY = 'georgian-numbers-quiz-speak-choice';
const NUMBERS_QUIZ_VALUE_RANGE_KEY = 'georgian-numbers-quiz-value-range';

function clampIntQuiz(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, Math.trunc(x)));
}

const READING_CAPTION_VALUES = ['hide', 'classic', 'latin_official', 'latin_unofficial'];

function loadNumbersQuizSpeakOnChoicePref() {
  try {
    const raw = localStorage.getItem(NUMBERS_QUIZ_SPEAK_ON_CHOICE_KEY);
    if (raw === '0' || raw === 'false') return false;
  } catch (_) {}
  return true;
}

function saveNumbersQuizSpeakOnChoicePref(on) {
  try {
    localStorage.setItem(NUMBERS_QUIZ_SPEAK_ON_CHOICE_KEY, on ? '1' : '0');
  } catch (_) {}
}

function getGeorgianGlyphStyleForNumbers() {
  try {
    const v = localStorage.getItem(GEO_GLYPH_STORAGE_KEY);
    if (v === 'mtavruli' || v === 'mkhedruli') return v;
  } catch (_) {}
  return 'mkhedruli';
}

function setGeorgianGlyphStyleForNumbers(style) {
  const s = style === 'mtavruli' ? 'mtavruli' : 'mkhedruli';
  try {
    localStorage.setItem(GEO_GLYPH_STORAGE_KEY, s);
  } catch (_) {}
  document.documentElement.setAttribute('data-georgian-glyph', s);
}

function displayGeorgianNumberWord(word) {
  if (!word) return '';
  const style = getGeorgianGlyphStyleForNumbers();
  const fn =
    typeof window.toDisplayGeorgianGlyph === 'function'
      ? window.toDisplayGeorgianGlyph
      : null;
  if (!fn) return word;
  return [...word].map((ch) => fn(ch, style)).join('');
}

/** Режим подписи под словом: hide | classic | latin_* (как у букв алфавита). */
function getNumbersReadingMode() {
  try {
    const raw = localStorage.getItem(NUMBERS_READING_STORAGE_KEY);
    if (READING_CAPTION_VALUES.includes(raw)) return raw;
  } catch (_) {}
  return 'classic';
}

function setNumbersReadingMode(mode) {
  const v = READING_CAPTION_VALUES.includes(mode)
    ? mode
    : 'classic';
  try {
    localStorage.setItem(NUMBERS_READING_STORAGE_KEY, v);
  } catch (_) {}
  return v;
}

function migrateLegacyQuizPhoneticHintKey() {
  try {
    const legacy = localStorage.getItem(LEGACY_NUMBERS_QUIZ_HINT_KEY);
    if (!legacy) return;
    localStorage.removeItem(LEGACY_NUMBERS_QUIZ_HINT_KEY);
    if (legacy !== 'hide') return;
    setNumbersReadingMode('hide');
  } catch (_) {}
}

/**
 * Подсказка к морфологии названий после 10: первая буква +
 * последние 4 графемы (−მეტი у 11–19); середина не подсвечивается.
 * Для 20 — только первая и последняя графема («ოც» и окончание).
 */
function graphemeMorphHighlight(value, graphemes, index) {
  const len = graphemes.length;
  if (value >= 11 && value <= 19 && len >= 6) {
    if (index === 0) return true;
    return index >= len - 4;
  }
  if (value === 20 && len >= 2) {
    return index === 0 || index === len - 1;
  }
  return false;
}

function phoneticHintForMkhed(wordMkhed, captionMode) {
  const tbl = window.GEO_LANG_ALPHA_BY_LETTER;
  const getParts =
    typeof window.getGeorgianLetterCaptionParts === 'function'
      ? window.getGeorgianLetterCaptionParts
      : null;
  const m =
    captionMode !== undefined ? captionMode : getNumbersReadingMode();
  if (m === 'hide') return '';
  if (!wordMkhed || !tbl || !getParts) return '';
  const parts = [];
  for (const ch of [...wordMkhed]) {
    if (!tbl[ch]) {
      parts.push(ch);
      continue;
    }
    const p = getParts(ch, m);
    const main = String(p.main || '').trim();
    parts.push(main || ch);
  }
  return parts.join('\u2009');
}

/** Строка чтения буква-к-букве только как подпись под грузинским текстом (карточки и квиз). */
function decorateNumbersVoiceButtons(scope) {
  const base =
    scope && typeof scope.querySelectorAll === 'function'
      ? scope
      : document;
  base.querySelectorAll('.numbers__voice-btn').forEach((btn) => {
    if (!btn.querySelector('.numbers__voice-icon')) {
      btn.insertAdjacentHTML('afterbegin', NUMBERS_VOICE_SVG_HTML);
    }
  });
}

function finishVocabularyAudioPlayback() {
  if (geolangVocabPlayingTarget) {
    geolangVocabPlayingTarget.classList.remove(
      'numbers__voice-btn--playing',
      'numbers__card--playing-audio'
    );
    geolangVocabPlayingTarget = null;
  }
  if (geolangVocabAudio) {
    geolangVocabAudio.onended = null;
    geolangVocabAudio.onerror = null;
  }
}

/** @param {{ el?: Element | null }} [opts] */
function playGeorgianVocabularySound(phraseMkhed, opts) {
  const trimmed = phraseMkhed?.trim();
  if (!trimmed) return;

  finishVocabularyAudioPlayback();

  if (!geolangVocabAudio) geolangVocabAudio = new Audio();
  geolangVocabAudio.pause();

  const el = opts?.el || null;
  geolangVocabPlayingTarget = el;
  if (el?.classList.contains('numbers__voice-btn')) {
    el.classList.add('numbers__voice-btn--playing');
  } else if (el?.classList.contains('numbers__card')) {
    el.classList.add('numbers__card--playing-audio');
  }

  const url = `${GEOLANG_VOCABULARY_MP3}${encodeURIComponent(trimmed)}.mp3`;
  geolangVocabAudio.src = url;

  const finish = () => finishVocabularyAudioPlayback();
  geolangVocabAudio.onended = finish;
  geolangVocabAudio.onerror = finish;

  void geolangVocabAudio.play().catch(finish);
}

function initNumbersVocabularyAudio() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest(
      'button.numbers__voice-btn[data-audio-mkhed]'
    );
    if (!btn || !document.body.contains(btn)) return;
    const phrase = btn.getAttribute('data-audio-mkhed');
    if (!phrase) return;
    e.preventDefault();
    playGeorgianVocabularySound(phrase, { el: btn });
  });
}

function initNumbersCardPlayOnTap() {
  const grid = document.getElementById('numbers-grid');
  if (!grid) return;

  function activateCard(card) {
    const phrase = card.getAttribute('data-audio-mkhed');
    if (phrase) playGeorgianVocabularySound(phrase, { el: card });
  }

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.numbers__card');
    if (!card || !grid.contains(card)) return;
    activateCard(card);
  });
}

function syncNumbersReadingSelect() {
  const sel = document.getElementById('numbers-reading-mode');
  if (!sel) return;
  sel.value = getNumbersReadingMode();
}

function initNumbersReadingSelect() {
  const sel = document.getElementById('numbers-reading-mode');
  if (!sel) return;
  syncNumbersReadingSelect();
  sel.addEventListener('change', () => {
    setNumbersReadingMode(sel.value);
    refreshAllPhoneticLinesUnderNumbers();
    if (typeof window.__numbersQuizRefreshLabels === 'function') {
      window.__numbersQuizRefreshLabels();
    }
  });
}

function refreshAllPhoneticLinesUnderNumbers() {
  const mode = getNumbersReadingMode();
  document.querySelectorAll('.numbers__phonetic-line').forEach((el) => {
    const mkhed = el.getAttribute('data-phonetics-for');
    if (!mkhed) return;
    el.textContent = phoneticHintForMkhed(mkhed, mode);
  });
}

/** Одна карточка: грузинское слово по буквам + строка транскрипции. */
function fillNumberCard(li, row) {
  const { value, wordMkhed } = row;
  const g = [...wordMkhed];

  let wordWrap = li.querySelector('.numbers__word-wrap');
  let phon = li.querySelector('.numbers__phonetic-line');
  if (!wordWrap) {
    wordWrap = document.createElement('span');
    wordWrap.className = 'numbers__word-wrap';
    wordWrap.lang = 'ka';
  }
  if (!phon) {
    phon = document.createElement('span');
    phon.className = 'numbers__phonetic-line';
  }

  wordWrap.replaceChildren();
  for (let i = 0; i < g.length; i++) {
    const letter = document.createElement('span');
    letter.className = 'numbers__word-letter';
    letter.lang = 'ka';
    const fn =
      typeof window.toDisplayGeorgianGlyph === 'function'
        ? window.toDisplayGeorgianGlyph
        : null;
    letter.textContent = fn ? fn(g[i], getGeorgianGlyphStyleForNumbers()) : g[i];
    if (graphemeMorphHighlight(value, g, i)) {
      letter.classList.add('numbers__word-morph');
    }
    wordWrap.appendChild(letter);
  }

  phon.setAttribute('data-phonetics-for', wordMkhed);
  phon.textContent = phoneticHintForMkhed(
    wordMkhed,
    getNumbersReadingMode()
  );

  const geoDisplayed = displayGeorgianNumberWord(wordMkhed);
  li.setAttribute('aria-label', `Число ${value}, «${geoDisplayed}»`);
}

function initGlyphRadiogroup() {
  const group = document.getElementById('alphabet-glyph-radiogroup');
  const radios = group
    ? [...group.querySelectorAll('input[type="radio"][name="alphabet-glyph-choice"]')]
    : [];
  if (!group || radios.length === 0) return;

  function applyFromRadios() {
    const picked = radios.find((r) => r.checked)?.value;
    if (picked) setGeorgianGlyphStyleForNumbers(picked);
    refreshGeorgianTextsOnPage();
  }

  radios.forEach((r) => {
    r.checked = r.value === getGeorgianGlyphStyleForNumbers();
  });
  group.addEventListener('change', applyFromRadios);
}

/** ---------- Сетка 0–20 ---------- */

function getNumberRows() {
  return Array.isArray(window.GEORGIAN_NUMBER_WORDS_0_20)
    ? window.GEORGIAN_NUMBER_WORDS_0_20
    : [];
}

function renderNumbersGrid(gridEl) {
  if (!gridEl) return;
  const rows = getNumberRows();
  gridEl.replaceChildren();
  for (const row of rows) {
    const li = document.createElement('li');
    li.className = 'numbers__card';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.dataset.value = String(row.value);
    li.dataset.audioMkhed = row.wordMkhed;
    const geoWordDisplayed = displayGeorgianNumberWord(row.wordMkhed);
    li.setAttribute('aria-label', `Число ${row.value}, «${geoWordDisplayed}»`);

    const inner = document.createElement('div');
    inner.className = 'numbers__card-inner';

    const dig = document.createElement('span');
    dig.className = 'numbers__digit';
    dig.textContent = String(row.value);
    dig.setAttribute('aria-hidden', 'true');

    const wordWrapEl = document.createElement('span');
    wordWrapEl.className = 'numbers__word-wrap';
    const phonEl = document.createElement('span');
    phonEl.className = 'numbers__phonetic-line';

    inner.append(dig, wordWrapEl, phonEl);
    li.appendChild(inner);

    gridEl.appendChild(li);

    li.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      playGeorgianVocabularySound(row.wordMkhed, { el: li });
    });

    fillNumberCard(li, row);
  }
}

function refreshStaticGeorgianSamples() {
  document.querySelectorAll('.numbers__ge-text[data-ge-word]').forEach((el) => {
    const raw = el.getAttribute('data-ge-word');
    if (!raw) return;
    el.textContent = displayGeorgianNumberWord(raw);
  });
}

function refreshGeorgianTextsOnPage() {
  const rows = getNumberRows();
  const grid = document.getElementById('numbers-grid');
  if (grid) {
    [...grid.querySelectorAll('.numbers__card')].forEach((li) => {
      const val = parseInt(li.dataset.value, 10);
      const row = rows.find((r) => r.value === val);
      if (row) fillNumberCard(li, row);
    });
  }
  if (typeof window.__numbersQuizRefreshWords === 'function') {
    window.__numbersQuizRefreshWords();
  }
  if (typeof window.__numbersQuizRefreshLabels === 'function') {
    window.__numbersQuizRefreshLabels();
  }
  refreshStaticGeorgianSamples();
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Максимум вопросов для пула размера poolLen (не только до poolLen раз). */
function maxQuizQuestionsForPool(poolLen) {
  if (poolLen < 1) return 1;
  return Math.min(
    NUMBERS_QUIZ_HARD_CAP,
    Math.max(poolLen, poolLen * NUMBERS_QUIZ_POOL_LEN_MULTIPLIER)
  );
}

/**
 * Случайный порядок, но каждое значение из pool появляется ⌊n/P⌋ или ⌈n/P⌋ раз —
 * распределение близко к равномерному (при n ≥ |pool| хотя бы по разу каждое).
 */
function balancedQuizQuestionQueue(pool, n) {
  const P = pool.length;
  if (!P || n <= 0) return [];
  const base = Math.floor(n / P);
  const remainder = n % P;
  const out = [];
  for (let k = 0; k < base; k++) {
    for (let i = 0; i < P; i++) out.push(pool[i]);
  }
  const extraPick = [...pool];
  shuffleInPlace(extraPick);
  for (let i = 0; i < remainder; i++) {
    out.push(extraPick[i]);
  }
  shuffleInPlace(out);
  return out;
}

function initNumbersQuiz() {
  const root = document.getElementById('numbers-quiz-root');
  const setup = document.getElementById('numbers-quiz-setup');
  const toolbar = document.getElementById('numbers-quiz-session-toolbar');
  const play = document.getElementById('numbers-quiz-play');
  const done = document.getElementById('numbers-quiz-done');
  const inputCount = document.getElementById('numbers-quiz-count');
  const btnStart = document.getElementById('numbers-quiz-start');
  const btnBackMenu = document.getElementById('numbers-quiz-back-menu');
  const voiceSwitch = document.getElementById('numbers-quiz-voice-switch');
  const progressEl = document.getElementById('numbers-quiz-progress');
  const digitEl = document.getElementById('numbers-quiz-digit');
  const choicesEl = document.getElementById('numbers-quiz-choices');
  const doneText = document.getElementById('numbers-quiz-done-text');
  const statsEl = document.getElementById('numbers-quiz-stats');

  if (
    !setup ||
    !toolbar ||
    !play ||
    !done ||
    !btnStart ||
    !choicesEl ||
    !digitEl
  ) {
    return;
  }

  const rows = getNumberRows();
  const byValue = new Map(rows.map((r) => [r.value, r]));
  const valueLoBound = rows.length
    ? Math.min(...rows.map((r) => r.value))
    : 0;
  const valueHiBound = rows.length
    ? Math.max(...rows.map((r) => r.value))
    : 20;

  const rangeLo = document.getElementById('numbers-quiz-range-lo');
  const rangeHi = document.getElementById('numbers-quiz-range-hi');
  const rangeLoVal = document.getElementById('numbers-quiz-range-lo-val');
  const rangeHiVal = document.getElementById('numbers-quiz-range-hi-val');
  const rangeSummary = document.getElementById('numbers-quiz-range-summary');
  const rangeDualStack = document.getElementById('numbers-quiz-range-dual-stack');

  /** Значения, из которых сейчас берутся задачи и дистракторы. */
  let quizPoolValues = [];

  let queue = [];
  let qIndex = 0;
  let solved = false;
  let correctCount = 0;
  let wrongCount = 0;
  let feedbackTimer = null;

  /** Числовые значения из таблицы, попадающие в выбранный диапазон (края включительно). */
  function valuesFromQuizRangeSliders() {
    let lo =
      rangeLo instanceof HTMLInputElement
        ? parseInt(String(rangeLo.value), 10)
        : valueLoBound;
    let hi =
      rangeHi instanceof HTMLInputElement
        ? parseInt(String(rangeHi.value), 10)
        : valueHiBound;
    lo = clampIntQuiz(lo, valueLoBound, valueHiBound);
    hi = clampIntQuiz(hi, valueLoBound, valueHiBound);
    const from = Math.min(lo, hi);
    const to = Math.max(lo, hi);
    return rows.map((row) => row.value).filter((v) => v >= from && v <= to);
  }

  function loadPersistedQuizValueRange() {
    try {
      const raw = localStorage.getItem(NUMBERS_QUIZ_VALUE_RANGE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (typeof o !== 'object' || o === null) return null;
      const lo = clampIntQuiz(o.lo, valueLoBound, valueHiBound);
      const hi = clampIntQuiz(o.hi, valueLoBound, valueHiBound);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
    } catch (_) {
      return null;
    }
  }

  function persistQuizValueRange(lo, hi) {
    try {
      const a = clampIntQuiz(lo, valueLoBound, valueHiBound);
      const b = clampIntQuiz(hi, valueLoBound, valueHiBound);
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      localStorage.setItem(
        NUMBERS_QUIZ_VALUE_RANGE_KEY,
        JSON.stringify({ lo: from, hi: to })
      );
    } catch (_) {}
  }

  function quizDualPctForValue(val) {
    const span = valueHiBound - valueLoBound;
    if (!(span > 0)) return 0;
    const c = clampIntQuiz(val, valueLoBound, valueHiBound);
    return ((c - valueLoBound) / span) * 100;
  }

  function syncDualRangeTrack() {
    if (
      !(rangeDualStack instanceof HTMLElement) ||
      !(rangeLo instanceof HTMLInputElement) ||
      !(rangeHi instanceof HTMLInputElement)
    ) {
      return;
    }
    const loN = clampIntQuiz(parseInt(String(rangeLo.value), 10), valueLoBound, valueHiBound);
    const hiN = clampIntQuiz(parseInt(String(rangeHi.value), 10), valueLoBound, valueHiBound);
    const from = Math.min(loN, hiN);
    const to = Math.max(loN, hiN);
    rangeDualStack.style.setProperty(
      '--dual-lo-pct',
      `${quizDualPctForValue(from)}%`
    );
    rangeDualStack.style.setProperty(
      '--dual-hi-pct',
      `${quizDualPctForValue(to)}%`
    );
  }

  function setQuizDualActiveThumb(side) {
    if (!(rangeDualStack instanceof HTMLElement)) return;
    rangeDualStack.dataset.activeThumb = side === 'hi' ? 'hi' : 'lo';
  }

  function updateQuizRangeSummary() {
    if (
      !(rangeLo instanceof HTMLInputElement) ||
      !(rangeHi instanceof HTMLInputElement)
    ) {
      return;
    }
    let lo = clampIntQuiz(
      parseInt(String(rangeLo.value), 10),
      valueLoBound,
      valueHiBound
    );
    let hi = clampIntQuiz(
      parseInt(String(rangeHi.value), 10),
      valueLoBound,
      valueHiBound
    );
    if (lo > hi) {
      const t = lo;
      lo = hi;
      hi = t;
    }
    const vals = rows
      .map((row) => row.value)
      .filter((v) => v >= lo && v <= hi);
    const n = vals.length;
    const summary = `Выбрано: ${lo}–${hi} (${n} шт.)`;
    if (rangeLoVal) rangeLoVal.textContent = String(lo);
    if (rangeHiVal) rangeHiVal.textContent = String(hi);
    if (rangeLo instanceof HTMLInputElement) {
      rangeLo.setAttribute('aria-valuetext', String(lo));
    }
    if (rangeHi instanceof HTMLInputElement) {
      rangeHi.setAttribute('aria-valuetext', String(hi));
    }
    if (rangeSummary) rangeSummary.textContent = summary;
    syncDualRangeTrack();
  }

  /** Ограничить поле «Вопросов»: минимум 1, верхний предел больше |пула|. */
  function syncQuizCountLimits() {
    if (!inputCount) return;
    const poolLen = Math.max(1, valuesFromQuizRangeSliders().length);
    const maxQ = maxQuizQuestionsForPool(poolLen);
    inputCount.max = String(maxQ);
    inputCount.min = '1';
    const curRaw = parseInt(String(inputCount.value || '1').trim(), 10);
    const cur = Number.isFinite(curRaw) ? curRaw : 1;
    inputCount.value = String(Math.min(maxQ, Math.max(1, cur)));
  }

  function onQuizRangeSliderInput(changedSide) {
    if (
      !(rangeLo instanceof HTMLInputElement) ||
      !(rangeHi instanceof HTMLInputElement)
    ) {
      syncQuizCountLimits();
      return;
    }
    let lo = clampIntQuiz(
      parseInt(String(rangeLo.value), 10),
      valueLoBound,
      valueHiBound
    );
    let hi = clampIntQuiz(
      parseInt(String(rangeHi.value), 10),
      valueLoBound,
      valueHiBound
    );
    if (changedSide === 'lo') {
      if (lo > hi) {
        rangeHi.value = String(lo);
      }
    } else if (hi < lo) {
      rangeLo.value = String(hi);
    }
    updateQuizRangeSummary();
    persistQuizValueRange(
      parseInt(String(rangeLo.value), 10),
      parseInt(String(rangeHi.value), 10)
    );
    syncQuizCountLimits();
  }

  if (rangeLo instanceof HTMLInputElement && rangeHi instanceof HTMLInputElement) {
    rangeLo.min = rangeHi.min = String(valueLoBound);
    rangeLo.max = rangeHi.max = String(valueHiBound);
    rangeLo.step = rangeHi.step = '1';

    let initLo = valueLoBound;
    let initHi = valueHiBound;
    const saved = loadPersistedQuizValueRange();
    if (saved) {
      initLo = saved.lo;
      initHi = saved.hi;
    }
    rangeLo.value = String(initLo);
    rangeHi.value = String(initHi);
    updateQuizRangeSummary();

    rangeLo.addEventListener('pointerdown', () =>
      setQuizDualActiveThumb('lo')
    );
    rangeHi.addEventListener('pointerdown', () =>
      setQuizDualActiveThumb('hi')
    );
    rangeLo.addEventListener('focus', () => setQuizDualActiveThumb('lo'));
    rangeHi.addEventListener('focus', () => setQuizDualActiveThumb('hi'));

    rangeLo.addEventListener('input', () =>
      onQuizRangeSliderInput('lo')
    );
    rangeHi.addEventListener('input', () =>
      onQuizRangeSliderInput('hi')
    );
  }
  syncQuizCountLimits();

  if (voiceSwitch) {
    voiceSwitch.classList.toggle(
      'quiz-voice-switch--off',
      !loadNumbersQuizSpeakOnChoicePref()
    );
    voiceSwitch.setAttribute(
      'aria-checked',
      loadNumbersQuizSpeakOnChoicePref() ? 'true' : 'false'
    );
    voiceSwitch.addEventListener('click', () => {
      const cur = voiceSwitch.getAttribute('aria-checked') === 'true';
      const next = !cur;
      saveNumbersQuizSpeakOnChoicePref(next);
      voiceSwitch.setAttribute('aria-checked', next ? 'true' : 'false');
      voiceSwitch.classList.toggle('quiz-voice-switch--off', !next);
    });
  }

  function quizSpeakChosenAnswer() {
    if (voiceSwitch) {
      return voiceSwitch.getAttribute('aria-checked') === 'true';
    }
    return loadNumbersQuizSpeakOnChoicePref();
  }

  function clearFeedbackTimer() {
    if (feedbackTimer != null) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
  }

  function showSetup() {
    clearFeedbackTimer();
    root?.classList.remove('numbers-quiz--active');
    setup.hidden = false;
    toolbar.hidden = false;
    play.hidden = true;
    done.hidden = true;
    btnStart.hidden = false;
    if (btnBackMenu) btnBackMenu.hidden = true;
    if (progressEl) {
      progressEl.hidden = true;
      progressEl.textContent = '';
    }
    quizPoolValues = [];
    queue = [];
    qIndex = 0;
    solved = false;
    correctCount = 0;
    wrongCount = 0;
    syncQuizCountLimits();
    if (statsEl) statsEl.textContent = '';
    if (doneText) doneText.textContent = '';
  }

  function showDone() {
    root?.classList.add('numbers-quiz--active');
    setup.hidden = true;
    toolbar.hidden = false;
    play.hidden = true;
    done.hidden = false;
    btnStart.hidden = true;
    if (btnBackMenu) btnBackMenu.hidden = false;
    if (progressEl) {
      progressEl.hidden = false;
      progressEl.textContent =
        queue.length > 0
          ? `Тест завершён · ${queue.length} вопросов`
          : 'Тест завершён';
    }
    if (statsEl) {
      statsEl.textContent = [
        `Правильных ответов: ${correctCount}`,
        `Неверных попыток: ${wrongCount}`,
        `Вопросов: ${queue.length}`,
      ].join('\n');
    }
    if (doneText) {
      doneText.textContent =
        'Можно пройти ещё раз с тем же или другим числом вопросов.';
    }
  }

  function buildWrongOptions(correctVal, maxWrong) {
    const pool = quizPoolValues.filter((v) => v !== correctVal);
    shuffleInPlace(pool);
    const n = Math.min(maxWrong, pool.length);
    return pool.slice(0, n);
  }

  function renderQuestion() {
    clearFeedbackTimer();
    const val = queue[qIndex];
    const row = byValue.get(val);
    if (!row) return;

    digitEl.textContent = String(val);
    digitEl.setAttribute('aria-label', `Число ${val}`);

    const maxDistractors = Math.min(
      3,
      Math.max(0, quizPoolValues.length - 1)
    );
    const wrongVals = buildWrongOptions(val, maxDistractors);
    const opts = shuffleInPlace([val, ...wrongVals]);

    choicesEl.replaceChildren();
    opts.forEach((v) => {
      const r = byValue.get(v);
      if (!r) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'numbers-quiz__choice';
      btn.dataset.value = String(v);

      const geo = displayGeorgianNumberWord(r.wordMkhed);
      const hint = phoneticHintForMkhed(r.wordMkhed).trim();

      const geEl = document.createElement('span');
      geEl.className = 'numbers-quiz__choice-ge';
      geEl.lang = 'ka';
      geEl.textContent = geo;

      btn.appendChild(geEl);
      if (hint.trim()) {
        const hintEl = document.createElement('span');
        hintEl.className = 'numbers-quiz__choice-hint';
        hintEl.textContent = hint;
        btn.appendChild(hintEl);
      }

      btn.setAttribute(
        'aria-label',
        hint.trim() ? `Число ${v}: «${geo}». ${hint}` : `Число ${v}: «${geo}»`
      );
      btn.addEventListener('click', () => onChoice(btn, val));
      choicesEl.appendChild(btn);
    });

    solved = false;
    if (progressEl) {
      progressEl.textContent = `Вопрос ${qIndex + 1} из ${queue.length}`;
    }
  }

  function onChoice(btn, correctVal) {
    const v = parseInt(btn.dataset.value, 10);
    const pickedRow = Number.isFinite(v) ? byValue.get(v) : null;
    if (pickedRow?.wordMkhed && quizSpeakChosenAnswer()) {
      playGeorgianVocabularySound(pickedRow.wordMkhed, { el: null });
    }

    if (solved) return;
    const isCorrect = v === correctVal;

    if (isCorrect) {
      correctCount += 1;
      btn.classList.add('numbers-quiz__choice--correct');
      solved = true;
      choicesEl.querySelectorAll('.numbers-quiz__choice').forEach((b) => {
        b.disabled = true;
      });
      qIndex += 1;
      feedbackTimer = window.setTimeout(() => {
        feedbackTimer = null;
        if (qIndex >= queue.length) showDone();
        else renderQuestion();
      }, NUMBERS_QUIZ_FEEDBACK_MS);
    } else {
      wrongCount += 1;
      btn.classList.add('numbers-quiz__choice--wrong');
      btn.disabled = true;
      window.setTimeout(() => {
        btn.classList.remove('numbers-quiz__choice--wrong');
        btn.disabled = false;
      }, NUMBERS_QUIZ_FEEDBACK_MS);
    }
  }

  window.__numbersQuizRefreshWords = function () {
    if (play.hidden || !queue.length || qIndex >= queue.length) return;
    if (solved || feedbackTimer != null) return;
    renderQuestion();
  };

  window.__numbersQuizRefreshLabels = function () {
    if (play.hidden || !queue.length || qIndex >= queue.length) return;
    if (solved || feedbackTimer != null) return;
    renderQuestion();
  };

  btnStart.addEventListener('click', () => {
    quizPoolValues = valuesFromQuizRangeSliders();
    const poolLen = quizPoolValues.length;
    if (!poolLen) return;

    const rawN =
      parseInt(String(inputCount?.value || '1').trim(), 10) || 1;
    const maxQ = maxQuizQuestionsForPool(poolLen);
    const nQ = Math.max(1, Math.min(maxQ, rawN));
    if (inputCount) inputCount.value = String(nQ);

    queue = balancedQuizQuestionQueue(quizPoolValues, nQ);
    qIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    solved = false;
    clearFeedbackTimer();

    root?.classList.add('numbers-quiz--active');
    setup.hidden = true;
    toolbar.hidden = false;
    play.hidden = false;
    done.hidden = true;
    btnStart.hidden = true;
    if (btnBackMenu) btnBackMenu.hidden = false;
    if (progressEl) progressEl.hidden = false;
    renderQuestion();
  });

  btnBackMenu?.addEventListener('click', showSetup);
  showSetup();
}

function syncThemeToggleButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  btn.setAttribute(
    'aria-label',
    dark ? 'Включить светлую тему' : 'Включить тёмную тему'
  );
  btn.title = dark ? 'Светлая тема' : 'Тёмная тема';
}

function applyTheme(mode) {
  const theme = mode === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_) {}
  syncThemeToggleButton();
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  syncThemeToggleButton();
  btn.addEventListener('click', () => {
    applyTheme(
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light'
        : 'dark'
    );
  });
}

function initNumbersPage() {
  migrateLegacyQuizPhoneticHintKey();
  setGeorgianGlyphStyleForNumbers(getGeorgianGlyphStyleForNumbers());
  initThemeToggle();
  initGlyphRadiogroup();
  initNumbersReadingSelect();
  initNumbersVocabularyAudio();
  initNumbersCardPlayOnTap();
  renderNumbersGrid(document.getElementById('numbers-grid'));
  decorateNumbersVoiceButtons(document);
  refreshStaticGeorgianSamples();
  initNumbersQuiz();
}

initNumbersPage();

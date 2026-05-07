const checkboxInputs = document.querySelectorAll(
  '.alphabet__character-checkbox-input'
);
const textBefore = document.querySelector('.transliteration__text-before');
const textOutput = document.querySelector('.transliteration__output');
const transliterationHint = document.querySelector('#transliteration__hint');
const sourceDetails = document.querySelector('#transliteration__source-details');
const buttonCopy = document.querySelector('.transliteration__button-copy');
const buttonCheckAll = document.querySelector('.alphabet__button-check-all');
const buttonCheckNone = document.querySelector('.alphabet__button-check-none');

const alphabet = document.querySelector('.alphabet__characters');
const toolTip = document.querySelector('.tooltip');
const toolTipText = document.querySelector('.tooltip__text');
const toolTipCloseButton = document.querySelector('.tooltip__close-btn');

const randomTextButton = document.querySelector(
  '.options__fieldset-button-random-text'
);
const georgianFactButton = document.querySelector(
  '.options__fieldset-button-georgian-fact'
);
const proseButton = document.querySelector('.options__fieldset-button-prose');
const optionsCheckboxInputs = document.querySelectorAll(
  '.options__fieldset-checkbox-input'
);
const options = document.querySelector('.options__fieldset');
const transliteration = document.querySelector('.transliteration__form');

const buttonTextAfterSizeUp = document.querySelector(
  '.transliteration__button-text-after-size-up'
);
const buttonTextAfterSizeDown = document.querySelector(
  '.transliteration__button-text-after-size-down'
);
const buttonTextBeforeSizeUp = document.querySelector(
  '.transliteration__button-text-before-size-up'
);
const buttonTextBeforeSizeDown = document.querySelector(
  '.transliteration__button-text-before-size-down'
);

const CHECKBOX_STORAGE_KEY = 'georgian-alphabet-checkbox-selection';

const ALPHABET_LEVEL_GROUPS = [
  ['ა', 'ვ', 'დ', 'ი', 'რ', 'ს'],
  ['ე', 'თ', 'ტ', 'მ', 'ნ', 'ო'],
  ['ბ', 'გ', 'ლ', 'უ', 'ღ'],
  ['ქ', 'შ', 'ჩ', 'ც', 'ხ'],
  ['კ', 'ზ', 'ძ', 'პ', 'ფ', 'ყ'],
  ['ჟ', 'ჯ', 'ჰ', 'წ', 'ჭ'],
];

const PRESET_MY_STORAGE_KEY = 'georgian-alphabet-preset-my';
const SELECTION_META_KEY = 'georgian-alphabet-selection-meta';

function persistSelectionMeta(meta) {
  try {
    localStorage.setItem(SELECTION_META_KEY, JSON.stringify(meta));
  } catch (_) {}
}

function getCheckedLettersSet() {
  const s = new Set();
  checkboxInputs.forEach((i) => {
    if (i.checked) s.add(i.name);
  });
  return s;
}

function lettersEqualSets(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function lettersFromLevelNumbers(levelNums) {
  const u = new Set();
  for (const n of levelNums) {
    const i = Number(n) - 1;
    if (i < 0 || i >= ALPHABET_LEVEL_GROUPS.length) continue;
    ALPHABET_LEVEL_GROUPS[i].forEach((ch) => u.add(ch));
  }
  return u;
}

function readSavedMyPresetLetters() {
  try {
    const raw = localStorage.getItem(PRESET_MY_STORAGE_KEY);
    if (!raw) return null;
    const names = JSON.parse(raw);
    if (!Array.isArray(names)) return null;
    return new Set(names);
  } catch (_) {
    return null;
  }
}

function setMyPresetButtonPressed(on) {
  const myBtn = document.getElementById('alphabet-quick-my');
  if (!myBtn) return;
  myBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function restoreSelectionUIMeta() {
  const levelBtns = document.querySelectorAll('[data-quick-level]');
  if (!levelBtns.length) return;

  let meta = null;
  try {
    const raw = localStorage.getItem(SELECTION_META_KEY);
    if (raw) meta = JSON.parse(raw);
  } catch (_) {}

  const cur = getCheckedLettersSet();
  const allChecked =
    checkboxInputs.length > 0 && [...checkboxInputs].every((c) => c.checked);
  const noneChecked = [...checkboxInputs].every((c) => !c.checked);

  const clearLevels = () => {
    levelBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  };

  setMyPresetButtonPressed(false);

  if (!meta || typeof meta !== 'object' || !meta.mode) {
    syncQuickLevelToggleVisuals();
    return;
  }

  if (meta.mode === 'all' && allChecked) {
    syncQuickLevelToggleVisuals();
    return;
  }

  if (meta.mode === 'none' && noneChecked) {
    clearLevels();
    return;
  }

  if (meta.mode === 'levels' && Array.isArray(meta.levels)) {
    const nums = meta.levels
      .map((n) => Number(n))
      .filter((n) => n >= 1 && n <= ALPHABET_LEVEL_GROUPS.length);
    const expected = lettersFromLevelNumbers(nums);
    if (lettersEqualSets(expected, cur)) {
      clearLevels();
      nums.forEach((n) => {
        const el = document.querySelector(`[data-quick-level="${n}"]`);
        if (el) el.setAttribute('aria-pressed', 'true');
      });
      return;
    }
    syncQuickLevelToggleVisuals();
    return;
  }

  if (meta.mode === 'my') {
    const preset = readSavedMyPresetLetters();
    if (preset && lettersEqualSets(preset, cur)) {
      clearLevels();
      setMyPresetButtonPressed(true);
      return;
    }
  }

  syncQuickLevelToggleVisuals();
}

function persistLevelsFromPressedButtons() {
  const pressed = [...document.querySelectorAll('[data-quick-level]')]
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => parseInt(b.getAttribute('data-quick-level'), 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  if (pressed.length === 0) persistSelectionMeta({ mode: 'none' });
  else persistSelectionMeta({ mode: 'levels', levels: pressed });
}

function applyLetterSelectionSet(allowedSet) {
  checkboxInputs.forEach((input) => {
    input.checked = allowedSet.has(input.name);
  });
  saveCheckboxSelection();
  refreshTransliteration();
  refreshSelectionStrip();
}

function syncQuickLevelToggleVisuals() {
  const levelBtns = document.querySelectorAll('[data-quick-level]');
  if (!levelBtns.length) return;
  const allChecked =
    checkboxInputs.length > 0 &&
    [...checkboxInputs].every((c) => c.checked);
  levelBtns.forEach((b) => {
    if (allChecked) {
      b.setAttribute('aria-pressed', 'true');
    } else {
      b.setAttribute('aria-pressed', 'false');
    }
  });
}

function initAlphabetQuickLevels() {
  document.querySelectorAll('[data-quick-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.getAttribute('data-quick-level'), 10);
      const idx = n - 1;
      if (idx < 0 || idx >= ALPHABET_LEVEL_GROUPS.length) return;
      const wasPressed = btn.getAttribute('aria-pressed') === 'true';
      const nowPressed = !wasPressed;
      btn.setAttribute('aria-pressed', String(nowPressed));

      const union = new Set();
      document.querySelectorAll('[data-quick-level]').forEach((b) => {
        if (b.getAttribute('aria-pressed') !== 'true') return;
        const levelNum = parseInt(b.getAttribute('data-quick-level'), 10);
        const i = levelNum - 1;
        if (i < 0 || i >= ALPHABET_LEVEL_GROUPS.length) return;
        ALPHABET_LEVEL_GROUPS[i].forEach((ch) => union.add(ch));
      });
      applyLetterSelectionSet(union);
      setMyPresetButtonPressed(false);
      persistLevelsFromPressedButtons();
    });
  });

  const myBtn = document.getElementById('alphabet-quick-my');
  myBtn?.addEventListener('click', () => {
    try {
      const raw = localStorage.getItem(PRESET_MY_STORAGE_KEY);
      if (!raw) return;
      const names = JSON.parse(raw);
      if (!Array.isArray(names)) return;
      document.querySelectorAll('[data-quick-level]').forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
      });
      applyLetterSelectionSet(new Set(names));
      persistSelectionMeta({ mode: 'my' });
      setMyPresetButtonPressed(true);
    } catch (_) {
      /* ignore */
    }
  });

  const saveBtn = document.getElementById('alphabet-save-my');
  saveBtn?.addEventListener('click', () => {
    try {
      const names = [...checkboxInputs]
        .filter((c) => c.checked)
        .map((c) => c.name);
      localStorage.setItem(PRESET_MY_STORAGE_KEY, JSON.stringify(names));
    } catch (_) {
      /* ignore */
    }
  });
}

const selectionStripTrack = document.querySelector('#selection-strip-track');

function refreshSelectionStrip() {
  if (!selectionStripTrack) return;
  selectionStripTrack.replaceChildren();
  const ordered = [...checkboxInputs].filter((cb) => cb.checked);
  if (!ordered.length) {
    selectionStripTrack.removeAttribute('role');
    const empty = document.createElement('p');
    empty.className = 'selection-strip__empty text';
    empty.textContent = 'Буквы не выбраны.';
    selectionStripTrack.appendChild(empty);
    return;
  }
  selectionStripTrack.setAttribute('role', 'list');
  for (const input of ordered) {
    const geo = input.name;
    const ruRaw = (input.value || '').trim();
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'selection-strip__chip';
    chip.dataset.letter = geo;
    chip.setAttribute('role', 'listitem');
    chip.setAttribute(
      'aria-label',
      `${geo}, кириллический аналог ${ruRaw}, воспроизвести звук`
    );

    const geoSpan = document.createElement('span');
    geoSpan.className = 'selection-strip__geo';
    geoSpan.textContent = geo;

    const ruSpan = document.createElement('span');
    ruSpan.className = 'selection-strip__ru';
    ruSpan.textContent = ruRaw;

    chip.append(geoSpan, ruSpan);
    selectionStripTrack.appendChild(chip);
  }
}

selectionStripTrack?.addEventListener('click', (e) => {
  const chip = e.target.closest('.selection-strip__chip');
  if (!chip) return;
  e.preventDefault();
  playGeorgianLetterSound(chip.dataset.letter);
});

textOutput?.addEventListener('click', (e) => {
  const btn = e.target.closest('.transliteration__geo--btn');
  if (!btn || !textOutput.contains(btn)) return;
  playGeorgianLetterSound(btn.dataset.letter);
});

const GEOLANG_AUDIO_LETTER_MP3 = 'https://geolang.ru/audio/mp3/letter/';
let geolangLetterAudio = null;

function escapeHtml(ch) {
  return ch
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function isCyrillicCodePoint(cp) {
  return (
    (cp >= 0x0400 && cp <= 0x04ff) ||
    (cp >= 0x0500 && cp <= 0x052f) ||
    (cp >= 0x2de0 && cp <= 0x2dff) ||
    (cp >= 0xa640 && cp <= 0xa69f)
  );
}

function buildHighlightedHtml(str) {
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    const esc = escapeHtml(ch);
    if (cp >= 0x10a0 && cp <= 0x10ff) {
      out += `<button type="button" class="transliteration__geo transliteration__geo--btn" data-letter="${escapeAttr(ch)}" aria-label="Воспроизвести ${esc}">${esc}</button>`;
    } else if (isCyrillicCodePoint(cp)) {
      out += `<span class="transliteration__ru">${esc}</span>`;
    } else {
      out += esc;
    }
  }
  return out;
}

function saveCheckboxSelection() {
  try {
    const checked = [...checkboxInputs]
      .filter((item) => item.checked)
      .map((item) => item.name);
    localStorage.setItem(CHECKBOX_STORAGE_KEY, JSON.stringify(checked));
  } catch (_) {
    /* ignore */
  }
}

function restoreCheckboxSelection() {
  try {
    const raw = localStorage.getItem(CHECKBOX_STORAGE_KEY);
    if (!raw) return;
    const names = JSON.parse(raw);
    if (!Array.isArray(names)) return;
    checkboxInputs.forEach((item) => {
      item.checked = names.includes(item.name);
    });
  } catch (_) {
    /* ignore */
  }
}

let sourceDetailsProgrammatic = false;
let sourceDetailsPinnedByUser = false;

function setSourceDetailsOpen(open) {
  if (!sourceDetails) return;
  sourceDetailsProgrammatic = true;
  sourceDetails.open = open;
  queueMicrotask(() => {
    sourceDetailsProgrammatic = false;
  });
}

sourceDetails?.addEventListener('toggle', () => {
  if (sourceDetailsProgrammatic) return;
  sourceDetailsPinnedByUser = !!sourceDetails.open;
});

function collapseSourceDetailsAfterRandomizer() {
  if (!sourceDetails || sourceDetailsPinnedByUser) return;
  setSourceDetailsOpen(false);
}

function getGeorgianSoundChar(letter) {
  const ch = letter && [...letter.trim()][0];
  if (!ch) return null;
  const cp = ch.codePointAt(0);
  if (cp < 0x10a0 || cp > 0x10ff) return null;
  return ch;
}

function clearGeorgianLetterPlayingState() {
  document
    .querySelectorAll(
      '.transliteration__geo--playing, .selection-strip__chip--playing'
    )
    .forEach((el) => {
      el.classList.remove(
        'transliteration__geo--playing',
        'selection-strip__chip--playing'
      );
    });
  if (geolangLetterAudio) {
    geolangLetterAudio.onended = null;
    geolangLetterAudio.onerror = null;
  }
}

function applyGeorgianLetterPlayingHighlight(ch) {
  textOutput?.querySelectorAll('.transliteration__geo--btn').forEach((btn) => {
    if (btn.dataset.letter === ch) {
      btn.classList.add('transliteration__geo--playing');
    }
  });
  selectionStripTrack?.querySelectorAll('.selection-strip__chip').forEach((chip) => {
    if (chip.dataset.letter === ch) {
      chip.classList.add('selection-strip__chip--playing');
    }
  });
}

function playGeorgianLetterSound(letter) {
  const ch = getGeorgianSoundChar(letter);
  if (!ch) return;

  clearGeorgianLetterPlayingState();

  if (!geolangLetterAudio) geolangLetterAudio = new Audio();
  geolangLetterAudio.pause();

  applyGeorgianLetterPlayingHighlight(ch);

  const url = `${GEOLANG_AUDIO_LETTER_MP3}${encodeURIComponent(ch)}.mp3`;
  geolangLetterAudio.src = url;

  const finish = () => {
    clearGeorgianLetterPlayingState();
  };
  geolangLetterAudio.onended = finish;
  geolangLetterAudio.onerror = finish;

  void geolangLetterAudio.play().catch(finish);
}

function layoutAlphabetRuBlocks() {
  document.querySelectorAll('.alphabet__card-inner').forEach((inner) => {
    if (
      inner.querySelector('.alphabet__card-ru-block') &&
      !inner.querySelector('.alphabet__card-select')
    ) {
      return;
    }

    const select = inner.querySelector('.alphabet__card-select');
    const main = select?.querySelector('.alphabet__card-main');
    const ru = main?.querySelector('.alphabet__card-ru');
    if (!main || !ru) return;

    const card = inner.closest('.alphabet__card');
    const geo = main.querySelector('.alphabet__card-geo');
    const toolbar = inner.querySelector('.alphabet__card-toolbar');
    const hintRow = card?.querySelector('.alphabet__card-hint-row');
    const hint = hintRow?.querySelector('.alphabet__card-hint');

    if (!geo || !toolbar) return;

    const text = ru.textContent.trim();
    ru.remove();

    const block = document.createElement('div');
    block.className = 'alphabet__card-ru-block';

    const stack = document.createElement('div');
    stack.className = 'alphabet__card-ru-stack';

    const line1 = document.createElement('span');
    line1.className = 'alphabet__card-ru-line1';

    const m = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const short = document.createElement('span');
    short.className = 'alphabet__card-ru-short';
    short.textContent = m ? m[1].trim() : text;

    line1.appendChild(short);
    if (m) {
      const paren = document.createElement('span');
      paren.className = 'alphabet__card-ru-paren';
      paren.textContent = `(${m[2].trim()})`;
      line1.appendChild(paren);
    }
    if (hint) {
      hint.classList.add('alphabet__card-hint--inline');
      line1.appendChild(hint);
    }

    stack.appendChild(line1);

    block.appendChild(stack);

    geo.remove();
    hintRow?.remove();
    select.remove();

    inner.insertBefore(geo, toolbar);
    inner.insertBefore(block, toolbar);
  });
}

function initAlphabetCards() {
  document.querySelectorAll('.alphabet__card').forEach((card) => {
    const letter = card.dataset.letter;
    const input = card.querySelector('.alphabet__card-input');
    const inner = card.querySelector('.alphabet__card-inner');
    const thumbBtn = card.querySelector('.alphabet__card-thumb-btn');
    const audioBtn = card.querySelector('.alphabet__card-audio');

    if (!input || !inner) return;

    inner.addEventListener('click', (e) => {
      if (
        e.target.closest(
          '.alphabet__card-thumb-btn, .alphabet__card-audio, .alphabet__card-hint'
        )
      ) {
        return;
      }
      if (card.classList.contains('alphabet__card--peek')) {
        card.classList.remove('alphabet__card--peek');
        return;
      }
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    thumbBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.alphabet__card--peek').forEach((c) => {
        if (c !== card) c.classList.remove('alphabet__card--peek');
      });
      card.classList.toggle('alphabet__card--peek');
    });

    audioBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (letter) playGeorgianLetterSound(letter);
    });
  });

  document.addEventListener('click', () => {
    document
      .querySelectorAll('.alphabet__card--peek')
      .forEach((c) => c.classList.remove('alphabet__card--peek'));
  });
}

function setValidationHint(message) {
  if (!transliterationHint) return;
  if (message) {
    transliterationHint.textContent = message;
    transliterationHint.hidden = false;
  } else {
    transliterationHint.textContent = '';
    transliterationHint.hidden = true;
  }
}

function clearErrorHighlight() {
  alphabet.classList.remove('alphabet__characters_color_red');
  textBefore.classList.remove('transliteration__textarea_border_red');
  setValidationHint('');
}

function showErrorHighlight(message) {
  alphabet.classList.add('alphabet__characters_color_red');
  textBefore.classList.add('transliteration__textarea_border_red');
  setValidationHint(message);
}

function getCheckedInputs(nodeList) {
  let res = {};
  let array = [...nodeList];

  let arrayNames = array
    .filter((item) => item.checked)
    .map((item) => item.name);

  let arrayValues = array
    .filter((item) => item.checked)
    .map((item) => item.value);

  arrayNames.map((item, index) => {
    res[item] = arrayValues[index];
  });
  return res;
}

function findAndReplace(text, nodeList) {
  let characters = getCheckedInputs(nodeList);
  let georgianCharacters = Object.keys(characters);
  let russianCharacters = Object.values(characters);

  let optionMap = getCheckedInputs(optionsCheckboxInputs);
  let optionsKeys = Object.keys(optionMap);

  if (optionsKeys.includes('ь')) {
    let regExp = /[^ьъ]/gi;
    text = text.match(regExp) ? text.match(regExp).join('') : text;
  }

  if (georgianCharacters.includes('ი') && georgianCharacters.includes('ა')) {
    let regExp = /я/gi;
    text = text.match(regExp) ? text.replace(regExp, 'иа') : text;
  }

  if (georgianCharacters.includes('ი') && georgianCharacters.includes('ო')) {
    let regExp = /ё/gi;
    text = text.match(regExp) ? text.replace(regExp, 'ио') : text;
  }

  if (georgianCharacters.includes('ი') && georgianCharacters.includes('უ')) {
    let regExp = /ю/gi;
    text = text.match(regExp) ? text.replace(regExp, 'иу') : text;
  }

  if (georgianCharacters.includes('ი')) {
    let regExp1 = /ы/gi;
    let regExp2 = /й/gi;
    text = text.match(regExp1) ? text.replace(regExp1, 'и') : text;
    text = text.match(regExp2) ? text.replace(regExp2, 'и') : text;
  }

  if (georgianCharacters.includes('ე')) {
    let regExp = /э/gi;
    text = text.match(regExp) ? text.replace(regExp, 'е') : text;
  }

  if (georgianCharacters.includes('შ')) {
    let regExp = /щ/gi;
    text = text.match(regExp) ? text.replace(regExp, 'ш') : text;
  }

  if (georgianCharacters.includes('ფ')) {
    let regExp = /ф/gi;
    text = text.match(regExp) ? text.replace(regExp, 'п') : text;
  }

  if (russianCharacters.includes('дз')) {
    text = text.replace(/дз/gi, 'ძ');
  }

  if (russianCharacters.includes('дж')) {
    text = text.replace(/дж/gi, 'ჯ');
  }

  russianCharacters.map((item, index) => {
    let regExp = new RegExp(`${item}`, 'gi');

    function randomizeChar(rusChar, geoChars) {
      function checkIfInclude() {
        let counter = 0;
        geoChars.map((item) => {
          if (georgianCharacters.includes(item)) {
            counter++;
          }
        });
        return counter == geoChars.length ? true : false;
      }

      if (item === rusChar && checkIfInclude()) {
        text = text.replace(regExp, () => {
          return geoChars[Math.floor(Math.random() * geoChars.length)];
        });
      }
    }

    randomizeChar('г', ['გ', 'ღ']);

    randomizeChar('т', ['თ', 'ტ']);

    randomizeChar('к', ['კ', 'ქ', 'ყ']);

    randomizeChar('к', ['კ', 'ქ']);

    randomizeChar('к', ['კ', 'ყ']);

    randomizeChar('к', ['ქ', 'ყ']);

    randomizeChar('п', ['პ', 'ფ']);

    randomizeChar('ч', ['ჩ', 'ჭ']);

    randomizeChar('ц', ['ც', 'წ']);

    randomizeChar('х', ['ხ', 'ჰ']);

    text = text.replace(regExp, georgianCharacters[index]);
  });

  return text;
}

function refreshTransliteration() {
  const source = textBefore.value;
  const hasText = source.trim().length > 0;
  const characters = getCheckedInputs([...checkboxInputs]);
  const georgianCharacters = Object.keys(characters);
  const hasLetters = georgianCharacters.length > 0;

  if (!hasText) {
    textOutput.innerHTML = '';
    clearErrorHighlight();
    return;
  }

  if (!hasLetters) {
    textOutput.innerHTML = '';
    showErrorHighlight(
      'Выберите хотя бы одну букву грузинского алфавита для тренировки.'
    );
    return;
  }

  clearErrorHighlight();
  const transliteratedText = findAndReplace(source, [...checkboxInputs]);
  textOutput.innerHTML = buildHighlightedHtml(transliteratedText);
}

alphabet.onclick = function (e) {
  const el = e.target.closest('[data-title]');
  if (!el?.dataset?.title) {
    return;
  }
  showTooltip(el);
};

options.onclick = function (e) {
  const t = e.target.closest('[data-title]');
  if (!t?.dataset?.title) {
    return;
  }
  showTooltip(t);
};

function showTooltip(button) {
  toolTip.classList.add('tooltip_opened');
  toolTipText.textContent = button.dataset.title;
}

function getRandomText() {
  return fetch('https://fish-text.ru/get', {}).then((res) => {
    return res.ok ? res.json() : Promise.reject(res.status);
  });
}

function increaseTextSize(el) {
  let currentTextSize = getComputedStyle(el).fontSize.split('px').join('');
  let currentLineHeight = getComputedStyle(el)
    .lineHeight.split('px')
    .join('');

  if (currentTextSize < 50) {
    el.style.fontSize = `${+currentTextSize + 2}px`;
    el.style.lineHeight = `${+currentLineHeight + 2}px`;
  }
}

function decreaseTextSize(el) {
  let currentTextSize = getComputedStyle(el).fontSize.split('px').join('');
  let currentLineHeight = getComputedStyle(el)
    .lineHeight.split('px')
    .join('');

  if (currentTextSize > 10) {
    el.style.fontSize = `${+currentTextSize - 2}px`;
    el.style.lineHeight = `${+currentLineHeight - 2}px`;
  }
}

buttonCheckAll.addEventListener('click', () => {
  checkboxInputs.forEach((item) => (item.checked = true));
  saveCheckboxSelection();
  refreshTransliteration();
  refreshSelectionStrip();
  setMyPresetButtonPressed(false);
  persistSelectionMeta({ mode: 'all' });
  syncQuickLevelToggleVisuals();
});

buttonCheckNone.addEventListener('click', () => {
  checkboxInputs.forEach((item) => (item.checked = false));
  saveCheckboxSelection();
  refreshTransliteration();
  refreshSelectionStrip();
  setMyPresetButtonPressed(false);
  persistSelectionMeta({ mode: 'none' });
  syncQuickLevelToggleVisuals();
});

transliteration.addEventListener('submit', (e) => {
  e.preventDefault();
});

if (buttonCopy) {
  buttonCopy.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const plain = textOutput.innerText || '';
    if (!plain) return;
    try {
      await navigator.clipboard.writeText(plain);
    } catch (_) {
      /* ignore */
    }
  });
}

toolTipCloseButton.addEventListener('click', () => {
  toolTip.classList.remove('tooltip_opened');
});

toolTip.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    toolTip.classList.remove('tooltip_opened');
  }
});

randomTextButton.addEventListener('click', () => {
  getRandomText()
    .then((res) => {
      textBefore.value = res.text;
      collapseSourceDetailsAfterRandomizer();
      refreshTransliteration();
    })
    .catch((err) => {
      console.log(err);
      textBefore.value =
        'Упс. При загрузке текста произошла ошибка, повторите позже.';
      collapseSourceDetailsAfterRandomizer();
      refreshTransliteration();
    });
});

georgianFactButton.addEventListener('click', () => {
  textBefore.value =
    georgianFacts[Math.floor(Math.random() * georgianFacts.length)];
  collapseSourceDetailsAfterRandomizer();
  refreshTransliteration();
});

const PROSE_PLACEHOLDER_SNIPPETS = [
  'Здесь появятся отрывки грузинской прозы в переводе (например, из «Витязя в тигровой шкуре» или других текстов) — пока заглушка.',
];

proseButton?.addEventListener('click', () => {
  textBefore.value =
    PROSE_PLACEHOLDER_SNIPPETS[
      Math.floor(Math.random() * PROSE_PLACEHOLDER_SNIPPETS.length)
    ];
  collapseSourceDetailsAfterRandomizer();
  refreshTransliteration();
});

buttonTextBeforeSizeUp.addEventListener('click', () => {
  increaseTextSize(textBefore);
});

buttonTextBeforeSizeDown.addEventListener('click', () => {
  decreaseTextSize(textBefore);
});

buttonTextAfterSizeUp.addEventListener('click', () => {
  increaseTextSize(textOutput);
});

buttonTextAfterSizeDown.addEventListener('click', () => {
  decreaseTextSize(textOutput);
});

textBefore.addEventListener('input', refreshTransliteration);
textBefore.addEventListener('change', refreshTransliteration);

alphabet.addEventListener('change', (e) => {
  document
    .querySelectorAll('.alphabet__card--peek')
    .forEach((c) => c.classList.remove('alphabet__card--peek'));
  if (e.target.matches('.alphabet__character-checkbox-input')) {
    saveCheckboxSelection();
    refreshTransliteration();
    refreshSelectionStrip();
    setMyPresetButtonPressed(false);
    persistSelectionMeta({ mode: 'custom' });
    syncQuickLevelToggleVisuals();
  }
});

optionsCheckboxInputs.forEach((input) => {
  input.addEventListener('change', () => {
    refreshTransliteration();
  });
});

layoutAlphabetRuBlocks();
initAlphabetCards();
initAlphabetQuickLevels();
restoreCheckboxSelection();
restoreSelectionUIMeta();

if (
  textBefore &&
  sourceDetails &&
  !String(textBefore.value || '').trim()
) {
  setSourceDetailsOpen(true);
}

refreshTransliteration();
refreshSelectionStrip();

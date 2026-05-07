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

const selectionStripTrack = document.querySelector('#selection-strip-track');

/** Полоса «выбранные буквы» под опциями: грузинская + кириллица из value, тап — звук */
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

/** Те же URL, что у плеера на https://geolang.ru/lessons/9 */
const GEOLANG_AUDIO_LETTER_MP3 = 'https://geolang.ru/audio/mp3/letter/';
let geolangLetterAudio = null;

function escapeHtml(ch) {
  return ch
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Значение HTML-атрибута data-* (грузинские буквы обычно без спецсимволов). */
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

function openSourceDetails() {
  if (sourceDetails) sourceDetails.open = true;
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

/** Кириллица: строка кириллицы + (?); текст в скобках в том же блоке строки — на десктопе ниже (absolute от line1), на мобиле в один ряд. */
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
      /* Тап по затемнению (мобильный полноэкранный peek) — только закрыть, не галочку */
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

// Получаю объект из чекнутых грузинских букв
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
  // Чекнутые буквы
  let characters = getCheckedInputs(nodeList);
  let georgianCharacters = Object.keys(characters);
  let russianCharacters = Object.values(characters);

  // Чекнутые опции
  let optionMap = getCheckedInputs(optionsCheckboxInputs);
  let optionsKeys = Object.keys(optionMap);

  // Убираю мягкий и твёрдый знаки
  if (optionsKeys.includes('ь')) {
    let regExp = /[^ьъ]/gi;
    text = text.match(regExp) ? text.match(regExp).join('') : text;
  }

  // Если выбраны буквы 'ი' 'ა', то 'я' меняю на 'иа'
  if (georgianCharacters.includes('ი') && georgianCharacters.includes('ა')) {
    let regExp = /я/gi;
    text = text.match(regExp) ? text.replace(regExp, 'иа') : text;
  }

  // Если выбраны буквы 'ი' 'ო', то 'ё' меняю на 'ио'
  if (georgianCharacters.includes('ი') && georgianCharacters.includes('ო')) {
    let regExp = /ё/gi;
    text = text.match(regExp) ? text.replace(regExp, 'ио') : text;
  }

  // Если выбраны буквы 'ი' 'უ', то 'ю' меняю на 'иу'
  if (georgianCharacters.includes('ი') && georgianCharacters.includes('უ')) {
    let regExp = /ю/gi;
    text = text.match(regExp) ? text.replace(regExp, 'иу') : text;
  }

  // Если выбрана буква 'ი', то 'ы' 'й' меняю на 'и'
  if (georgianCharacters.includes('ი')) {
    let regExp1 = /ы/gi;
    let regExp2 = /й/gi;
    text = text.match(regExp1) ? text.replace(regExp1, 'и') : text;
    text = text.match(regExp2) ? text.replace(regExp2, 'и') : text;
  }

  // Если выбрана буква 'ე', то 'э' меняю на 'е'
  if (georgianCharacters.includes('ე')) {
    let regExp = /э/gi;
    text = text.match(regExp) ? text.replace(regExp, 'е') : text;
  }

  // Если выбрана буква 'შ', то 'щ' меняю на 'ш'
  if (georgianCharacters.includes('შ')) {
    let regExp = /щ/gi;
    text = text.match(regExp) ? text.replace(regExp, 'ш') : text;
  }

  // Если выбрана буква 'ფ', то 'ф' меняю на 'п'
  if (georgianCharacters.includes('ფ')) {
    let regExp = /ф/gi;
    text = text.match(regExp) ? text.replace(regExp, 'п') : text;
  }

  // Сначала транслитерирую 'дз'
  if (russianCharacters.includes('дз')) {
    text = text.replace(/дз/gi, 'ძ');
  }

  // Потом транслитерирую 'дж'
  if (russianCharacters.includes('дж')) {
    text = text.replace(/дж/gi, 'ჯ');
  }

  // Транслитерация
  russianCharacters.map((item, index) => {
    let regExp = new RegExp(`${item}`, 'gi');

    function randomizeChar(rusChar, geoChars) {
      // Проверка того, что все из ряда похожих выбраны
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

    // Рандомайзер для букв 'г'
    randomizeChar('г', ['გ', 'ღ']);

    // Рандомайзер для букв 'т'
    randomizeChar('т', ['თ', 'ტ']);

    // Рандомайзер для букв 'к' всех
    randomizeChar('к', ['კ', 'ქ', 'ყ']);

    // Рандомайзер для букв 'к' 1
    randomizeChar('к', ['კ', 'ქ']);

    // Рандомайзер для букв 'к' 2
    randomizeChar('к', ['კ', 'ყ']);

    // Рандомайзер для букв 'к' 3
    randomizeChar('к', ['ქ', 'ყ']);

    // Рандомайзер для букв 'п'
    randomizeChar('п', ['პ', 'ფ']);

    // Рандомайзер для букв 'ч'
    randomizeChar('ч', ['ჩ', 'ჭ']);

    // Рандомайзер для букв 'ц'
    randomizeChar('ц', ['ც', 'წ']);

    // Рандомайзер для букв 'х'
    randomizeChar('х', ['ხ', 'ჰ']);

    // Транслитерация для остальных букв
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

// Используя делегирование выбираю кнопку подсказки в алфавите
alphabet.onclick = function (e) {
  const el = e.target.closest('[data-title]');
  if (!el?.dataset?.title) {
    return;
  }
  showTooltip(el);
};

// Используя делегирование выбираю кнопку подсказки в опциях
options.onclick = function (e) {
  const t = e.target.closest('[data-title]');
  if (!t?.dataset?.title) {
    return;
  }
  showTooltip(t);
};

// Открываю окно подсказки с текстом, соответствующим кнопке
function showTooltip(button) {
  toolTip.classList.add('tooltip_opened');
  toolTipText.textContent = button.dataset.title;
}

// Функция получения рандомного текста с сервера
function getRandomText() {
  return fetch('https://fish-text.ru/get', {}).then((res) => {
    return res.ok ? res.json() : Promise.reject(res.status);
  });
}

// Увеличиваю шрифт
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

// Уменьшаю шрифт
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

// Слушатели событий
// Выбор всех чек боксов
buttonCheckAll.addEventListener('click', () => {
  checkboxInputs.forEach((item) => (item.checked = true));
  saveCheckboxSelection();
  refreshTransliteration();
  refreshSelectionStrip();
});

// Снять выбор со всех чекбоксов
buttonCheckNone.addEventListener('click', () => {
  checkboxInputs.forEach((item) => (item.checked = false));
  saveCheckboxSelection();
  refreshTransliteration();
  refreshSelectionStrip();
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

// Закрытие тултипа по кнопке
toolTipCloseButton.addEventListener('click', () => {
  toolTip.classList.remove('tooltip_opened');
});

// Закрытие тултипа по тёмной области
toolTip.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    toolTip.classList.remove('tooltip_opened');
  }
});

// Слушатель событий на кнопку рандомного текста
randomTextButton.addEventListener('click', () => {
  getRandomText()
    .then((res) => {
      textBefore.value = res.text;
      openSourceDetails();
      refreshTransliteration();
    })
    .catch((err) => {
      console.log(err);
      textBefore.value =
        'Упс. При загрузке текста произошла ошибка, повторите позже.';
      openSourceDetails();
      refreshTransliteration();
    });
});

// Слушатель на кнопку «Факты о Сакартвелло»
georgianFactButton.addEventListener('click', () => {
  textBefore.value =
    georgianFacts[Math.floor(Math.random() * georgianFacts.length)];
  openSourceDetails();
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
  openSourceDetails();
  refreshTransliteration();
});

// Кнопка увеличения текста до
buttonTextBeforeSizeUp.addEventListener('click', () => {
  increaseTextSize(textBefore);
});

// Кнопка уменьшения текста до
buttonTextBeforeSizeDown.addEventListener('click', () => {
  decreaseTextSize(textBefore);
});

// Кнопка увеличения текста после
buttonTextAfterSizeUp.addEventListener('click', () => {
  increaseTextSize(textOutput);
});

// Кнопка уменьшения текста после
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
  }
});

optionsCheckboxInputs.forEach((input) => {
  input.addEventListener('change', () => {
    refreshTransliteration();
  });
});

layoutAlphabetRuBlocks();
initAlphabetCards();
restoreCheckboxSelection();
refreshTransliteration();
refreshSelectionStrip();

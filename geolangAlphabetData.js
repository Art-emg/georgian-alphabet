/**
 * Данные по буквам (табличный материал курсов по произношению алфавита).
 * shortMain — краткий кириллический аналог; shortParen — кириллическое название (ани, ба́ни…);
 * ruAnalog — полная строка «русского аналога» из таблицы (для пояснения снизу в режиме classic).
 */

(function () {
  const MKH_ORDER = [
    'ა',
    'ბ',
    'გ',
    'დ',
    'ე',
    'ვ',
    'ზ',
    'თ',
    'ი',
    'კ',
    'ლ',
    'მ',
    'ნ',
    'ო',
    'პ',
    'ჟ',
    'რ',
    'ს',
    'ტ',
    'უ',
    'ფ',
    'ქ',
    'ღ',
    'ყ',
    'შ',
    'ჩ',
    'ც',
    'ძ',
    'წ',
    'ჭ',
    'ხ',
    'ჯ',
    'ჰ',
  ].map((c) => c.trim());

  const GEO_LANG_TABLE = {
    ა: {
      shortMain: 'а',
      shortParen: 'а́ни',
      ruAnalog: 'а',
      ipa: 'ɑ',
      latinOfficial: 'a',
      latinUnofficial: '',
    },
    ბ: {
      shortMain: 'б',
      shortParen: 'ба́ни',
      ruAnalog: 'б',
      ipa: 'b',
      latinOfficial: 'b',
      latinUnofficial: '',
    },
    გ: {
      shortMain: 'г',
      shortParen: 'га́ни',
      ruAnalog: 'г',
      ipa: 'ɡ',
      latinOfficial: 'g',
      latinUnofficial: '',
    },
    დ: {
      shortMain: 'д',
      shortParen: 'до́ни',
      ruAnalog: 'д',
      ipa: 'd',
      latinOfficial: 'd',
      latinUnofficial: '',
    },
    ე: {
      shortMain: 'э/е',
      shortParen: 'э́ни',
      ruAnalog: 'э/е',
      ipa: 'ɛ',
      latinOfficial: 'e',
      latinUnofficial: '',
    },
    ვ: {
      shortMain: 'в',
      shortParen: 'ви́ни',
      ruAnalog: 'в',
      ipa: 'v',
      latinOfficial: 'v',
      latinUnofficial: '',
    },
    ზ: {
      shortMain: 'з',
      shortParen: 'зэ́ни',
      ruAnalog: 'з',
      ipa: 'z',
      latinOfficial: 'z',
      latinUnofficial: '',
    },
    თ: {
      shortMain: 'т',
      shortParen: 'та́ни',
      ruAnalog: 'т лёгкое, на выдохе',
      ipa: 'tʰ',
      latinOfficial: 't',
      latinUnofficial: 'T, t',
    },
    ი: {
      shortMain: 'и',
      shortParen: 'и́ни',
      ruAnalog: 'и',
      ipa: 'i',
      latinOfficial: 'i',
      latinUnofficial: '',
    },
    კ: {
      shortMain: 'к',
      shortParen: 'ка́ни',
      ruAnalog: 'к резкое, без выдоха',
      ipa: 'kʼ',
      latinOfficial: 'k',
      latinUnofficial: '',
    },
    ლ: {
      shortMain: 'л',
      shortParen: 'ла́си',
      ruAnalog: 'л',
      ipa: 'l',
      latinOfficial: 'l',
      latinUnofficial: '',
    },
    მ: {
      shortMain: 'м',
      shortParen: 'ма́ни',
      ruAnalog: 'м',
      ipa: 'm',
      latinOfficial: 'm',
      latinUnofficial: '',
    },
    ნ: {
      shortMain: 'н',
      shortParen: 'на́ри',
      ruAnalog: 'н',
      ipa: 'n',
      latinOfficial: 'n',
      latinUnofficial: '',
    },
    ო: {
      shortMain: 'о',
      shortParen: 'о́ни',
      ruAnalog: 'о',
      ipa: 'ɔ',
      latinOfficial: 'o',
      latinUnofficial: '',
    },
    პ: {
      shortMain: 'п',
      shortParen: 'па́ри',
      ruAnalog: 'п резкое, без выдоха',
      ipa: 'pʼ',
      latinOfficial: 'p',
      latinUnofficial: '',
    },
    ჟ: {
      shortMain: 'ж',
      shortParen: 'жа́ни',
      ruAnalog: 'ж мягкое',
      ipa: 'ʒ',
      latinOfficial: 'zh',
      latinUnofficial: 'J, zh, j',
    },
    რ: {
      shortMain: 'р',
      shortParen: 'ра́э',
      ruAnalog: 'р',
      ipa: 'r',
      latinOfficial: 'r',
      latinUnofficial: '',
    },
    ს: {
      shortMain: 'с',
      shortParen: 'са́ни',
      ruAnalog: 'с',
      ipa: 's',
      latinOfficial: 's',
      latinUnofficial: '',
    },
    ტ: {
      shortMain: 'т',
      shortParen: 'та́ри',
      ruAnalog: 'т резкое, без выдоха',
      ipa: 'tʼ',
      latinOfficial: 't',
      latinUnofficial: '',
    },
    უ: {
      shortMain: 'у',
      shortParen: 'у́ни',
      ruAnalog: 'у',
      ipa: 'u',
      latinOfficial: 'u',
      latinUnofficial: '',
    },
    ფ: {
      shortMain: 'п',
      shortParen: 'па́ри',
      ruAnalog: 'п лёгкое, на выдохе',
      ipa: 'pʰ',
      latinOfficial: 'p',
      latinUnofficial: 'p, f',
    },
    ქ: {
      shortMain: 'к',
      shortParen: 'ка́ни',
      ruAnalog: 'к лёгкое, на выдохе',
      ipa: 'kʰ',
      latinOfficial: 'k',
      latinUnofficial: 'q, k',
    },
    ღ: {
      shortMain: 'г/х',
      shortParen: 'га́ни',
      ruAnalog: 'г/х',
      ipa: 'ʁ',
      latinOfficial: 'gh',
      latinUnofficial: 'g, gh, R',
    },
    ყ: {
      shortMain: 'к/х',
      shortParen: 'ка́ри',
      ruAnalog: 'к/х глубокое, без выдоха',
      ipa: 'χʼ',
      latinOfficial: 'qʼ',
      latinUnofficial: 'y',
    },
    შ: {
      shortMain: 'ш',
      shortParen: 'ши́ни',
      ruAnalog: 'ш мягкое',
      ipa: 'ʃ',
      latinOfficial: 'sh',
      latinUnofficial: 'sh, S',
    },
    ჩ: {
      shortMain: 'ч',
      shortParen: 'чи́ни',
      ruAnalog: 'ч лёгкое, на выдохе',
      ipa: 't͡ʃʰ',
      latinOfficial: 'ch',
      latinUnofficial: 'ch, C',
    },
    ც: {
      shortMain: 'ц',
      shortParen: 'ца́ни',
      ruAnalog: 'ц лёгкое, на выдохе',
      ipa: 't͡sʰ',
      latinOfficial: 'ts',
      latinUnofficial: 'c, ts',
    },
    ძ: {
      shortMain: 'дз',
      shortParen: 'дзи́ли',
      ruAnalog: 'дз совмещённое',
      ipa: 'd͡z',
      latinOfficial: 'dz',
      latinUnofficial: 'dz, Z',
    },
    წ: {
      shortMain: 'ц',
      shortParen: 'ци́ли',
      ruAnalog: 'ц резкое, без выдоха',
      ipa: 't͡sʼ',
      latinOfficial: 'tsʼ',
      latinUnofficial: 'w, c, ts',
    },
    ჭ: {
      shortMain: 'ч',
      shortParen: 'ча́ри',
      ruAnalog: 'ч резкое, без выдоха',
      ipa: 't͡ʃʼ',
      latinOfficial: 'chʼ',
      latinUnofficial: 'W, ch, tch',
    },
    ხ: {
      shortMain: 'х',
      shortParen: 'ха́ни',
      ruAnalog: 'х глубокое',
      ipa: 'χ',
      latinOfficial: 'kh',
      latinUnofficial: 'x, kh',
    },
    ჯ: {
      shortMain: 'дж',
      shortParen: 'джа́ни',
      ruAnalog: 'дж совмещённое',
      ipa: 'd͡ʒ',
      latinOfficial: 'j',
      latinUnofficial: '',
    },
    ჰ: {
      shortMain: 'х',
      shortParen: 'ха́э',
      ruAnalog: 'х лёгкое, на выдохе',
      ipa: 'h',
      latinOfficial: 'h',
      latinUnofficial: '',
    },
  };

  const MKH_ED = 0x10d0;
  const MTV_ED = 0x1c90;

  function mkhedruliToMtavruliChar(ch) {
    const cp = ch && ch.codePointAt(0);
    if (
      cp === undefined ||
      Number.isNaN(cp) ||
      cp < MKH_ED ||
      cp > MKH_ED + 37
    ) {
      return ch;
    }
    return String.fromCodePoint(cp - MKH_ED + MTV_ED);
  }

  /** Хвост ruAnalog после shortMain («т …» → пояс «лёгкое…» под основной строкой). */
  function classicParen(shortMain, ruAnalog) {
    const r = String(ruAnalog || '').trim();
    const m = String(shortMain || '').trim();
    if (!r || r === m) return '';
    if (!r.startsWith(m)) return r;
    return r.slice(m.length).replace(/^[\s,:;—–-]+/, '').trim();
  }

  /** Возвращает { main, paren } под карточку / тест (paren без скобок). */
  function getGeorgianLetterCaptionParts(geo, captionMode) {
    const row = GEO_LANG_TABLE[geo];
    const mode =
      captionMode ||
      window.__georgianCaptionModeFallback ||
      'classic';
    if (!row) {
      return {
        main: '—',
        paren: '',
      };
    }
    switch (mode) {
      case 'classic':
        return {
          main: row.shortMain,
          paren: classicParen(row.shortMain, row.ruAnalog),
        };
      case 'cyrillic_names':
        return {
          main: row.shortParen || '',
          paren: '',
        };
      case 'ipa':
        return {
          main: row.ipa,
          paren: '',
        };
      case 'latin_official':
        return {
          main: row.latinOfficial || '—',
          paren: '',
        };
      case 'latin_unofficial':
        return {
          main:
            row.latinUnofficial && row.latinUnofficial.trim()
              ? row.latinUnofficial
              : row.latinOfficial || '—',
          paren: '',
        };
      default:
        return {
          main: row.shortMain,
          paren: classicParen(row.shortMain, row.ruAnalog),
        };
    }
  }

  function toDisplayGeorgianGlyph(chMkh, glyphStyle) {
    const s = glyphStyle || 'mkhedruli';
    if (s === 'mtavruli') return mkhedruliToMtavruliChar(chMkh);
    return chMkh;
  }

  /** Для ключей викторины: стабильный ярлык в зависимости от режима. */
  function getGeorgianQuizLabelKey(geo, captionMode) {
    const p = getGeorgianLetterCaptionParts(geo, captionMode);
    return p.paren ? `${p.main} (${p.paren})` : p.main;
  }

  /** characterEquivalent сохранён для явной карты кириллица↔гео в скриптах при необходимости; движок подставляет value чекбоксов из разметки. */
  window.GEORGIAN_LETTER_ORDER = MKH_ORDER;
  window.GEO_LANG_ALPHA_BY_LETTER = GEO_LANG_TABLE;
  window.getGeorgianLetterCaptionParts = getGeorgianLetterCaptionParts;
  window.getGeorgianQuizLabelKey = getGeorgianQuizLabelKey;
  window.toDisplayGeorgianGlyph = toDisplayGeorgianGlyph;
  window.mkhedruliToMtavruliChar = mkhedruliToMtavruliChar;
})();

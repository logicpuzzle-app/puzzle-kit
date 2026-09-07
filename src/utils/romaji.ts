const SMALL_TO_LARGE: Record<string, string> = {
  'ァ': 'ア',
  'ィ': 'イ',
  'ゥ': 'ウ',
  'ェ': 'エ',
  'ォ': 'オ',
  'ャ': 'ヤ',
  'ュ': 'ユ',
  'ョ': 'ヨ',
  'ッ': 'ツ',
  'ヮ': 'ワ',
};

const ROMAJI_TO_KATAKANA: Record<string, string> = {
  'a': 'ア',
  'i': 'イ',
  'u': 'ウ',
  'e': 'エ',
  'o': 'オ',
  'ka': 'カ',
  'ki': 'キ',
  'ku': 'ク',
  'ke': 'ケ',
  'ko': 'コ',
  'sa': 'サ',
  'si': 'シ',
  'su': 'ス',
  'se': 'セ',
  'so': 'ソ',
  'ta': 'タ',
  'ti': 'チ',
  'tu': 'ツ',
  'te': 'テ',
  'to': 'ト',
  'na': 'ナ',
  'ni': 'ニ',
  'nu': 'ヌ',
  'ne': 'ネ',
  'no': 'ノ',
  'ha': 'ハ',
  'hi': 'ヒ',
  'hu': 'フ',
  'he': 'ヘ',
  'ho': 'ホ',
  'ma': 'マ',
  'mi': 'ミ',
  'mu': 'ム',
  'me': 'メ',
  'mo': 'モ',
  'ya': 'ヤ',
  'yi': 'イ',
  'yu': 'ユ',
  'ye': 'イェ',
  'yo': 'ヨ',
  'ra': 'ラ',
  'ri': 'リ',
  'ru': 'ル',
  're': 'レ',
  'ro': 'ロ',
  'wa': 'ワ',
  'wi': 'ヰ',
  'wu': 'ウ',
  'we': 'ヱ',
  'wo': 'ヲ',
  'ga': 'ガ',
  'gi': 'ギ',
  'gu': 'グ',
  'ge': 'ゲ',
  'go': 'ゴ',
  'za': 'ザ',
  'zi': 'ジ',
  'zu': 'ズ',
  'ze': 'ゼ',
  'zo': 'ゾ',
  'da': 'ダ',
  'di': 'ヂ',
  'du': 'ヅ',
  'de': 'デ',
  'do': 'ド',
  'ba': 'バ',
  'bi': 'ビ',
  'bu': 'ブ',
  'be': 'ベ',
  'bo': 'ボ',
  'pa': 'パ',
  'pi': 'ピ',
  'pu': 'プ',
  'pe': 'ペ',
  'po': 'ポ',
  'sha': 'シャ',
  'shi': 'シ',
  'shu': 'シュ',
  'she': 'シェ',
  'sho': 'ショ',
  'sya': 'シャ',
  'syi': 'シィ',
  'syu': 'シュ',
  'sye': 'シェ',
  'syo': 'ショ',
  'cha': 'チャ',
  'chi': 'チ',
  'chu': 'チュ',
  'che': 'チェ',
  'cho': 'チョ',
  'tya': 'チャ',
  'tyi': 'チィ',
  'tyu': 'チュ',
  'tye': 'チェ',
  'tyo': 'チョ',
  'nya': 'ニャ',
  'nyi': 'ニィ',
  'nyu': 'ニュ',
  'nye': 'ニェ',
  'nyo': 'ニョ',
  'dya': 'ヂャ',
  'dyi': 'ヂィ',
  'dyu': 'ヂュ',
  'dye': 'ヂェ',
  'dyo': 'ヂョ',
  'hya': 'ヒャ',
  'hyi': 'ヒィ',
  'hyu': 'ヒュ',
  'hye': 'ヒェ',
  'hyo': 'ヒョ',
  'mya': 'ミャ',
  'myi': 'ミィ',
  'myu': 'ミュ',
  'mye': 'ミェ',
  'myo': 'ミョ',
  'rya': 'リャ',
  'ryi': 'リィ',
  'ryu': 'リュ',
  'rye': 'リェ',
  'ryo': 'リョ',
  'gya': 'ギャ',
  'gyi': 'ギィ',
  'gyu': 'ギュ',
  'gye': 'ギェ',
  'gyo': 'ギョ',
  'ja': 'ジャ',
  'ji': 'ジ',
  'ju': 'ジュ',
  'je': 'ジェ',
  'jo': 'ジョ',
  'zya': 'ジャ',
  'zyi': 'ジィ',
  'zyu': 'ジュ',
  'zye': 'ジェ',
  'zyo': 'ジョ',
  'bya': 'ビャ',
  'byi': 'ビィ',
  'byu': 'ビュ',
  'bye': 'ビェ',
  'byo': 'ビョ',
  'pya': 'ピャ',
  'pyi': 'ピィ',
  'pyu': 'ピュ',
  'pye': 'ピェ',
  'pyo': 'ピョ',
  'fa': 'ファ',
  'fi': 'フィ',
  'fu': 'フ',
  'fe': 'フェ',
  'fo': 'フォ',
  'va': 'ヴァ',
  'vi': 'ヴィ',
  'vu': 'ヴ',
  've': 'ヴェ',
  'vo': 'ヴォ',
  'kya': 'キャ',
  'kyi': 'キィ',
  'kyu': 'キュ',
  'kye': 'キェ',
  'kyo': 'キョ',
  'tsu': 'ツ',
  'nn': 'ン',
  'xya': 'ャ',
  'xyu': 'ュ',
  'xyo': 'ョ',
  'xtu': 'ッ',
  'xtsu': 'ッ',
  'ltu': 'ッ',
  'ltsu': 'ッ',
  'xwa': 'ヮ',
};

const ROMAJI_KEYS = Object.keys(ROMAJI_TO_KATAKANA);
const CONSONANTS = 'bcdfghjklmpqrstvwxyz';

export const ROMAJI_N_CONFIRM_DELAY = 800;

export function isHiraganaChar(char: string): boolean {
  return /^[\u3040-\u309F]$/.test(char);
}

export function isKatakanaChar(char: string): boolean {
  return /^[\u30A0-\u30FF]$/.test(char);
}

function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3040-\u309F]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}

function normalizeKatakana(str: string): string {
  return str
    .split('')
    .map((char) => SMALL_TO_LARGE[char] ?? char)
    .join('');
}

export function normalizeKanaFromKatakana(
  katakana: string,
  mode: 'hiragana' | 'katakana'
): string {
  const normalized = normalizeKatakana(katakana);
  return mode === 'hiragana' ? katakanaToHiragana(normalized) : normalized;
}

export function normalizeKanaInput(
  char: string,
  mode: 'hiragana' | 'katakana'
): string {
  const katakana = isHiraganaChar(char) ? hiraganaToKatakana(char) : char;
  return normalizeKanaFromKatakana(katakana, mode);
}

export function handleRomajiInput(buffer: string, char: string): {
  output: string | null;
  buffer: string;
  startNConfirm: boolean;
} {
  if (char === '-') {
    return { output: 'ー', buffer, startNConfirm: false };
  }

  const newBuffer = buffer + char;

  if (
    buffer === 'n' &&
    char !== 'a' &&
    char !== 'i' &&
    char !== 'u' &&
    char !== 'e' &&
    char !== 'o' &&
    char !== 'y' &&
    char !== 'n'
  ) {
    return { output: 'ン', buffer: char, startNConfirm: char === 'n' };
  }

  if (buffer.length === 1 && CONSONANTS.includes(buffer) && buffer === char) {
    return { output: 'ツ', buffer: char, startNConfirm: false };
  }

  for (let len = Math.min(newBuffer.length, 4); len > 0; len -= 1) {
    const substr = newBuffer.slice(-len);
    if (ROMAJI_TO_KATAKANA[substr]) {
      const katakana = ROMAJI_TO_KATAKANA[substr];
      const remaining = newBuffer.slice(0, -len);
      return { output: katakana, buffer: remaining, startNConfirm: remaining === 'n' };
    }
  }

  const hasPotentialMatch = ROMAJI_KEYS.some((key) => key.startsWith(newBuffer));
  if (hasPotentialMatch) {
    if (newBuffer.length <= 4) {
      return { output: null, buffer: newBuffer, startNConfirm: newBuffer === 'n' };
    }
    const remaining = newBuffer.slice(1);
    return { output: newBuffer[0], buffer: remaining, startNConfirm: remaining === 'n' };
  }

  const remaining = newBuffer.slice(1);
  return { output: null, buffer: remaining, startNConfirm: remaining === 'n' };
}

export function handleRomajiDelete(buffer: string): {
  buffer: string;
  startNConfirm: boolean;
  handled: boolean;
} {
  if (buffer.length === 0) {
    return { buffer, startNConfirm: false, handled: false };
  }
  const next = buffer.slice(0, -1);
  return { buffer: next, startNConfirm: next === 'n', handled: true };
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ja } from './locales/ja';

const resources = {
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
};

const LANGUAGE_STORAGE_KEY = 'puzzlekit-language';

function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    if (typeof localStorage.getItem !== 'function') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (typeof localStorage.setItem !== 'function') return;
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/**
 * Detect the default language based on:
 * 1. localStorage saved preference
 * 2. Browser/system locale (Japanese regions → 'ja', others → 'en')
 */
function detectDefaultLanguage(): string {
  // Check localStorage first
  const saved = safeLocalStorageGet(LANGUAGE_STORAGE_KEY);
  if (saved === 'ja' || saved === 'en') {
    return saved;
  }

  // Check browser locale - only Japanese for 'ja', everything else defaults to 'en'
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
  if (browserLang.toLowerCase().startsWith('ja')) {
    return 'ja';
  }

  return 'en';
}

/**
 * Save language preference to localStorage
 */
export function saveLanguagePreference(lang: string): void {
  safeLocalStorageSet(LANGUAGE_STORAGE_KEY, lang);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectDefaultLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja'],
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  saveLanguagePreference(lng);
});

export default i18n;

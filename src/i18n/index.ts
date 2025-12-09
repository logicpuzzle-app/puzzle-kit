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

/**
 * Detect the default language based on:
 * 1. localStorage saved preference
 * 2. Browser/system locale (Japanese regions → 'ja', others → 'en')
 */
function detectDefaultLanguage(): string {
  // Check localStorage first
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
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
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectDefaultLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  saveLanguagePreference(lng);
});

export default i18n;

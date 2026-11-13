import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Language,
  TranslationDictionary,
  dictionaries,
  translateKey,
  getTranslatedStageName,
  getTranslatedCategory,
  SUPPORTED_LANGUAGES,
} from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
  dict: TranslationDictionary;
  translateStage: (stageName: string) => string;
  translateCategory: (category: string) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const defaultContextValue: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (path: string, fallback?: string) => translateKey('en', path, fallback),
  dict: dictionaries.en,
  translateStage: (stageName: string) => getTranslatedStageName(stageName, 'en'),
  translateCategory: (category: string) => getTranslatedCategory(category, 'en'),
  supportedLanguages: SUPPORTED_LANGUAGES,
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

const STORAGE_KEY = 'furniture_app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved && (saved === 'en' || saved === 'am' || saved === 'om')) {
        return saved;
      }
    } catch {
      // localStorage may fail in some environments
    }
    return 'en';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore DOM errors
    }
  }, [language]);

  const t = (path: string, fallback?: string) => translateKey(language, path, fallback);
  const dict = dictionaries[language] || dictionaries.en;
  const translateStage = (stageName: string) => getTranslatedStageName(stageName, language);
  const translateCategory = (category: string) => getTranslatedCategory(category, language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dict,
        translateStage,
        translateCategory,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  return useContext(LanguageContext) || defaultContextValue;
};

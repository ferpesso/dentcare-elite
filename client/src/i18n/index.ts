import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptPT from './locales/pt-PT.json';
import ptBR from './locales/pt-BR.json';
import enGB from './locales/en-GB.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';
import frFR from './locales/fr-FR.json';

const resources = {
  'pt-PT': { translation: ptPT },
  'pt-BR': { translation: ptBR },
  'en-GB': { translation: enGB },
  'en-US': { translation: enUS },
  'es-ES': { translation: esES },
  'fr-FR': { translation: frFR },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-PT',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'dentcare-language',
    }
  });

export default i18n;

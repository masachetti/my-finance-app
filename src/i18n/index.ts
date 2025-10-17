import { createI18n } from 'vue-i18n'
import enUS from '@/locales/en-US'
import ptBR from '@/locales/pt-BR'

export type MessageSchema = typeof ptBR

const i18n = createI18n<[MessageSchema], 'pt-BR' | 'en-US'>({
  legacy: false, // Use Composition API mode
  locale: 'pt-BR', // Default locale
  fallbackLocale: 'en-US',
  messages: {
    'pt-BR': ptBR,
    'en-US': enUS
  }
})

export default i18n

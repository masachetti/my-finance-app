import { createI18n } from 'vue-i18n'
import enUS from '@/locales/en-US'
import ptBR from '@/locales/pt-BR'

export type MessageSchema = typeof ptBR

// Type helper to create dot-notation paths for nested objects
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

// Type for all possible translation keys with dot notation
export type TranslationKey = NestedKeyOf<MessageSchema>

const i18n = createI18n<[MessageSchema], 'pt-BR' | 'en-US'>({
  legacy: false, // Use Composition API mode
  locale: 'pt-BR', // Default locale
  fallbackLocale: 'en-US',
  messages: {
    'pt-BR': ptBR,
    'en-US': enUS,
  },
})

export default i18n

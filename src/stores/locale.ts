import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/i18n'

export type Locale = 'pt-BR' | 'en-US'

export const useLocaleStore = defineStore(
  'locale',
  () => {
    const currentLocale = ref<Locale>('pt-BR')

    function setLocale(locale: Locale) {
      currentLocale.value = locale
      i18n.global.locale.value = locale
    }

    // Initialize i18n locale on store creation
    function initialize() {
      i18n.global.locale.value = currentLocale.value
    }

    return {
      currentLocale,
      setLocale,
      initialize
    }
  },
  {
    persist: {
      paths: ['currentLocale']
    }
  }
)

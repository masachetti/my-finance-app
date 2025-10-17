import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useLocaleStore } from './stores/locale'
import './assets/main.css'
import '@vuepic/vue-datepicker/dist/main.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(i18n)
app.use(router)

app.mount('#app')

// Initialize locale store after app is mounted
const localeStore = useLocaleStore()
localeStore.initialize()

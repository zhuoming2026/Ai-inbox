import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import router from './router'
import { ensureElectronApi } from './lib/browser-electron-api'
import './styles/tailwind.css'

ensureElectronApi()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(naive)
app.use(ui)
app.mount('#app')

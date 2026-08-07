import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './app/router'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(naive)
app.use(pinia)

const authStore = useAuthStore(pinia)
await authStore.initializeAuth()

app.use(router)

await router.isReady()
app.mount('#app')

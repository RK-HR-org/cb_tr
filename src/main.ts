import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import naive from 'naive-ui'

const app = createApp(App)
const pinia = createPinia()

app.use(naive)
app.use(pinia)
app.use(router)

app.mount('#app')

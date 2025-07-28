import './assets/main.css'
import './assets/css/boxy.css'
import './assets/js/boxy.js'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')

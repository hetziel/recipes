import './assets/main.css'
import './assets/css/boxy.css'
import '@flaticon/flaticon-uicons/css/all/all.css';

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')

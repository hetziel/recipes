import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Mostrar un prompt al usuario para actualizar
    if (confirm('Nueva versión disponible. ¿Recargar?')) {
      updateSW()
    }
  },
  onOfflineReady() {
    console.log('App lista para funcionar offline')
  },
})
<template>
  <div class="drive-container">
    <h1>Integración con Google Drive</h1>
    
    <div class="drive-sections">
      <!-- Sección 1: Subir al Drive Central de la App (Anónimo) -->
      <section class="drive-card">
        <h3>Subir al Drive Central</h3>
        <p>Los archivos se enviarán directamente al almacenamiento seguro de la aplicación.</p>
        <AnonymousGoogleDriveUploader />
      </section>

      <!-- Sección 2: Guardar Facturas en Drive Personal (Requiere Login) -->
      <section class="drive-card">
        <h3>Guardar en Google Drive Personal</h3>
        <p>Inicia sesión con tu cuenta para guardar tus facturas directamente en tu propio Drive.</p>
        <GoogleDriveUploader />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import GoogleDriveUploader from '@/components/GoogleDriveUploader.vue';
import AnonymousGoogleDriveUploader from '@/components/AnonymousGoogleDriveUploader.vue';
</script>

<style scoped>
.drive-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.drive-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (min-width: 768px) {
  .drive-sections {
    flex-direction: row;
    align-items: flex-start;
  }
}

.drive-card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eaeaea;
}

.drive-card h3 {
  margin-top: 0;
  color: #1a73e8;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.drive-card p {
  color: #5f6368;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.5;
}
</style>

<style scoped>
.drive-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
</style>

<template>
  <div class="drive-container">
    <h1>Integración con Google Drive</h1>
    <GoogleDriveUploader />
  </div>
</template>

<script setup lang="ts">
import GoogleDriveUploader from '@/components/GoogleDriveUploader.vue';
</script>

<style scoped>
.drive-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
</style>

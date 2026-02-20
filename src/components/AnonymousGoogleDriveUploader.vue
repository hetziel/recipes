<template>
  <div class="drive-uploader-anonymous">
    <h2>Subir archivo al Drive Central</h2>
    <p class="description">
      Selecciona un archivo para enviarlo de forma segura a nuestro almacenamiento en la nube.
    </p>

    <div class="upload-container">
      <input 
        type="file" 
        @change="handleFileUpload" 
        class="file-input"
        :disabled="isUploading"
      />
      <button 
        @click="uploadFile" 
        :disabled="!file || isUploading" 
        class="upload-button"
        :class="{ 'is-loading': isUploading }"
      >
        <span v-if="!isUploading">Subir Archivo</span>
        <span v-else>Subiendo...</span>
      </button>
    </div>

    <div v-if="uploadStatus" :class="['status-message', statusType]">
      {{ uploadStatus }}
    </div>

    <div v-if="uploadedFileUrl" class="success-links">
      <a :href="uploadedFileUrl" target="_blank" class="view-link">
        <i class="fi fi-rr-document"></i> Ver archivo subido
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// URL del Web App de Google Apps Script (Proporcionada por el usuario)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWrW0Sh7YBbE6CQQ-_AyTZ7KiJ2y52pilMVfBD4ai86pT8fPkdw4Ir4TiPdiemhkGZ/exec';

const file = ref<File | null>(null);
const uploadStatus = ref('');
const statusType = ref<'success' | 'error' | 'info'>('info');
const isUploading = ref(false);
const uploadedFileUrl = ref('');

// Manejar archivo seleccionado
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  file.value = target.files?.[0] || null;
  uploadStatus.value = '';
  uploadedFileUrl.value = '';
};

// Convertir archivo a Base64
const readFileAsBase64 = (fileToRead: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Extraer solo la parte base64 (remover el prefijo data:mime/type;base64,)
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileToRead);
  });
};

// Subir archivo anónimamente vía Google Apps Script
const uploadFile = async () => {
  if (!file.value) return;

  isUploading.value = true;
  uploadStatus.value = `Preparando "${file.value.name}"...`;
  statusType.value = 'info';
  uploadedFileUrl.value = '';

  try {
    const base64Data = await readFileAsBase64(file.value);

    // Los datos deben enviarse usando texto plano para evitar el preflight de CORS (OPTIONS)
    // El script de Google aún puede leerlo si se manda correctamente el cuerpo JSON o Form URL Encoded
    const formData = new URLSearchParams();
    formData.append('fileName', file.value.name);
    formData.append('mimeType', file.value.type);
    formData.append('fileData', base64Data);

    uploadStatus.value = 'Enviando a Google Drive...';

    // Se envía como form-urlencoded para evitar el preflight (OPTIONS) y 
    // permitimos que fetch siga la redirección por defecto.
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const result = await response.json();

    if (result.status === 'success') {
      uploadStatus.value = '¡Archivo subido exitosamente!';
      statusType.value = 'success';
      uploadedFileUrl.value = result.url; // Obtenemos la URL real
    } else {
      throw new Error(result.message || 'Error desconocido del servidor');
    } 
    file.value = null; 
    
    const fileInput = document.querySelector('.file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

  } catch (error) {
    console.error("Error al subir:", error);
    uploadStatus.value = 'Error al subir: ' + (error instanceof Error ? error.message : String(error));
    statusType.value = 'error';
  } finally {
    isUploading.value = false;
  }
};
</script>

<style scoped>
.drive-uploader-anonymous {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

h2 {
  margin-top: 0;
  color: #333;
  font-size: 1.25rem;
}

.description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.upload-container {
  display: flex;
  gap: 15px;
  flex-direction: column;
}

.file-input {
  padding: 12px;
  border: 2px dashed #ccc;
  border-radius: 6px;
  background-color: #fff;
  cursor: pointer;
  transition: border-color 0.3s;
}

.file-input:hover {
  border-color: #999;
}

.file-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-button {
  background-color: #0f9d58;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.upload-button:hover:not(:disabled) {
  background-color: #0b8043;
  transform: translateY(-1px);
}

.upload-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.upload-button.is-loading {
  animation: pulse 1.5s infinite;
}

.status-message {
  margin-top: 1.5rem;
  padding: 12px;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
}

.status-message.info {
  background-color: #e8f0fe;
  color: #1967d2;
  border: 1px solid #cce0ff;
}

.status-message.success {
  background-color: #e6f4ea;
  color: #137333;
  border: 1px solid #ceead6;
}

.status-message.error {
  background-color: #fce8e6;
  color: #c5221f;
  border: 1px solid #fad2cf;
}

.success-links {
  margin-top: 1rem;
  text-align: center;
}

.view-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1a73e8;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #e8f0fe;
  transition: background-color 0.2s;
}

.view-link:hover {
  background-color: #d2e3fc;
  text-decoration: underline;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

@media (min-width: 480px) {
  .upload-container {
    flex-direction: row;
    align-items: stretch;
  }
  .file-input {
    flex-grow: 1;
  }
}
</style>

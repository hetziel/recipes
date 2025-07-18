<template>
  <div class="drive-uploader">
    <button @click="authenticate" class="auth-button">
      Conectar con Google Drive
    </button>

    <div v-if="isAuthenticated" class="drive-actions">
      <input type="file" @change="handleFileUpload" class="file-input" />
      <button @click="uploadFile" :disabled="!file" class="upload-button">
        Subir a Drive
      </button>
      <button @click="listFiles" class="list-button">
        Listar archivos
      </button>
    </div>

    <div v-if="uploadStatus" class="status-message">
      {{ uploadStatus }}
    </div>

    <div v-if="files.length" class="file-list">
      <h3>Archivos en Drive:</h3>
      <ul>
        <li v-for="file in files" :key="file.id">
          {{ file.name }} ({{ file.mimeType }})
          <a :href="`https://drive.google.com/file/d/${file.id}/view`" target="_blank" class="view-link">Ver</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Configuración
const CLIENT_ID = '218046682607-38m1j3lhpnlboeoblqqpjnj0l506ujb8.apps.googleusercontent.com';
const API_KEY = ''; // No necesaria para OAuth
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

// Estados
const isAuthenticated = ref(false);
const file = ref<File | null>(null);
const uploadStatus = ref('');
const files = ref<any[]>([]);
const tokenClient = ref<any>(null);

// Inicializar el cliente de Google
const initClient = async () => {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      // @ts-ignore
      tokenClient.value = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Definido más tarde
      });
      resolve();
    };
    document.head.appendChild(script);
  });
};

// Cargar la API de Drive
const loadGapi = async () => {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      // @ts-ignore
      gapi.load('client', () => {
        // @ts-ignore
        gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        }).then(resolve);
      });
    };
    document.head.appendChild(script);
  });
};

// Autenticación
const authenticate = async () => {
  try {
    if (!tokenClient.value) {
      await initClient();
      await loadGapi();
    }

    tokenClient.value.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        throw resp;
      }
      isAuthenticated.value = true;
      uploadStatus.value = 'Autenticado correctamente';
    };

    // @ts-ignore
    if (google.accounts.oauth2.hasGrantedAllScopes(tokenClient.value, SCOPES)) {
      isAuthenticated.value = true;
      uploadStatus.value = 'Ya autenticado';
    } else {
      // @ts-ignore
      tokenClient.value.requestAccessToken({ prompt: 'consent' });
    }
  } catch (error) {
    console.error("Error de autenticación:", error);
    uploadStatus.value = 'Error al autenticar: ' + error.message;
  }
};

// Manejar archivo seleccionado
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  file.value = target.files?.[0] || null;
};

// Subir archivo
const uploadFile = async () => {
  if (!file.value) return;

  try {
    const metadata = {
      name: file.value.name,
      mimeType: file.value.type,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file.value);

    // @ts-ignore
    const accessToken = gapi.client.getToken().access_token;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({
        'Authorization': 'Bearer ' + accessToken
      }),
      body: form,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    uploadStatus.value = `Archivo "${result.name}" subido correctamente`;
    file.value = null;
    await listFiles();
  } catch (error) {
    console.error("Error al subir:", error);
    uploadStatus.value = 'Error al subir: ' + error.message;
  }
};

// Listar archivos
const listFiles = async () => {
  try {
    // @ts-ignore
    const response = await gapi.client.drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, webViewLink)',
    });
    files.value = response.result.files;
  } catch (error) {
    console.error("Error al listar:", error);
    uploadStatus.value = 'Error al listar: ' + error.message;
  }
};

// Cargar APIs al montar el componente
onMounted(async () => {
  await initClient();
  await loadGapi();
});
</script>

<style scoped>
/* Estilos anteriores se mantienen igual */
.drive-uploader {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.auth-button {
  background-color: #4285f4;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.auth-button:hover {
  background-color: #3367d6;
}

.drive-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.file-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.upload-button,
.list-button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.upload-button {
  background-color: #34a853;
  color: white;
}

.upload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.list-button {
  background-color: #fbbc05;
  color: #202124;
}

.status-message {
  margin-top: 1rem;
  padding: 10px;
  border-radius: 4px;
  background-color: #e8f0fe;
  color: #1967d2;
}

.file-list {
  margin-top: 1.5rem;
}

.file-list ul {
  list-style-type: none;
  padding: 0;
}

.file-list li {
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-link {
  color: #1a73e8;
  text-decoration: none;
  font-size: 0.8em;
  padding: 3px 8px;
  border-radius: 3px;
  background-color: #e8f0fe;
}

.view-link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .drive-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .file-input,
  .upload-button,
  .list-button {
    width: 100%;
  }
}
</style>

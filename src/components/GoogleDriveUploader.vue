<script setup lang="ts">
import { google } from 'googleapis'

const CLIENT_ID = 'TU_CLIENT_ID.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

let driveClient: any = null

async function authenticate() {
  try {
    const authClient = await google.auth.getClient({
      clientId: CLIENT_ID,
      scopes: SCOPES,
    })
    await authClient.signIn()
    driveClient = google.drive({ version: 'v3', auth: authClient })
    alert('Autenticación exitosa!')
  } catch (error) {
    alert('Error de autenticación')
    console.error(error)
  }
}

async function uploadFile(event: Event) {
  if (!driveClient) {
    alert('Primero debes autenticarte')
    return
  }
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const response = await driveClient.files.create({
    requestBody: {
      name: file.name,
      mimeType: file.type,
    },
    media: {
      mimeType: file.type,
      body: file,
    },
  })
  alert('Archivo subido: ' + response.data.id)
}
</script>

<template>
  <div>
    <button @click="authenticate">Autenticar con Google Drive</button>
    <input type="file" @change="uploadFile" />
  </div>
</template>

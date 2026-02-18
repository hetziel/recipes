<template>
    <div class="scanner-overlay">
        <div class="scanner-container">
            <div class="scanner-header">
                <h3>Escanear Código de Barras</h3>
                <button @click="$emit('close')" class="close-btn">
                    <Icon name="close" />
                </button>
            </div>
            <div class="video-wrapper">
                <video ref="videoElement" class="scanner-video"></video>
                <div class="scanner-guide"></div>
                <div v-if="isLoading" class="loading-overlay">
                    <div class="spinner"></div>
                    <p>Iniciando cámara...</p>
                </div>
            </div>
            <div class="scanner-footer">
                <p v-if="error" class="error-text">{{ error }}</p>
                <p v-else class="instruction-text">Apunta el código de barras con la cámara</p>

                <div v-if="cameras.length > 1" class="camera-select">
                    <select v-model="selectedDeviceId" @change="startScan">
                        <option v-for="cam in cameras" :key="cam.deviceId" :value="cam.deviceId">
                            {{ cam.label || 'Cámara ' + (cameras.indexOf(cam) + 1) }}
                        </option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import Icon from '@/components/ui/Icon.vue';

const emit = defineEmits(['decode', 'close']);

const videoElement = ref<HTMLVideoElement | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const codeReader = new BrowserMultiFormatReader();
const cameras = ref<any[]>([]);
const selectedDeviceId = ref<string>('');

onMounted(async () => {
    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        cameras.value = videoInputDevices;

        // Prefer back camera if available
        const backCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('trasera'));

        if (backCamera) {
            selectedDeviceId.value = backCamera.deviceId;
        } else if (videoInputDevices.length > 0) {
            selectedDeviceId.value = videoInputDevices[0].deviceId;
        }

        if (!videoElement.value) {
            console.error('Video element not found');
            return;
        }

        await startScan();
    } catch (err: any) {
        console.error('Error listing devices:', err);
        error.value = 'No se encontraron cámaras o no hay permisos.';
        isLoading.value = false;
    }
});

async function startScan() {
    if (!selectedDeviceId.value) return;

    isLoading.value = true;
    error.value = null;

    try {
        // Reset if already running
        codeReader.reset();

        // Use decodeFromVideoDevice which is the standard way with BrowserMultiFormatReader
        // Note: The library type definitions might be tricky, sometimes it takes undefined for deviceId to use default
        await codeReader.decodeFromVideoDevice(
            selectedDeviceId.value,
            videoElement.value!,
            (result, err) => {
                if (result) {
                    console.log('Result found:', result);
                    emit('decode', result.getText());
                    // We don't stop automatically to allow multiple scans or just continuous scanning until closed
                    // But typically for a single input fill, we might want to close.
                    // Let the parent decide or close manually.
                }
                if (err && !(err instanceof NotFoundException)) {
                    console.error(err);
                }
            }
        );
    } catch (err: any) {
        console.error('Error starting scan:', err);
        error.value = 'Error al iniciar la cámara: ' + err.message;
    } finally {
        isLoading.value = false;
    }
}

onUnmounted(() => {
    codeReader.reset();
});
</script>

<style scoped>
.scanner-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.scanner-container {
    background: var(--surface);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
}

.scanner-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
}

.scanner-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
}

.close-btn:hover {
    background-color: var(--background);
}

.video-wrapper {
    position: relative;
    width: 100%;
    height: 300px;
    /* Or aspect ratio wrapper */
    background: #000;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.scanner-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.scanner-guide {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 150px;
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    pointer-events: none;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top: 4px solid white;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.scanner-footer {
    padding: 1rem;
    text-align: center;
    background: var(--surface);
}

.error-text {
    color: var(--danger);
    margin: 0;
}

.instruction-text {
    color: var(--text-secondary);
    margin-bottom: 10px;
    margin-top: 0;
}

.camera-select {
    margin-top: 0.5rem;
}

.camera-select select {
    padding: 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--text-primary);
    max-width: 100%;
    width: 100%;
}
</style>

---
description: Información detallada sobre el funcionamiento total del sistema MyShops
---

# MyShops System Overview

Este documento proporciona un recorrido completo por el funcionamiento técnico y lógico del sistema MyShops para facilitar el desarrollo y mantenimiento.

## 🚀 Arquitectura Tecnológica

- **Frontend**: Vue 3 con Composition API y Vite.
- **Plataforma Móvil**: Capacitor (generación de app Android).
- **Backend as a Service**: Firebase (Firestore, Auth, Analytics, Hosting).
- **Gestión de Estado**: Composables de Vue con estado global compartido.
- **Iconografía**: @flaticon/flaticon-uicons y @mdi/js.
- **Otras Herramientas**: ZXing (escaneo de códigos de barra), html-to-image (generación de reportes/tickets).

## 📂 Estructura de Archivos Clave

- `/src/firebase.config.ts`: Configuración central de Firebase (Firestore, Auth, Analytics).
- `/src/router/index.ts`: Definición de rutas y guardias de seguridad (basado en roles de usuario).
- `/src/composables/`: Lógica de negocio y sincronización en tiempo real con Firestore.
- `/src/views/`: Componentes de página principales.
- `/src/types/`: Definiciones de interfaces TypeScript para el modelo de datos.

## 🔄 Flujo de Datos y Funcionamiento

### 1. Autenticación y Seguridad
El sistema utiliza **Firebase Auth** y guardias de navegación en el router. 
- Los perfiles de usuario se guardan en la colección `users` de Firestore.
- Roles: `admin` (acceso total) y `user` (acceso limitado, principalmente a producción).

### 2. Gestión de Productos (`/`)
Es la vista principal para administradores. Permite gestionar el inventario (productos, precios, stock). Sincronizado en tiempo real a través del composable `useProducts`.

### 3. Módulo de Producción y Recetas (`/production`)
La vista principal de producción (`Recipes.vue`) organiza los datos en dos listas separadas para mejorar la claridad operativa:
- **Lotes de Pollos**: Sección superior dedicada a la producción avícola. Muestra inversión por unidad (pollo) y costo total. Al expandirse, muestra el resumen de costos de alimento y ganancia proyectada.
- **Recetas Estándar**: Sección para preparaciones generales. Muestra la inversión base y, al expandirse, permite ver los **Escenarios de Venta** (diferentes presentaciones o empaques del producto final).
- **Lógica de Negocio**:
  - Utiliza el composable `useProduction` para todos los cálculos financieros.
  - Los datos se cargan desde las colecciones `recipes` y `scenarios` de Firestore.
  - La navegación para creación/edición es diferenciada: `/production/create` para recetas y `/production/chicken/create` para lotes.

### 4. Transacciones (Compras y Ventas)
- **Ventas (`/sales`)**: Registro de salidas de productos y facturación básica.
- **Compras (`/buys`)**: Registro de entrada de mercancía e insumos.

### 5. Configuración y Maestros
- **Categorías y Marcas**: Gestión de metadatos para organizar los productos.
- **Establecimientos y Clientes**: Gestión del ecosistema del negocio.

### 6. Herramientas y Servicios Auxiliares
- **Gestión de Divisas**: El sistema maneja precios en Bolívares (Bs) y Dólares (USD). En `App.vue`, se sincroniza la tasa oficial (BCV) o paralela mediante un proceso automático y se provee a toda la aplicación con `provide('dolarBCV', ...)`.
- **Calculadora**: Conversión rápida de precios entre Bs y USD.
- **Google Drive**: Integración para exportación/respaldo de datos.

## 🖼️ Interfaz y Experiencia de Usuario

- **Layout Global**: Definido en `App.vue`. Utiliza un sidebar responsivo que se oculta en móviles y un header persistente que muestra la tasa del dólar actual.
- **Navegación Dinámica**: Los menús laterales cambian según el rol del usuario (Admin ve todo, Usuario ve principalmente Producción).
- **Feedback Visual**: Implementa estados de carga (spinners) y notificaciones para acciones asíncronas con Firebase.

## 🛠️ Desarrollo y Mantenimiento

### Variables de Entorno (.env)
Se deben configurar las siguientes variables de Firebase en el archivo `.env`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- (y otros `VITE_FIREBASE_*`)

### Comandos Comunes
- `npm run dev`: Iniciar servidor local.
- `npm run build`: Generar build de producción.
- `npx cap sync`: Sincronizar cambios web con el proyecto de Android.

## 📝 Notas de Implementación
- Se prefiere el uso de **Real-time listeners** (`onSnapshot`) para que los cambios se reflejen instantáneamente en todos los dispositivos sin recargar.
- El sistema está diseñado para ser **PWA** y compatible con dispositivos móviles a través de Capacitor.

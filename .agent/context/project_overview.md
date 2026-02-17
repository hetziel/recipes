# Contexto del Proyecto: Recipes App

Este documento resume el estado actual y los conocimientos clave del proyecto para mantener el contexto entre sesiones.

## Arquitectura Técnica

- **Frontend**: Vue.js 3 (Composition API) + Vite.
- **Backend**: Firebase (Firestore, Authentication, Hosting).
- **Estilos**: Vanilla CSS con variables CSS personalizadas.
- **Estado Global**: Composables (e.g., `useAuth.ts`) y Provide/Inject para datos compartidos como la tasa del dólar.

## Módulos Principales

### 1. Gestión de Productos

- Los productos se cargan desde Firestore (`productos`).
- Cada producto puede tener múltiples precios en diferentes establecimientos.
- Se calcula un precio promedio automáticamente.

### 2. Recetas con Escenarios

- Las recetas (`recipes`) contienen ingredientes asociados a productos.
- **Escenarios**: Las recetas se dividen en escenarios de venta (por peso o por unidad).
- Los costos se calculan dinámicamente basándose en la tasa del dólar (USD <-> Bs).

### 3. Receta como Producto (My Products)

- Una receta puede marcarse para guardarse como un producto en la colección `my_products`.
- Esto permite usar una receta (como una "masa base") como ingrediente de otra receta mas compleja.
- La sincronización es automática al guardar la receta.

### 4. Sistema de Autenticación y Roles

- **Roles**: `admin` y `user`.
- **Admin**: Acceso total a edición, costos, ventas y clientes.
- **User**: Solo acceso a la visualización de recetas. No ven costos ni utilidades.
- **Seguridad**: Implementada vía Router Guards en el frontend y Firestore Rules en el backend.

## Skills y Procedimientos Clave

- **Carga de Dólar**: Se obtiene vía API de BCV y se inyecta globalmente.
- **Cálculo de Inversión**: Se promedian los costos de ingredientes + utilerías asociadas al escenario.
- **Exportación de Facturas**: Uso de `html-to-image` para generar JPGs de las ventas.

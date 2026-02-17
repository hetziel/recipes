# Skills y Guía de Desarrollo

Este documento describe cómo realizar tareas comunes en este proyecto específico.

## 1. Crear un Nuevo Módulo

- Definir la interfaz en `src/types/`.
- Crear la vista en `src/views/`.
- Registrar la ruta en `src/router/index.ts`.
- Si requiere protección, añadir `meta: { requiresAdmin: true }`.

## 2. Trabajar con Precios y Monedas

- Siempre usar el dólar (USD) como moneda base internamente.
- Para mostrar en bolívares, inyectar `dolarBCV` y multiplicar: `valor * dolarBCV.value.promedio`.
- Usar el componente `price-display-cell` o patrones similares para consistencia visual.

## 3. Sincronizar Recetas como Productos

- Al modificar `RecipeForm.vue`, asegurar que la función `syncRecipeAsProduct()` se llame después de guardar.
- El `product_id` generado debe guardarse en el documento de la receta para permitir actualizaciones posteriores.

## 4. Gestión de Estilos

- Mantener los estilos en el bloque `<style scoped>` de cada componente.
- Usar variables globales definidas en `App.vue` si es necesario (colores principales).

## 5. Reglas de Negocio de Roles

- Antes de mostrar un botón de acción (Editar/Borrar), verificar: `v-if="userProfile?.role === 'admin'"`.
- No mostrar campos de ganancia o inversión a usuarios con rol `user`.

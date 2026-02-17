# Migración: Categoría Única → Múltiples Categorías

## 📋 Resumen

Esta migración permite que los productos tengan **múltiples categorías** en lugar de una sola. Los cambios incluyen:

- ✅ Actualización del tipo `Product` de `category_id: string` a `category_ids: string[]`
- ✅ Modificación de la UI para seleccionar y mostrar múltiples categorías
- ✅ Actualización de filtros y búsquedas
- ✅ Scripts de migración de datos en Firestore

## 🎯 Archivos Modificados

### Tipos y Composables

- `src/types/producto.ts` - Tipo Product actualizado
- `src/composables/useCategories.ts` - Sin cambios necesarios
- `src/composables/useBrands.ts` - Exporta isLoading y error

### Vistas

- `src/views/Products.vue` - **Cambios principales**

  - Selección de múltiples categorías con chips
  - Visualización de todas las categorías en tarjetas
  - Filtrado y búsqueda actualizados
  - Funciones CRUD actualizadas

- `src/views/CategoriesBrandsView.vue`

  - Función `isCategoryUsed` actualizada

- `src/views/ChickenForm.vue`

  - Filtro de categorías actualizado

- `src/views/RecipeForm.vue`

  - Producto de receta usa `category_ids: ['recipe_products']`

- `src/views/BuysView.vue`
  - Inicialización con array vacío

### Rutas y Navegación

- `src/router/index.ts` - Ruta para Config. Productos
- `src/App.vue` - Enlace en sidebar

## 🚀 Plan de Despliegue

### Fase 1: Preparación (ANTES del despliegue)

1. **Backup de Firestore**

   ```bash
   # Exporta tu base de datos desde Firebase Console
   # Firestore Database → Import/Export → Export
   ```

2. **Revisar cambios**
   - Verifica que todos los archivos estén actualizados
   - Ejecuta pruebas locales si las tienes

### Fase 2: Despliegue del Código

1. **Desplegar la aplicación**

   ```bash
   npm run build
   # Despliega a tu hosting (Firebase Hosting, Vercel, etc.)
   ```

2. **Verificar que la app carga** (aunque los productos no funcionen aún)

### Fase 3: Migración de Datos

1. **Configurar el script de migración**

   Edita `scripts/migrate-categories.js` y reemplaza la configuración de Firebase:

   ```javascript
   const firebaseConfig = {
     apiKey: 'TU_API_KEY',
     authDomain: 'TU_AUTH_DOMAIN',
     projectId: 'TU_PROJECT_ID',
     storageBucket: 'TU_STORAGE_BUCKET',
     messagingSenderId: 'TU_MESSAGING_SENDER_ID',
     appId: 'TU_APP_ID',
   }
   ```

2. **Instalar dependencias del script**

   ```bash
   cd scripts
   npm init -y
   npm install firebase
   ```

3. **Ejecutar la migración**

   ```bash
   node migrate-categories.js
   ```

4. **Verificar el resultado**
   - Revisa el resumen en la consola
   - Verifica algunos productos en Firebase Console
   - Comprueba que `category_ids` es un array

### Fase 4: Verificación

1. **Probar la aplicación**

   - ✅ Crear nuevo producto con múltiples categorías
   - ✅ Editar producto existente
   - ✅ Filtrar por categoría
   - ✅ Buscar productos
   - ✅ Ver productos en lista
   - ✅ Eliminar categorías no usadas

2. **Verificar vistas relacionadas**
   - ✅ ChickenForm - Filtro de productos por categoría
   - ✅ RecipeForm - Creación de producto de receta
   - ✅ BuysView - Creación de productos de compra

### Fase 5: Limpieza (OPCIONAL - después de 1-2 semanas)

Si todo funciona correctamente y no necesitas hacer rollback:

1. **Configurar script de limpieza**

   Edita `scripts/cleanup-old-category-field.js` con tu configuración de Firebase

2. **Ejecutar limpieza**

   ```bash
   node cleanup-old-category-field.js
   ```

   Esto eliminará el campo `category_id` de todos los productos.

## 🔄 Plan de Rollback

Si algo sale mal, puedes revertir:

### Opción A: Rollback de Código (Rápido)

1. Revertir el despliegue a la versión anterior
2. Los datos en Firestore tendrán `category_ids`, pero el código antiguo usará `category_id`
3. **Problema**: Los productos migrados no mostrarán categoría

### Opción B: Rollback Completo (Recomendado)

1. Restaurar backup de Firestore desde Firebase Console
2. Revertir el código a la versión anterior

## 📊 Estructura de Datos

### Antes

```json
{
  "id": "prod-123",
  "name": "Producto Ejemplo",
  "category_id": "cat-1",
  "price": 10.5
}
```

### Después de Migración

```json
{
  "id": "prod-123",
  "name": "Producto Ejemplo",
  "category_id": "cat-1", // Mantiene el antiguo (por seguridad)
  "category_ids": ["cat-1"], // Nuevo campo
  "price": 10.5
}
```

### Después de Limpieza

```json
{
  "id": "prod-123",
  "name": "Producto Ejemplo",
  "category_ids": ["cat-1"], // Solo el nuevo campo
  "price": 10.5
}
```

## 🐛 Solución de Problemas

### Problema: "category_ids is not iterable"

**Causa**: Producto sin migrar
**Solución**: Ejecuta el script de migración

### Problema: "Cannot read property 'includes' of undefined"

**Causa**: Producto con `category_ids: null` o `undefined`
**Solución**: El código maneja esto con `category_ids && category_ids.includes()`

### Problema: Productos sin categoría

**Causa**: Productos que nunca tuvieron `category_id`
**Solución**: El script los migra con `category_ids: []`

## 📝 Notas Importantes

1. **No ejecutes los scripts múltiples veces** - El script de migración detecta productos ya migrados
2. **Mantén el campo antiguo** hasta estar 100% seguro
3. **Haz backup** antes de la limpieza final
4. **Prueba en desarrollo** primero si es posible

## ✅ Checklist de Migración

- [ ] Backup de Firestore realizado
- [ ] Código desplegado y app carga
- [ ] Script de migración configurado
- [ ] Migración ejecutada exitosamente
- [ ] Productos verificados en Firebase Console
- [ ] Funcionalidades probadas:
  - [ ] Crear producto
  - [ ] Editar producto
  - [ ] Filtrar por categoría
  - [ ] Buscar productos
  - [ ] Eliminar categoría no usada
- [ ] App funcionando en producción por 1-2 semanas
- [ ] (Opcional) Limpieza de campo antiguo ejecutada

## 🎉 Resultado Final

Después de completar la migración, tendrás:

- ✨ Productos con múltiples categorías
- 🎨 UI moderna con chips de categorías
- 🔍 Búsqueda y filtrado mejorados
- 🛡️ Validación de eliminación de categorías
- 📊 Mejor organización de productos

---

**Fecha de creación**: 2026-02-17
**Versión**: 1.0.0

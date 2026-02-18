<!-- Copilot / AI agent instructions for the Boxy Recipes repo -->

# Instrucciones rápidas para agentes de código

**Resumen:** Proyecto Vue 3 + Vite (PWA) con integraciones a Firebase (Firestore + Auth + Analytics) y empaquetado con Capacitor Android. El código usa composables para estado/global logic y rutas con control de roles en `router`.

**Comandos de desarrollo:**

- **dev:** `npm run dev` — arranca Vite en modo HMR.
- **build (web):** `npm run build` — compila y ejecuta `vue-tsc` + `vite build`.
- **Android:** después de `npm run build` ejecutar `npx cap copy android` y `npx cap open android`.
- **type-check:** `npm run type-check` (usa `vue-tsc`).
- **lint/format:** `npm run lint` y `npm run format`.

**Arquitectura (big picture):**

- Frontend SPA en `src/` usando Vue 3 y `vue-router`. Entrypoint: `src/main.ts`.
- PWA configurada en `vite.config.ts` (plugin `VitePWA`).
- State / lógica compartida: `src/composables/*` — patrón de composables como servicios observables (ej. `useRecipes`, `useAuth`).
- Persistencia y realtime: Firestore con `onSnapshot` y persistencia local. Inicialización en `src/firebase.config.ts`.
- Rutas con políticas: `src/router/index.ts` usa `meta` en rutas (`public`, `requiresAdmin`) y `useAuth().untilReady()` para decisiones de navegación.
- Capacitor Android: carpeta `android/` contiene el proyecto nativo; build web → copy → open.

**Patrones y convenciones específicas del proyecto:**

- Exponer estado con `ref` y publicar sólo `readonly(...)` a los consumidores (ver `src/composables/useRecipes.ts`).
- Firestore: se usan suscripciones `onSnapshot` y funciones `unsubscribe*` para limpiar listeners; los composables auto-inician suscripciones la primera vez.
- Roles/ACL: validación en runtime dentro de `router.beforeEach` — rutas marcadas con `meta.requiresAdmin` redirigen si no eres admin.
- Variables de entorno: prefijo `VITE_` (ej. `VITE_FIREBASE_API_KEY`) y se accede vía `import.meta.env` (ver `src/firebase.config.ts` y `vite.config.ts`).
- Resolución de alias: `@` → `src`, `@js` → `src/assets/js` (ver `vite.config.ts`).

**Integraciones y límites a conocer:**

- Firebase SDK v9+ modular import usado; firestore inicializado con `persistentLocalCache` y `persistentMultipleTabManager()` (ver `src/firebase.config.ts`).
- Google Drive / APIs: hay dependencias a `@googleapis/drive` y `googleapis` en `package.json`.
- No hay tests automatizados en repo — evitar suposiciones sobre test runners.

**Archivos que ejemplifican los patrones (usar como referencia cuando se genere código):**

- `src/firebase.config.ts` — inicialización Firestore/Auth/Analytics.
- `src/router/index.ts` — guardas de rutas y políticas de acceso.
- `src/composables/useRecipes.ts` — ejemplo claro de suscripción Firestore + exposición readonly.
- `vite.config.ts` — alias, PWA y configuración `import.meta.env`.
- `package.json` — scripts y dependencias relevantes.

**Sugerencias prácticas para PRs/edits automáticos:**

- Mantener composables puros y devolver `readonly` para evitar mutaciones desde componentes.
- Cuando añadas listeners a Firestore, crea explícitamente la función de `unsubscribe` y llámala en `beforeUnmount` o cuando corresponda.
- Al tocar rutas, respeta `meta` y no romper `router.beforeEach` — sigue las redirecciones actuales (login → role-based home).

Si algo no está claro o quieres que ajuste el estilo/alcance, dime qué sección afinar y la actualizo.

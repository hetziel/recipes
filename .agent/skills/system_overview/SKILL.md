---
name: system_overview
description: Información detallada sobre el funcionamiento total del sistema MyShops
---

# Sistema MyShops - Overview

Este documento centraliza el conocimiento sobre la arquitectura, el flujo de autenticación y las reglas de negocio del sistema MyShops.

## Arquitectura del Proyecto

El sistema está construido con **Vue 3 (Vite)** y **Firebase**. Se divide en tres áreas principales de acceso:

1.  **Tienda Pública (/)**: Catálogo accesible para cualquier visitante.
2.  **Portal de Clientes (/mis-compras)**: Espacio para que los compradores vean su historial.
3.  **Módulo de Producción/Admin (/production, /sales, etc.)**: Herramientas internas para gestión de inventario, recetas y ventas.

## Flujo de Autenticación (SMS Auth)

El sistema utiliza **Firebase Phone Authentication** para los clientes.

-   **Compra sin Login**: Un usuario puede llenar el carrito como invitado. Al comprar, el `StorePurchaseWizard` dispara un flujo de SMS.
-   **Registro Automático**: Si el número no existe, se crea un perfil con el rol `client`.
-   **Roles**:
    -   `admin`: Acceso total (Ventas, Clientes, Configuración).
    -   `user` (Staff): Acceso a Producción e Inventario.
    -   `client`: Acceso a Tienda y historial de compras.

## Estructura de Rutas Clave

-   `/`: Tienda pública (`StoreView.vue`).
-   `/login`: Acceso para el personal del equipo.
-   `/client-login`: Acceso rápido para clientes vía SMS.
-   `/products`: Gestión de inventario (Stock, Costos).
-   `/production`: Gestión de recetas y producción de lotes.

## Seguridad (Firestore Rules)

El archivo `firestore.rules` protege la integridad de los datos:

-   **Lectura Pública**: `productos`, `my_products`, `recipes` y `scenarios` (si están publicados) son legibles por todos para permitir el cálculo de precios en la tienda.
-   **Escritura Restringida**: Solo usuarios con rol `admin` pueden modificar el catálogo.
-   **Órdenes**: Los clientes pueden crear órdenes solo si están autenticados. Solo pueden leer las órdenes asociadas a su `customer_id`.

## Integraciones Externas

-   **Google Drive**: Se utiliza un Google Apps Script como puente para subir comprobantes de pago de forma anónima desde el Wizard de compra.
-   **Tasa BCV**: El sistema consume una tasa de cambio (USD/Bs) inyectada globalmente para mostrar precios multimoneda.

## Comandos Útiles

-   `npm run dev`: Inicia el servidor de desarrollo.
-   `firebase deploy --only firestore:rules`: Despliega cambios en las reglas de seguridad.

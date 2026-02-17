# Guía de Contexto del Proyecto

Este proyecto cuenta con una documentación detallada para mantener la continuidad en el desarrollo asistido por IA.

## Documentación Principal

- [Resumen del Proyecto](.agent/context/project_overview.md): Arquitectura, módulos y estado actual.
- [Guía de Skills](.agent/context/skills.md): Procedimientos técnicos comunes y reglas de negocio.

## Última Actualización Importante

Se ha implementado el **Sistema de Autenticación y Roles**:

- Colección `users` creada en Firestore.
- Reglas de seguridad (`firestore.rules`) actualizadas para restringir acceso según rol (`admin` vs `user`).
- El rol por defecto para nuevos usuarios es `user`.

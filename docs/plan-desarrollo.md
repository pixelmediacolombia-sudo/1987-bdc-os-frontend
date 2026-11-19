# Plan inicial de desarrollo de BDC OS CRM

El frontend se implementa contra el backend propio y se prueba en la red Docker local. Se decide el orden según los requerimientos de producto y se conserva en producción cada integración GHL hasta que la funcionalidad equivalente esté desarrollada y validada.

| Etapa | Alcance | Criterio de salida |
| --- | --- | --- |
| FE-00 · Entorno local e identidad | Compose aislado; PostgreSQL y Redis; cuentas `admin`/`user`; un admin global; usuarios vinculados a dealers (`tenants`); hash de contraseña de prueba en `.env` local | Servicios saludables; el admin se crea una vez desde `.env`; secretos fuera de Git |
| FE-01 · Shell CRM | Navegación, espacio de trabajo, búsqueda, dashboard, cola de atención y estados de demostración | Responsive; acciones demo funcionan; datos ficticios claramente identificados |
| FE-02 · Acceso y empresas | Inicio de sesión, sesiones seguras, invitación/creación de usuarios y asignación a dealer; permisos del admin global y separación por tenant | Pruebas de autorización y aislamiento entre dos tenants |
| FE-03 · Contactos y bandeja | Contratos backend para contactos, conversaciones y mensajes; lectura primero, escritura luego | Contratos tenant-scoped y pruebas API/UI con fixtures locales |
| FE-04 · Pipeline | Tableros por etapas, oportunidades, asignación, historial y búsqueda | Crear/mover/actualizar oportunidades con auditoría y pruebas e2e |
| FE-05 · Automatizaciones | Editor de flujos, disparadores, condiciones, acciones, ejecución y logs | Simulación local; idempotencia; fallas y reintentos cubiertos |
| FE-06 · Calendario, reportes y administración | Citas, tareas, métricas, equipos, permisos y configuración por empresa | Permisos verificados y datos conectados a APIs propias |
| FE-07 · Migración GHL por requerimiento | Inventariar un flujo, implementar equivalente en BDC OS, migrar uno por vez y comparar comportamiento por dealer | Paridad funcional y operativa demostrada antes de retirar variables/configuración GHL de ese flujo |

## Alcance de identidad

- Un único usuario `admin` administra la plataforma completa. La base impide una segunda cuenta con ese tipo.
- `user` es una cuenta humana normal. La empresa/dealer no es una cuenta de login: es un tenant, y su relación con usuarios queda en `user_tenant_memberships`.
- En local, `npm run bootstrap:admin` genera una contraseña aleatoria y guarda solo su hash scrypt en `.env`. El servicio de login todavía es una etapa posterior; no se exponen APIs de identidad sin autenticación y autorización.
- Ningún usuario de prueba, correo o contraseña se crea en producción mediante este bootstrap.

## GHL y Meta

La transición depende de los requerimientos que se prioricen. No se retiran todas las variables GHL de golpe: el backend actual aún inicia OAuth, consume webhooks y puede usar GHL para operaciones. Cada flujo se sustituye y valida antes de retirar su configuración de producción. Meta CAPI es una conexión directa del backend con su propio API y mantiene sus variables/datos de configuración, sin depender de la interfaz CRM.

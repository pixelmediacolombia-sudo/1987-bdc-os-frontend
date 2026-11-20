# Plan inicial de desarrollo de BDC OS CRM

El frontend se implementa contra el backend propio y se prueba en la red Docker local. BDC OS administra dealers, usuarios, contactos, conversaciones, mensajes, tareas internas, oportunidades y calificación de leads.

| Etapa | Alcance | Criterio de salida |
| --- | --- | --- |
| FE-00 · Entorno local e identidad | Compose aislado; PostgreSQL y Redis; cuentas `admin`/`user`; un admin global; usuarios vinculados a dealers (`tenants`); hash de contraseña de prueba en `.env` local | Servicios saludables; el admin se crea una vez desde `.env`; secretos fuera de Git |
| FE-01 · Shell CRM | Navegación, espacio de trabajo, búsqueda, dashboard, cola de atención y estados de demostración | Responsive; acciones demo funcionan; datos ficticios claramente identificados |
| FE-02 · Acceso y empresas | Inicio de sesión, sesiones seguras, invitación/creación de usuarios y asignación a dealer; permisos del admin global y separación por tenant | Pruebas de autorización y aislamiento entre dos tenants |
| FE-03 · Contactos y bandeja | Contratos backend para contactos, conversaciones y mensajes; lectura primero, escritura luego | Contratos tenant-scoped y pruebas API/UI con fixtures locales |
| FE-04 · Pipeline | Tableros por etapas, oportunidades, asignación, historial y búsqueda | Crear/mover/actualizar oportunidades con auditoría y pruebas e2e |
| FE-05 · Automatizaciones | Editor de flujos, disparadores, condiciones, acciones, ejecución y logs | Simulación local; idempotencia; fallas y reintentos cubiertos |
| FE-06 · Calendario, reportes y administración | Citas, tareas, métricas, equipos, permisos y configuración por empresa | Permisos verificados y datos conectados a APIs propias |
| FE-07 · Canales Meta | Conectar Messenger, Instagram y WhatsApp por dealer; manejar permisos, mensajes, adjuntos y reintentos | Simuladores locales y pruebas de integración cubren inbound, outbound, persistencia y colas |

## Alcance de identidad

- Un único usuario `admin` administra la plataforma completa. La base impide una segunda cuenta con ese tipo.
- `user` es una cuenta humana normal. La empresa/dealer no es una cuenta de login: es un tenant, y su relación con usuarios queda en `user_tenant_memberships`.
- En local, `npm run bootstrap:admin` genera una contraseña aleatoria y guarda solo su hash scrypt en `.env`. Las APIs de identidad exigen autenticación y autorización.
- Ningún usuario de prueba, correo o contraseña se crea en producción mediante este bootstrap.

## Integraciones de mensajería

Facebook Messenger, Instagram y WhatsApp se conectan directamente mediante Meta Graph API. Cada dealer mantiene sus propias credenciales y configuración CAPI. Los procesos internos de evaluación de leads y la integración OpenAI permanecen dentro del backend de BDC OS.

## Configuración de políticas por dealer

La política de calificación común funciona como configuración inicial para todos los dealers. En una etapa posterior, cada dealer podrá ajustar desde BDC OS las opciones básicas que se definan como configurables. La lógica compartida de evaluación seguirá aplicando validaciones de seguridad y cumplimiento. El diseño previsto usa un esquema versionado, valores propios por tenant, vista previa, auditoría de cambios y reversión; hasta que se implemente ese editor, los cambios afectan a la política común.

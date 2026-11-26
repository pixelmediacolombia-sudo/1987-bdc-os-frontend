# Plan inicial de desarrollo de BDC OS CRM

El frontend se implementa contra el backend propio y se prueba en la red Docker local. BDC OS administra dealers, usuarios, contactos, conversaciones, mensajes, tareas internas, oportunidades y calificación de leads.

| Etapa | Alcance | Criterio de salida |
| --- | --- | --- |
| FE-00 · Entorno local e identidad | Compose aislado; PostgreSQL y Redis; cuentas `admin`/`user`; un admin global; usuarios vinculados a dealers (`tenants`); hash de contraseña de prueba en `.env` local | Servicios saludables; el admin se crea una vez desde `.env`; secretos fuera de Git |
| FE-01 · Shell CRM | Navegación, espacio de trabajo, búsqueda, dashboard, cola de atención y estados de demostración | Responsive; acciones demo funcionan; datos ficticios claramente identificados |
| FE-02 · Acceso y empresas | Inicio de sesión, sesiones seguras, invitación/creación de usuarios y asignación a dealer; permisos del admin global y separación por tenant | Pruebas de autorización y aislamiento entre dos tenants |
| FE-03 · Contactos y bandeja | Contactos CRM-01: directorio tenant-scoped, creación/edición, timeline persistido y oportunidades vinculadas; Bandeja CRM-02: listado, lectura, asignación, estado leído/no leído, respuesta persistida y estados de entrega | CRM-01 y CRM-02 cerrados localmente con E2E UI/API de dos dealers. El backend de conversaciones quedó segmentado por listado, flujo y mensajes; su E2E de respuestas volvió a pasar tras la separación. No se enviaron mensajes reales durante las pruebas; falta validación de producción |
| FE-04 · Pipeline | Tableros por etapas, oportunidades, asignación, historial, búsqueda, próxima acción y archivo | CRM-03 cerrado localmente: alta, cambios auditados, etiquetas/orden configurables por dealer, próxima acción persistida, archivado/restauración y aislamiento de dos dealers; falta validación de producción |
| FE-05 · Automatizaciones | Editor de flujos, disparadores, condiciones, acciones, ejecución y logs | Simulación local; idempotencia; fallas y reintentos cubiertos |
| FE-06 · Calendario, reportes y administración | Citas, tareas, métricas, equipos, permisos y configuración por empresa | CRM-04 calendario y citas cerrado localmente con API propia, zona `America/New_York`, validación de horarios, conflictos e aislamiento; reportes y otras áreas siguen pendientes |
| FE-07 · Canales Meta | Conectar Messenger, Instagram y WhatsApp por dealer; manejar permisos, mensajes, adjuntos y reintentos | Simuladores locales y pruebas de integración cubren inbound, outbound, persistencia y colas |

## Evolución progresiva del inicio

Inicio consume progresivamente el backend local del dealer autenticado. Los conteos, cola de conversaciones, valor del pipeline y actividad deben venir de registros persistidos; no se deben incluir cifras o contactos ficticios escritos en el frontend. Las fuentes que todavía no existan se muestran vacías o se retiran hasta conectarlas.

- Bandeja debe aportar conversaciones pendientes y su estado de lectura.
- Contactos debe aportar los contactos recientes y su actividad real.
- Oportunidades debe aportar etapas y valor del pipeline.
- Calendario y tareas deben aportar pendientes y citas cuando sus APIs estén disponibles.
- La actividad reciente y las sugerencias deben derivarse de eventos y estados persistidos, no de ejemplos estáticos.
- Mientras una fuente todavía no exista, la tarjeta debe identificarse claramente como demostración o mostrar un estado vacío; no debe presentar cifras ficticias como datos reales.

Criterios de aceptación para completar esta evolución:

1. Cada indicador y lista tiene una fuente propia identificada y usa el alcance del dealer de la sesión; la autorización se valida en backend.
2. Altas, cambios y nuevos mensajes de los módulos conectados se reflejan en el inicio al actualizar los datos.
3. Hay estados de carga, vacío y error para cada sección alimentada por API.
4. Pruebas locales con dos dealers confirman que los valores y contactos no se mezclan entre cuentas.
5. La conexión se incorpora módulo por módulo y se valida en Docker local; la validación de producción queda para la etapa final definida por el usuario.

## Datos de demostración persistentes

- Las demostraciones locales agregan registros sintéticos a PostgreSQL del dealer de prueba para recorrer el flujo completo y recargar la página sin perderlos.
- No borrar automáticamente esos registros al terminar una prueba o demostración. Se conservan hasta que el usuario solicite expresamente limpiarlos.
- Identificar los registros demo con nombres, teléfonos y notas ficticios; no reutilizar datos personales reales.
- El seed debe ser idempotente y limitar cada inserción al tenant local de prueba. No se ejecuta en producción.
- Cada escritura en frontend debe ir seguida de la reconstrucción y recreación del contenedor frontend local. Cada escritura en backend debe reconstruir y recrear el contenedor backend local para que el runtime coincida con el código.
- Recordatorio: reconstruir y recrear el contenedor afectado después de cada cambio, antes de validar o continuar.

## Cierre local de FE-04 · Oportunidades

- El E2E backend `npm run test:local:opportunities` levanta dos sesiones sintéticas y verifica creación, cambio de etapa, asignación, auditoría, historial y actualización de Inicio. Este script no está declarado en el `package.json` del frontend; ejecútalo desde el repositorio donde está definido.
- El alcance por dealer se comprueba al listar oportunidades e Inicio, intentar acceso cruzado y consultar el historial de una oportunidad del otro dealer. La reasignación hacia un usuario ajeno se rechaza con HTTP 400; los listados e Inicio ajenos con HTTP 403; el historial de una oportunidad no visible con HTTP 404.
- La prueba es solo local y limpia sus usuarios, sesiones, eventos y oportunidades de fixture al terminar. No elimina los registros sintéticos persistentes que se usan para las demostraciones.
- La vista frontend tiene cobertura de interacción y recarga con `npx vitest run src/presentation/features/opportunities/OpportunitiesView.test.tsx`.

## Cierre local de CRM-04 · Calendario y citas

- Calendario semanal conectado a la API local, con agenda diaria, indicador de hora actual, creación de citas vinculadas a contactos u oportunidades, responsable, ubicación, notas, recordatorio configurable y estados de atención. La disponibilidad semanal del dealer se puede consultar y guardar.
- La aplicación opera con la zona horaria `America/New_York`, según la instrucción para el mercado del este de Estados Unidos. El backend valida horas laborables y fechas locales, rechaza horas ambiguas o inexistentes por cambio de horario (DST) y evita citas solapadas por dealer/responsable. Los nuevos dealers usan esa zona por defecto; no se hizo una migración masiva de zonas ya guardadas.
- La API aplica alcance por dealer, valida vínculos de contacto/oportunidad y registra auditoría. Los recordatorios y su hora quedan persistidos; el despacho externo de notificaciones todavía no está conectado.
- `APPOINTMENTS_E2E=1 npm run test:local:appointments` pasó 1/1 y cubre disponibilidad, conversión de horario de Nueva York a UTC, recordatorios, solapamiento, horario fuera de jornada, DST, cancelación y aislamiento de dos dealers. `CRM_REPLIES_E2E=1 npm run test:local:crm-replies` pasó 1/1 como regresión de CRM-02. La UI del calendario pasó 2/2 y `npm run build` terminó correctamente.
- El contenedor frontend local se reconstruyó y recreó después de los cambios de código; backend y PostgreSQL locales permanecen fuera de producción. No se enviaron mensajes ni se desplegó a producción.

## Cierre local de CRM-03 · Pipeline

- Las cinco etapas iniciales se mantienen como claves estables, y cada dealer puede personalizar sus etiquetas y orden sin afectar a otros. La API limita la configuración al dealer autenticado y registra los cambios en auditoría.
- Oportunidades persistidas admiten próxima acción, fecha de seguimiento y archivado lógico/restauración. Las listas y los agregados del Inicio omiten archivadas por defecto; la vista permite incluirlas y restaurarlas.
- `npm run test:local:opportunities` pasó 1/1 en Docker local con sesiones de dos dealers y comprobó configuración de etapas aislada, próxima acción, archivado/restauración y actividad auditada. La prueba de UI pasó 3/3 y cubre creación, responsable/etapa, próxima acción y archivo.
- `npm run test:local:crm-replies` pasó 1/1 tras separar `conversation.routes.ts` en listado, flujo de conversación y envío de mensajes, preservando persistencia, identidad de remitente, idempotencia y aislamiento.
- La segmentación de etapas permite renombrar/reordenar las cinco claves actuales; agregar o eliminar etapas queda como evolución posterior. No hubo envíos reales de Meta ni validación productiva.

## Alcance de identidad

- Un único usuario `admin` administra la plataforma completa. La base impide una segunda cuenta con ese tipo.
- `user` es una cuenta humana normal. La empresa/dealer no es una cuenta de login: es un tenant, y su relación con usuarios queda en `user_tenant_memberships`.
- En local, `npm run bootstrap:admin` genera una contraseña aleatoria y guarda solo su hash scrypt en `.env`. Las APIs de identidad exigen autenticación y autorización.
- Ningún usuario de prueba, correo o contraseña se crea en producción mediante este bootstrap.

## Integraciones de mensajería

Facebook Messenger, Instagram y WhatsApp se conectan directamente mediante Meta Graph API. Cada dealer mantiene sus propias credenciales y configuración CAPI. Los procesos internos de evaluación de leads y la integración OpenAI permanecen dentro del backend de BDC OS.

## Configuración de políticas por dealer

La política de calificación común funciona como configuración inicial para todos los dealers. En una etapa posterior, cada dealer podrá ajustar desde BDC OS las opciones básicas que se definan como configurables. La lógica compartida de evaluación seguirá aplicando validaciones de seguridad y cumplimiento. El diseño previsto usa un esquema versionado, valores propios por tenant, vista previa, auditoría de cambios y reversión; hasta que se implemente ese editor, los cambios afectan a la política común.

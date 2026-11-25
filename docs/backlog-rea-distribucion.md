# Backlog derivado de REA para distribuir

**Corte:** 21 de noviembre de 2026 (America/Bogota)
**Propósito:** convertir la revisión de REA, el estado del repositorio y los pendientes Admin/CAPI en paquetes de trabajo asignables.
**Repos:** frontend `main`; backend `master`.

## Cómo leer este backlog

- **Verificado en código:** el comportamiento o endpoint aparece en el código fuente actual.
- **Hallazgo estático REA:** candidato recuperado del artefacto compilado. No confirma ejecución, permisos ni disponibilidad productiva.
- **Tarea propuesta:** trabajo pendiente derivado del objetivo CRM parecido a GHL; no significa que REA haya comprobado que GHL lo implemente de esa misma forma.

REA no copió código. El artefacto frontend analizado fue `dist` (SHA-256 `718e66c5…5027380`): la extracción de rutas no encontró rutas candidatas y dejó el grafo parcial/desconocido por un límite de análisis del bundle. El artefacto backend fue solamente `dist/features/identity` (SHA-256 `253ab25a…e3a972`), no todo el backend; produjo candidatos estáticos para rutas Admin que se contrastaron con `identity.routes.ts`. La captura de navegador fue una sola navegación a una página de ayuda de GHL, sin DOM, pantalla, accesibilidad ni tráfico de la app. Por eso, los paquetes CRM de abajo son un plan basado en las secciones que ya muestra BDC OS y en el objetivo acordado; falta una comparación observacional real de GHL.

Los candidatos Admin recuperados por REA y contrastados en el router fuente incluyen `/admin/dealers` (GET/POST), `/admin/dealers/:dealerId/configuration` (GET), `/admin/dealers/:dealerId/invitations` (POST), `/admin/dealers/:dealerId/meta/connect` (GET), `/admin/users` (GET), `/admin/audit` (GET), `/admin/system/health` (GET), y los flujos `/login`, `/logout`, `/session` e `/invitations/accept`. El router se monta bajo `/auth`. Esta lista documenta superficie ya presente; no es un backlog de endpoints nuevos.

## Índice para asignación

| ID | Prioridad | Equipo sugerido | Paquete | Estado/dependencia |
|---|---|---|---|---|
| CAPI-01 | P0 | Backend + Plataforma + QA | Conciliar tokens antiguos Render por tenant y fuente segura de credenciales | Pendiente; worker de producción permanece apagado |
| ADM-07 | P0 | Plataforma + Frontend + QA | Publicar frontend y validar el panel Admin contra el backend productivo | Pendiente; backend ya está en producción |
| REA-01 | P0 | REA + QA | Capturar BDC OS local por roles Admin/dealer, estados y llamadas de red | Pendiente; usar versión y sesión autorizadas |
| ADM-08 | P1 | Backend + Plataforma + QA | Completar y verificar invitaciones con SMTP/`BDC_APP_URL` de producción | Pendiente de variables y prueba autorizada |
| ADM-09 | P1 | Frontend + Backend + Producto | Separar Salud del sistema de Configuración global y definir su alcance | Pendiente de decisión funcional |
| ADM-10 | P1 | Backend + Frontend + QA | Diseñar controles, alertas y límites de plataforma con auditoría | Pendiente de reglas y responsables |
| ADM-11 | P1 | Backend + Frontend + QA | Políticas versionadas y overrides aislados por dealer | Pendiente; extensión del plan ADM-05 |
| ADM-12 | P1 | Producto + Seguridad + Backend | Decidir cuentas de soporte, roles y permisos | Pendiente de decisión de negocio |
| REA-02 | P1 | REA + Backend + QA | Ampliar el mapa de backend más allá de `identity` | En curso local; mapa estático parcial y artefacto `dist` no conciliado con `master`; ver `docs/rea-02-backend-local-2026-11-25.md` |
| REA-03 | P1 | REA + Producto | Comparar configuración real de GHL con BDC OS | Pendiente de acceso observacional autorizado a GHL |
| CRM-01 | P2 | Frontend + Backend | Contactos y ficha 360 con historial persistido por tenant | Placeholder frontend; requiere contrato y API |
| CRM-02 | P2 | Frontend + Backend + Integraciones | Bandeja omnicanal de conversaciones y asignación | Placeholder frontend; definir eventos y operación |
| CRM-03 | P2 | Frontend + Backend | Pipeline/Oportunidades persistidas y cambios auditables | Alta de oportunidad actual es demo en memoria |
| CRM-04 | P2 | Frontend + Backend | Calendario, disponibilidad, citas y zona horaria | Placeholder frontend; requiere reglas de dealer |
| CRM-05 | P3 | Backend + Frontend + QA | Automatizaciones con disparadores, acciones, logs y reintentos | Placeholder frontend; depende de dominio/eventos |
| CRM-06 | P3 | Backend + Frontend + Datos | Reportes de operación con métricas trazables | Placeholder frontend; depende de datos reales |

P0/P1 son tareas de continuidad de Admin, seguridad y obtención de evidencia. P2/P3 expanden el CRM; pueden dividirse en historias de diseño, API, UI y validación por cada equipo.

## Fichas de trabajo: Admin, CAPI y REA

### CAPI-01 — Reconciliación segura por tenant (P0)

**Hallazgo:** los siete tokens de Render respondieron `is_valid=true`, pero el backend no consume esos nombres de variables. `META_CAPI_DEALERS_JSON` no está configurado, el worker está desactivado y la función de dealers devolvió cero. La lectura de metadatos del dataset falló con `Missing Permission`; no se probó escritura CAPI.

**Entrega y aceptación:**

1. Matriz de dealer, UUID, dataset presente, credencial cifrada presente y banderas; jamás guardar valores de tokens.
2. Reconciliar cada variable legacy con el tenant correcto y detectar pares ambiguos/compartidos.
3. Identificar por qué `list_qualification_signal_dealers()` retorna cero, respetando RLS.
4. Si se migra una credencial, usar el mecanismo cifrado por tenant y lectura posterior solo por booleano de presencia.
5. Probar un dealer únicamente en staging con datos sintéticos. Mantener producción apagada hasta aprobación explícita y evidencia de permisos.

### ADM-07 — Publicación y smoke test Admin (P0)

**Hallazgo:** salud global (`f7583e3` frontend, `23368ed` backend), directorio de usuarios (`2057a5a`, `be094e0`) y actividad Admin ya existen en el código. El backend está publicado; el frontend todavía no.

**Entrega y aceptación:** publicar por el flujo acordado; probar login Admin, directorio de dealers/usuarios, auditoría, salud API/PostgreSQL/Redis, logout y acceso prohibido para rol dealer. Capturar errores y SHA desplegado. No activar cambios CAPI como parte del despliegue.

### ADM-08 — Invitaciones de dealer en producción (P1)

**Hallazgo:** hay flujo y endpoints de invitación; el plan anterior deja SMTP real y `BDC_APP_URL` como prerrequisitos productivos.

**Entrega y aceptación:** configurar/verificar variables en el servicio correcto; prueba controlada a destinatario autorizado; aceptar enlace de un solo uso y vencimiento esperado; comprobar que el usuario queda asociado al dealer previsto. No guardar tokens de invitación en logs o capturas.

### ADM-09 — Salud y configuración global (P1)

**Hallazgo:** la sección Admin `Configuración` actualmente renderiza `AdminSystemHealth`, aunque Salud es una consulta de solo lectura. El panel de dealer muestra banderas y presencia de integraciones sin revelar secretos.

**Entrega y aceptación:** definir qué ajustes son realmente globales, quién puede cambiarlos y cómo se auditan; dar a Salud una ruta/etiqueta inequívoca; mantener configuración de dealer separada de la global; no crear controles escribibles hasta tener validación, autorización y rollback.

### ADM-10 — Controles, alertas y límites (P1)

Definir primero cada métrica/umbral, dueño, severidad, canal de alerta y política de escalamiento. Después implementar lectura y configuración auditada con validación de límites, permisos Admin, vista previa y reversión. No reutilizar el endpoint de salud como editor.

### ADM-11 — Overrides de políticas por dealer (P1)

Implementar esquema versionado, defaults compartidos, overrides separados bajo RLS, comparación/preview antes de guardar, audit log, validación de reglas y rollback a `shared_dealer_v1`. Acordar con Producto el conjunto de campos antes de migrar datos.

### ADM-12 — Cuentas de soporte y permisos (P1)

Producto/Seguridad decide si el admin global único es suficiente. Si se requieren soporte u operadores, definir roles, alcance por dealer, acciones permitidas, protección de datos, sesiones y trazabilidad antes de tocar el modelo de autorización.

### REA-01/02/03 — Cerrar las brechas de evidencia (P0/P1)

- **REA-01:** en BDC OS local, capturar Admin y dealer con estados autenticado/no autenticado, navegación, errores, llamadas a APIs permitidas y límites de acceso. Relacionar cada observación con código y endpoint.
- **REA-02:** revisar backend completo y sus módulos webhooks/control/memory/Meta, inventariar rutas, workers y persistencia; contrastar artefacto desplegado/SHA con `master`. No inferir ausencia desde el subárbol `identity`.
- **REA-03:** con una sesión GHL disponible, observar directamente Configuración y flujos relevantes para dealers. Registrar solo comportamiento y conceptos útiles para BDC OS, sin copiar código/datos. La página de ayuda ya abierta no sustituye esta captura.

**Formato de evidencia por historia REA:** ID, versión/SHA revisado, escenario, observación directa o estática, limitaciones, endpoint/archivo contrastado y captura sanitizada cuando aporte valor.

## Fichas de trabajo: CRM

En el frontend, Inicio muestra datos ficticios y no consulta el backend; crear una oportunidad solo cambia memoria de sesión. Contactos cuenta ahora con una primera implementación local de CRM-01 y su API tenant-scoped; falta completar la ficha de actividad/oportunidades y la prueba E2E persistida. Bandeja, Oportunidades, Automatizaciones, Calendario y Reportes siguen como vistas por construir. Las historias CRM no deben considerarse implementadas porque aparezcan en el menú.

### CRM-01 — Contactos y ficha 360 (P2)

Estado 2026-11-24: primera entrega local. El directorio busca, filtra por canal/consentimiento, ordena y pagina; la ficha muestra datos editables, origen, consentimiento de solo lectura e historial de conversaciones. La API permite crear registros manuales y editar datos de contacto dentro del tenant, audita cambios y rechaza duplicados manuales por teléfono/correo sin fusionar identidades. Pendiente: timeline de actividad/oportunidades, prueba E2E con persistencia y verificación en un entorno desplegado. No se usaron contactos reales ni Meta.

### CRM-02 — Bandeja omnicanal (P2)

Modelo de conversación/mensaje, integración de canales ya soportados, estado leído/no leído, asignación, equipo/cola, búsqueda, respuesta con identidad correcta y fallos/reintentos visibles. Aceptación: Messenger/Instagram/WhatsApp conservan canal y dealer, webhooks idempotentes, permisos por tenant y lectura/escritura demostrada en entorno de prueba.

### CRM-03 — Pipeline y oportunidades (P2)

Etapas configurables con historial de transición, responsable, valor, próxima acción y vínculo con contacto/conversación; acciones de mover/crear/archivar con permisos. Aceptación: persistencia backend, aislamiento tenant, auditoría y regresión del flujo de calificación existente.

### CRM-04 — Calendario y citas (P2)

Citas ligadas a contacto/oportunidad, disponibilidad, zona horaria del dealer, confirmación/cancelación, recordatorios y estado de atención. Aceptación: reglas de horario explícitas, evitar doble reserva y validar desplazamientos de zona horaria; proveedor externo solo si se define.

### CRM-05 — Automatizaciones (P3)

Diseñar primero catálogo de disparadores/condiciones/acciones; editor con activación/versionado, ejecución idempotente, scheduler/reintentos, logs y pausa/rollback. Reglas de consentimiento, límites de envío y aislamiento por dealer son requisitos iniciales, no remiendos posteriores.

### CRM-06 — Reportes (P3)

Definir métricas con fuentes de verdad, ventana temporal y zona horaria; entregar filtros por dealer, canal y responsable; reconciliar cada indicador con registros base. Aceptación: sin valores demo en reportes de producción, permisos tenant y exactitud cubierta por fixtures/E2E.

## Orden sugerido y criterios de cierre

1. CAPI-01 y REA-01 pueden arrancar en paralelo; no habilitar envíos productivos durante el levantamiento.
2. ADM-07 y ADM-08 llevan el panel actual a un flujo productivo verificable.
3. ADM-09 a ADM-12 cierran decisiones de plataforma/configuración antes de abrir controles sensibles.
4. Antes de CRM, completar REA-02 para confirmar qué APIs de dominio ya existen; iniciar CRM-01 y CRM-02 como bases, luego CRM-03/04 y finalmente CRM-05/06 según dependencias.
5. Cada paquete se cierra con PR/commit sobre las ramas de trabajo existentes, checks acordados, evidencia de aislamiento por dealer y nota de despliegue cuando aplique. No se ha iniciado ninguno de estos paquetes en esta actualización documental.

## Referencias retenidas

- REA frontend: `ev_d05cf67a714f8bb694e63b8ae6c62f7af0cdd174e8f79d6ea60ef423ab53bb9f`.
- REA backend `identity`: `ev_7860ac46de26a0756da934ef7cf07e56f96dd93b54b4c29ab410b591a2dd922`.
- REA navegación a ayuda GHL sin inspección de app: `ev_a94501f06763e945d2abaa7057f994fff3429976f8f263287db3352f0ffe29bc`.
- Fuentes confirmadas en repo: frontend `src/presentation/app/App.tsx`, `src/presentation/app/navigation.ts`, `src/presentation/features/admin/`; backend `src/features/identity/presentation/http/identity.routes.ts` y módulos relacionados.

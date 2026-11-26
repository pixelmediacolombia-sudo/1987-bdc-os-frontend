# CRM-05 · Inventario de automatizaciones, nodos y subtareas

**Corte:** 26 de noviembre de 2026
**Objetivo:** investigar GHL y n8n, inventariar lo que BDC OS puede automatizar con el código actual, definir el canvas visual requerido y dividir el trabajo antes de implementar CRM-05.
**Estado:** investigación y diseño preliminar; no se ha comenzado el motor ni el editor.

## Resumen ejecutivo

BDC OS ya tiene datos útiles para automatizaciones que GHL normalmente trata como campos CRM: mensajes y conversaciones persistidos, contenido del mensaje accesible por dealer, historial, estados, responsables, contactos, oportunidades y citas. Eso permite diseñar disparadores y condiciones sobre el contenido real de la conversación, incluida la última respuesta y un contexto de mensajes limitado por dealer.

La interfaz debe ser un **canvas visual de nodos**, con arrastre, zoom, conexiones y ramas visibles, inspirado en el patrón de n8n/GHL. El workflow se guarda como un grafo versionado (nodos y aristas), se puede validar y simular en borrador y solo ejecuta efectos reales al publicarse. No se debe presentar como un canvas si solo es un formulario lineal de pasos.

La base técnica actual todavía no incluye workflows, ejecución durable, scheduler de automatizaciones, catálogo de nodos ni tareas internas del CRM. Sí aporta APIs y persistencia de contactos, conversaciones, mensajes, oportunidades y citas, autorización por dealer, auditoría, idempotencia de mensajes y colas Redis para otros procesos. Por eso el inventario marca por separado “reutilizable hoy” y “requiere construcción”.

## Alcance y evidencia

### Método y límites REA

- **n8n:** REA abrió en Chromium temporal la documentación oficial del nodo HighLevel y capturó su árbol de accesibilidad. Evidencia de la captura: `ev_a24f0fab23b6da9bc0cff6247ecb5aedc0d0a5c05ccec77613e4c34c19d372ff`; padre completo: `ev_65d67ff3b9d0f6f8a69144cacc5aae5e82c43c31e51745b2e36a6733c10cf4f5`. La captura fue lectura de documentación pública, no ejecución de un workflow n8n.
- **GHL:** se intentó captura REA en Chromium temporal sobre el walkthrough oficial. La página comenzó a cargar, pero la operación finalizó con `cleanup_incomplete` y REA no confirmó que liberara `browser_transport` y `browser_profile`. Por eso no se inicia otra captura REA que dependa de esos recursos hasta resolver su limpieza.
- El Chrome de usuario no expone un endpoint CDP accesible para REA (`http://127.0.0.1:9222` no respondió). Por tanto **no se observó dentro de REA el Workflow Builder autenticado de GHL**. Las conclusiones de GHL abajo provienen de documentación oficial pública; se mantienen como levantamiento documental, no como observación directa de la app.
- La documentación del Help Center de GHL usa el producto vigente en 2026; la UI concreta, funciones habilitadas para esta cuenta y licencias de cada integración deben confirmarse en la pasada REA de la cuenta.

### Fuentes oficiales revisadas

- HighLevel: [recorrido del Workflow Builder](https://help.gohighlevel.com/support/solutions/articles/155000001254), [acciones del workflow](https://help.gohighlevel.com/support/solutions/articles/155000002294), [Customer Replied](https://help.gohighlevel.com/support/solutions/articles/155000002677), [User Replied](https://help.gohighlevel.com/support/solutions/articles/155000008196-workflow-trigger-user-replied), [Wait](https://help.gohighlevel.com/support/solutions/articles/155000002470-workflow-action-wait), [ajustes del workflow](https://help.gohighlevel.com/support/solutions/articles/48001239875-workflow-settings-overview) y [API de workflows](https://marketplace.gohighlevel.com/docs/ghl/workflows/workflows/index.html).
- n8n: nodos [HighLevel](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.highlevel/), [If](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/), [Switch](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/), [Code](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/), [Postgres](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/) y [reintentar ejecuciones](https://docs.n8n.io/workflows/executions/all-executions/).

## Modelo de interacción que debemos investigar y adoptar

La documentación de GHL describe un canvas infinito, fit-to-screen/minimapa, nodos movibles, varios triggers, acciones secuenciales, ramas, espera, metas/salto de pasos, notas, pruebas, publicación separada del guardado, historial de versiones y estadísticas de inscripción/acciones. Sus triggers se filtran antes de inscribir contactos; cada workflow configura reingreso, tratamiento de varias oportunidades, zona/ventana de envío y detención al responder.

n8n aporta el patrón de conexiones tipadas de nodos, ramas If/Switch, combinación de rutas, mapping de los datos que salen de nodos anteriores, esperas que persisten y retoman la ejecución, webhooks, subworkflows, integraciones por recurso/operación, historial de ejecuciones y reintentos. El nodo HighLevel documentado por n8n cubre contactos, oportunidades, tareas y calendarios; no reemplaza la API propia de BDC OS ni proporciona acceso a nuestras conversaciones.

**Dirección para BDC OS:** conservar la claridad del journey de CRM de GHL y adoptar el canvas/nodos flexibles de n8n; especializarlos para dealer y permitir consultar contexto conversacional completo mediante interfaces tenant-scoped de BDC OS. El acceso a nuestra base de conversaciones no debe convertirse en un nodo de SQL libre para usuarios.

## Inventario de nodos y capacidades propuestas

### A. Inicio y disparadores

| Nodo/disparador | Evento de BDC OS | Qué filtra o entrega | Estado actual y dependencias |
|---|---|---|---|
| **Contacto creado** | Alta de contacto local o inbound | dealer, fuente, consentimiento, campos disponibles | CRUD de contactos existe; falta emitir evento durable para workflows. |
| **Mensaje entrante** | Mensaje persistido en conversación | canal, texto, contacto, hora, conversación nueva/activa, estado/consentimiento | Webhooks Meta e ingestión existen; la persistencia existe; falta publicar evento de dominio a automatizaciones después del commit. |
| **Respuesta de asesor** | Respuesta de usuario guardada como entregada | asesor, canal, texto, conversación, contacto | La respuesta backend persiste y conserva emisor/estado; falta evento de respuesta humana y control “detener al intervenir asesor”. |
| **Conversación asignada o estado cambiado** | Cambio de responsable, leído/no leído o abierta/cerrada | valor anterior/nuevo, responsable, dealer | API de conversación existe; falta contrato de eventos y decidir qué cambios activan workflow. |
| **Oportunidad creada/cambiada** | Alta, cambio de etapa/responsable/próxima acción, archivo/restauración | pipeline, etapa, monto, responsable, fecha de acción | CRUD y auditoría existen; falta emisión de eventos para el runtime. |
| **Cita creada/actualizada** | Cita confirmada, cancelada, completada, no-show o reprogramada | fecha/hora local, contacto, responsable, estado | API/agenda existe; recordatorios se guardan pero no hay despacho; falta scheduler y eventos. |
| **Programación** | Fecha/hora recurrente o una sola vez | horario, días, zona `America/New_York` | No hay scheduler de CRM-05; implementar scheduler durable antes de publicar este trigger. |
| **Webhook entrante** | Servicio externo llama una URL del dealer | autenticación, tipo de evento y payload permitido | Webhook de Meta existe; endpoint genérico de workflow no existe. Construirlo con firma/secretos y validación. |
| **Manual/test** | Usuario ejecuta desde editor con evento de muestra | payload sintético o registro elegido en entorno local | No existe sandbox/simulador de workflows; requiere herramienta de prueba sin enviar efectos externos. |

**Futuras fuentes:** tarea creada/completada, actividad de llamada, evento CAPI, formulario y reloj de SLA. No asumir soporte hasta que el dominio/API correspondiente exista.

### B. Datos, filtros y condiciones

| Nodo/condición | Campos disponibles propuestos | Evaluación |
|---|---|---|
| **Contacto** | nombre, teléfono/email permitidos, tags, consentimiento, fuente, dealer | Reutilizable con la API de contactos; definir operador tipado y qué PII puede aparecer en logs. |
| **Mensaje** | texto/dirección/canal/fecha/autor/entrega y si es el primero o una respuesta | Ventaja propia de BDC OS: mensajes están persistidos; permitir filtros de frase/contains/regex acotado, canal y tipo sin devolver transcript entero a los logs. |
| **Conversación** | estado, asignación, leído/no leído, último mensaje, cantidad/recencia | La API y las queries actuales exponen parte de estos datos. Crear campos explícitos del trigger, no permitir expresiones SQL. |
| **Oportunidad** | etapa, monto, próximo paso/fecha, responsable, archivada | Datos persistidos hoy; condición sobre etapa y valores. |
| **Cita** | estado, comienza/termina, responsable y vínculos | Datos persistidos hoy; comparar tiempos en `America/New_York`, almacenar instantes en UTC. |
| **IF/Else** | comparaciones de texto, número, fecha, booleano, vacío/existe, AND/OR | Fase inicial; operador validado por tipo. |
| **Switch** | salida por canal, etapa, estado o categoría | Inspirado en n8n; múltiples salidas nombradas y una salida de reserva explícita. |
| **Filtro / continúa o termina** | cualquier condición sobre el evento actual | Útil para que un disparador compartido no tenga que duplicarse por cada caso. |
| **Clasificar mensaje (IA, posterior)** | consulta al servicio interno de IA con mensaje/contexto elegido | La plataforma tiene componentes de IA conversacional, no una acción CRM configurable. Requiere presupuesto, límites, seguridad, pruebas, resultado tipado y fallback; no incluir como node MVP sin aprobación funcional. |
| **Expresión/datos calculados** | formato de fecha, texto de plantilla, valores de nodos previos | Permitir variables declaradas y funciones limitadas; no ejecutar código arbitrario en el primer release. |

### C. Flujo, espera y composición

| Nodo/control | Uso | Requisito de implementación |
|---|---|---|
| **Wait / retraso** | esperar minutos/horas/días o hasta fecha | Guardar checkpoint/fecha de reanudación; reanudar mediante cola durable y zona New York para horas de negocio. |
| **Esperar respuesta** | esperar respuesta del contacto o de asesor y bifurcar por respuesta/timeout | Suscribir el run a eventos nuevos, no sondear la base sin límite; GHL muestra patrones de respuesta/timeout/SLA. |
| **Stop on response / intervención humana** | cancelar pasos futuros cuando el cliente contesta, el asesor interviene o hay opt-out | Requerido para que una automatización no compita con un asesor ni siga contactando. |
| **Go to goal / salida** | saltar a meta o terminar una secuencia cuando se cumple una condición | Para una primera versión usar salidas/terminación; evitar saltos arbitrarios que creen ciclos ocultos. |
| **Merge** | reunir rutas que terminaron | Posponer hasta que la semántica de concurrencia y espera esté diseñada. |
| **Subworkflow** | reutilizar bloque dentro de varios journeys | Post-MVP; requiere versionado/entrada tipada y política de errores/cancelación. |
| **Bucle/array paralelo** | iterar varios elementos | No incluir en MVP; cuotas, límites y deduplicación antes de añadirlo. |

### D. Acciones de dealer

| Acción | Qué cambia | Estado y orden sugerido |
|---|---|---|
| **Añadir/quitar tag** | segmentación del contacto | Prioridad MVP; falta catálogo de tags en API/dominio si no está ya expuesto. |
| **Actualizar campo de contacto** | datos del contacto | Prioridad MVP sobre campos de allowlist con validación y auditoría. |
| **Asignar contacto/conversación** | asesor responsable | Prioridad MVP; reutilizar membership/tenant validation. |
| **Marcar conversación leída/no leída** | bandeja operativa | Existe en CRM-02; permitir como acción idempotente y auditada. |
| **Añadir nota interna** | historial visible a equipo | Pendiente de confirmar/implementar entidad y endpoint de notas; no simular como mensaje outbound. |
| **Crear tarea de seguimiento** | trabajo para un asesor y vencimiento | No hay módulo de tareas CRM identificado; requiere modelo/UI/API antes del nodo. |
| **Crear/actualizar oportunidad** | etapa, monto, asesor, próxima acción | Prioridad MVP; API existente ya valida dealer/usuario y audita. |
| **Archivar/restaurar oportunidad** | soft delete de pipeline | API existe; excluir de MVP si una automatización podría ocultar ventas accidentalmente; exigir confirmación/config específica y audit. |
| **Crear/reprogramar/confirmar/cancelar cita** | agenda dealer | API existente; validar choque y disponibilidad. Acciones de reprogramar/cancelar requieren política de aviso al cliente antes de enviar. |
| **Enviar respuesta por canal** | mensaje externo Meta | No encender en pruebas ni en producción dentro de esta investigación. Backend soporta envío con clave idempotente, estado y guardas, pero el nodo requiere consentimiento/ventana/política por canal, cancelación al responder y control de duplicado. |
| **Notificación interna** | alertar al asesor/manager | No confundir con envío al cliente; decidir inbox/email y canal de notificación. |
| **HTTP Request / webhook salida** | integrar servicio externo | Después del motor central; secreto por dealer, hosts permitidos, límites, timeout, firma, logs censurados y reintento idempotente. |
| **Código/SQL libre** | personalizar lógica o consultar DB | **No para usuarios dealer en MVP.** n8n ofrece Code/Postgres porque es una herramienta de integración general; BDC OS debe usar su DB de conversación por nodos/API de dominio con alcance de dealer. Evita lectura/escritura arbitraria, exfiltración y saltos de RLS. |

### E. Nodos n8n/GHL útiles para inspirar, no copiar sin diseño

- n8n confirma nodos `If`, `Switch`, `Webhook`, `Wait`, `Code`, `Postgres`, `HTTP Request`, ejecuciones/subworkflows y muchas integraciones. Su Wait persiste datos mientras suspende la ejecución; las ejecuciones fallidas pueden reintentarse con la definición actual o la original.
- El nodo HighLevel de n8n documenta CRUD de contactos/oportunidades/tareas y lectura de slots/reserva de calendarios; para APIs no cubiertas propone HTTP Request con credencial HighLevel.
- GHL agrupa acciones en CRM/contacto, comunicación, datos, herramientas internas, citas, oportunidades, marketing y otras áreas. Para BDC OS de dealers bastan primero CRM, conversaciones, pipeline, calendario y avisos internos. Pagos, cursos, comunidades, afiliados, IVR y ads no pertenecen al MVP.
- El API de Workflows de GHL lista crear/buscar/leer/actualizar/publicar/logs, pero documenta disponibilidad limitada a ciertos subaccounts. La compatibilidad/licencia se debe validar en REA y no se presupone para la cuenta.

## Subtareas propuestas

La implementación de Automatizaciones no empieza hasta cerrar la definición del producto y las interfaces de dominio. Las subtareas quedan separadas para revisarlas y aceptarlas en orden:

| Subtarea | Entrega | Dependencias | Criterio de cierre |
|---|---|---|---|
| **CRM-05-A · REA GHL live** | Captura del Workflow Builder real: canvas, alta/config de trigger, catálogo visible de acciones, Wait/ramas, ajustes, test, draft/publish, versiones y logs. | Resolver limpieza REA (`browser_transport`/`browser_profile`) o una sesión autenticada conectable. | Cada hallazgo etiquetado como observado y con Evidence, límites/plan visibles; sin editar ni publicar workflows del usuario. |
| **CRM-05-B · REA n8n y catálogo** | Terminar recorrido de docs de nodos esenciales e inventariar conectores útiles a dealer, niveles de riesgo y diferencias Community/Cloud cuando afecten. | Reabrir REA después de limpiar el proceso retenido; documentación pública sigue disponible. | Matriz de nodos oficial, operación, entradas/salidas y uso BDC; separar app nodes, triggers, core nodes, AI/subnodes y community nodes. |
| **CRM-05-C · Inventario de eventos BDC** | Contrato de eventos para contacto, inbound/outbound message, respuesta humana, asignación, oportunidad y cita; transacción/outbox, deduplicación y reingreso. | Verificar límites en los repos backend y reglas del modelo. | Schema versionado de eventos con tenantId, actor/origen, entidad, occurredAt, eventId, payload allowlist y tests. |
| **CRM-05-D · Definición del canvas y workflow DSL** | UX del canvas y esquema persistente de nodos/aristas, puertos, posiciones, variables, validación y errores visibles. | CRM-05-A/B y C. | JSON versionable/migrable; nodos inválidos/ciclos/entradas huérfanas identificados antes de guardar/publicar; draft y publicado separados. |
| **CRM-05-E · Motor durable** | Runs y steps, cola, ejecución en orden/ramas, esperas, cancelación, retry/backoff, dead-letter y replay. | Contrato de evento y DSL aprobados. | Reinicio de proceso no pierde run; paso idempotente; fallo visible y recuperable; tenant aislado. |
| **CRM-05-F · Nodos CRM MVP** | Contacto, condición IF/Switch, Wait, Stop, tags, actualizar campo, asignar, crear tarea (cuando exista dominio), oportunidad y cita. | API de cada acción/entidad y motor durable. | Cada nodo define schema de config/input/output, permisos, efecto, validación y auditoría; cobertura de dos dealers. |
| **CRM-05-G · Contexto de conversación e IA** | Nodo seguro de cargar historial/último mensaje/búsqueda de mensajes; evaluación de reglas de texto y posible clasificación. | Permisos de datos, presupuesto IA y política aprobados. | Solo acceso scoped por dealer/conversación; límites de resultados/tokens, redacción de logs, no raw SQL/code, tests de fuga entre tenants. |
| **CRM-05-H · Comunicaciones e integraciones** | Envío de mensaje soportado, avisos internos, HTTP/webhook saliente y credenciales por dealer. | CRM-05-E/F, política de consentimiento y canal, Meta settings de cada dealer. | Dry-run y sandbox primero; stop-on-response/opt-out; idempotencia, ventanas por canal, resultados/reintentos observables. No envíos reales hasta autorización posterior. |
| **CRM-05-I · Prueba, logs y publicación** | Simulador con datos sintéticos, step-through, diff draft/publicado, historial/versiones, logs/resumen por run y permisos. | Canvas y motor funcionales. | Simulación sin efectos; publicar exige revisión; logs con datos mínimos; replay conserva versión elegida y no duplica efectos. |
| **CRM-05-J · Seguridad y regresión final** | Matriz amenazas/roles, RLS, consentimiento, auditoría, cuotas, abuso de ciclos y carga; E2E de dealer A/B. | Subtareas anteriores. | Pruebas negativas de cross-tenant, deduplicación, concurrencia, reintentos, cancelación y datos del transcript; build y contenedores locales recreados. |

## Decisiones de producto que debe resolver CRM-05-A/B antes de codificar

1. Si el canvas permite múltiples triggers por workflow o un trigger inicial por workflow (GHL documentalmente permite múltiples; las reglas de inscripción deben ser inequívocas).
2. Qué es una ejecución individual: por contacto, conversación, oportunidad o cita (n8n crea ejecución por evento; BDC debe evitar duplicar journeys al mismo contacto en varios deals).
3. Cuándo permitir reingreso y si un nuevo appointment/message puede abrir una nueva instancia mientras otra está activa.
4. Qué evento cuenta como “respuesta humana” y qué acciones de asesor cancelan un envío pendiente.
5. Qué canales salientes entran al primer release y qué estados de consentimiento/ventana bloquean la comunicación.
6. Si la hora de negocios será `America/New_York` por defecto y cómo se comporta cuando un dealer opere en otra zona.
7. Retención del texto de ejecución: sugerencia inicial es guardar resultado/IDs/estado y un extracto mínimo; transcript completo se consulta on-demand y nunca se duplica innecesariamente en logs.

## Flujos de negocio que validan el inventario

1. **Mensaje entrante → calificar → asignar:** trigger de mensaje; consultar contexto permitido; condición sobre intención/canal; crear oportunidad, asignar asesor y crear tarea. Sin responder al cliente automáticamente en la primera prueba.
2. **SLA de conversación → escalamiento:** mensaje entrante; esperar respuesta humana por tiempo definido; si no ocurre, avisar internamente/crear tarea; cancelar si el asesor responde o el cliente resuelve.
3. **Cambio de etapa → seguimiento:** oportunidad pasa a `closing`; esperar dentro de horario; al recibir respuesta, detener; si no hay respuesta, crear tarea o notificación.
4. **Cita → recordatorio local:** cita confirmada; esperar hasta el umbral usando New York; verificar que la cita siga activa/no se haya reprogramado; preparar notificación en sandbox. El envío externo queda desactivado hasta política y proveedor autorizados.

## Riesgos de diseño y controles no negociables

- Eventos publicados solo después de confirmar persistencia, con `eventId` estable y outbox/cola durable; al reintentar, usar claves idempotentes por `tenant + workflow version + event + node`.
- Todo query/action usa dealer del contexto autorizado y RLS del backend. El canvas no puede aceptar un `dealerId` arbitrario para leer conversaciones.
- Filtros sobre texto deben ser acotados; no registrar transcript, secretos ni payloads sensibles en ejecución por defecto.
- No ejecutar JavaScript/Python libre, comandos ni SQL arbitrario para dealers en la primera versión. Acciones se implementan como nodos explícitos allowlisted.
- Publicación separada de guardar; crear pruebas/dry-run y registros sintéticos; no correr lógica publicada sobre producción durante el análisis.
- Mensajes externos quedan fuera del simulador. Antes de habilitarlos, validar consentimiento, canal, reglas de Meta, estado de la conversación, intervención humana, idempotencia y supervisión del dealer.
- El workflow builder debe mostrar fallas, próximo reintento, cancelación y dead-letter sin exponer datos completos de conversaciones a otros dealers.

## Fuente de código revisada

- Frontend: `src/presentation/app/navigation.ts` ya reserva la sección Automatizaciones; no hay feature/editor ni nodos CRM implementados.
- Backend conversacional: `src/features/contacts/presentation/http/conversation-list.routes.ts`, `conversation-messages.routes.ts`, `conversation-workflow.routes.ts`, `contact-detail.routes.ts`; mensajes entrantes pasan por `src/modules/webhooks/application/process-inbound-webhook.use-case.ts` y repositorios de `src/modules/webhooks/`.
- Tenant/auditoría: `src/features/identity/infrastructure/persistence/postgres/tenant-rls.migration.ts` y `src/features/identity/presentation/http/route-helpers.ts`.
- Oportunidades: `src/features/opportunities/presentation/http/opportunities.routes.ts`; citas: `src/features/appointments/presentation/http/appointments.routes.ts`.
- Colas existentes: `src/modules/webhooks/infrastructure/redis/redis-webhook-queue.ts` usa claim, backoff, máximo de intentos y dead-letter; `src/modules/control/infrastructure/redis/redis-burst-flush-queue.ts` gestiona trabajos diferidos de otro caso. No son todavía motor de workflow por dealer.

## Próximo paso

Cerrar **CRM-05-A** con REA dentro del Workflow Builder autenticado de GHL y **CRM-05-B** con el inventario profundo de n8n, luego validar el inventario preliminar con esos hallazgos antes de diseñar DSL o escribir código. La limpieza del browser owner de REA se debe resolver primero; no se deben dar por observadas pantallas que solo aparecen en la documentación pública.

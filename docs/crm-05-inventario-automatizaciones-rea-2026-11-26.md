# CRM-05 · Inventario de automatizaciones, nodos y subtareas

**Corte:** 26 de noviembre de 2026
**Objetivo:** investigar GHL y n8n, inventariar lo que BDC OS puede automatizar con el código actual, definir el canvas visual requerido y dividir el trabajo antes de implementar CRM-05.
**Estado:** investigación y diseño preliminar; no se ha comenzado el motor ni el editor. La observación autenticada de GHL avanzó en modo estrictamente de lectura: no se cambiaron workflows, no se probaron y no se publicaron.

**Recordatorio operativo:** después de cada cambio de código se debe reconstruir y recrear el contenedor local afectado antes de validar o continuar. Este cambio solo modifica documentación, así que no requiere recarga del contenedor.

## Resumen ejecutivo

BDC OS ya tiene datos útiles para automatizaciones que GHL normalmente trata como campos CRM: mensajes y conversaciones persistidos, contenido del mensaje accesible por dealer, historial, estados, responsables, contactos, oportunidades y citas. Eso permite diseñar disparadores y condiciones sobre el contenido real de la conversación, incluida la última respuesta y un contexto de mensajes limitado por dealer.

La interfaz debe ser un **canvas visual de nodos**, con arrastre, zoom, conexiones y ramas visibles, inspirado en el patrón de n8n/GHL. El workflow se guarda como un grafo versionado (nodos y aristas), se puede validar y simular en borrador y solo ejecuta efectos reales al publicarse. No se debe presentar como un canvas si solo es un formulario lineal de pasos.

La base técnica actual todavía no incluye workflows, ejecución durable, scheduler de automatizaciones, catálogo de nodos ni tareas internas del CRM. Sí aporta APIs y persistencia de contactos, conversaciones, mensajes, oportunidades y citas, autorización por dealer, auditoría, idempotencia de mensajes y colas Redis para otros procesos. Por eso el inventario marca por separado “reutilizable hoy” y “requiere construcción”.

## Alcance y evidencia

### Método y límites REA

- **n8n:** REA abrió en Chromium temporal la documentación oficial del nodo HighLevel y capturó su árbol de accesibilidad. Evidencia de la captura: `ev_a24f0fab23b6da9bc0cff6247ecb5aedc0d0a5c05ccec77613e4c34c19d372ff`; padre completo: `ev_65d67ff3b9d0f6f8a69144cacc5aae5e82c43c31e51745b2e36a6733c10cf4f5`. La captura fue lectura de documentación pública, no ejecución de un workflow n8n.
- **GHL, documentación y cuenta:** la captura REA en Chromium temporal del walkthrough oficial terminó con `cleanup_incomplete`; esa evidencia no se usa como si fuera una inspección runtime. Después, con autorización explícita del usuario, se inspeccionó el Workflow Builder autenticado en Chrome y solo se leyeron el listado, una carpeta y un workflow en borrador. No se tocaron workflows, no se usó Test, no se guardó ni publicó nada. La captura observacional se hizo en Chrome, no mediante REA; no tiene un ID de evidencia REA.
- En la cuenta se observó la lista con carpetas para llamadas IA, WhatsApp IA, redes sociales IA, calendario, Live Chat/Web Chat, extracciones/custom tools y otras automatizaciones; además había dos workflows publicados con 3,742 y 1,982 inscripciones totales (ambos mostraban cero activos en ese momento). Se abrió únicamente el borrador `4.1 Agenda: Recordatorios (SIN email)`, que mostraba un canvas y acciones encadenadas: guardar enlace de reprogramación de cita, mover `Agenda Reunion`, enviar confirmación por WhatsApp y esperar un día. Se observó su estado Draft y cero inscripciones. Esto confirma el patrón del canvas y esos casos de uso, pero **no** el catálogo completo, los paneles de configuración, los ajustes, logs ni acciones publicadas.
- En otra carpeta se abrió únicamente el borrador `Livechat IA` (Draft, cero inscripciones). Su canvas mostraba `Customer Replied` con filtro `Reply channel is "Live chat"`, seguido por `Add Tag asistente` y `END`. Al abrir el trigger se observó su panel descriptivo y filtro de canal; no se guardó nada. El canvas mostraba el minimapa y controles de zoom/fit-to-screen. La barra del editor lo etiqueta **Standard builder**; no se verificó un modo avanzado alternativo.
- En `Extracciones / Custom Tools` se observaron dos borradores (ambos Draft, cero inscripciones): `Actualizar datos del cliente` y `Extracciones IA`. Los dos mostraban el mismo grafo `Inbound Webhook → Find Contact → Update contact field → END`; el segundo mostraba una alerta en el nodo de actualización. En `Extracciones IA` también se veía una nota para importar el workflow como herramienta de un asistente. El identificador visible de esa integración se omitió deliberadamente de esta documentación. No se abrió configuración del webhook ni se probó o guardó ninguno de los borradores.
- En `2. WhatsApp IA` la lista mostró cuatro borradores de captación (WhatsApp, Facebook Lead Form, TikTok Lead Form y formulario web), un workflow `Conversando con IA` Published con cero inscripciones en ese corte, y `Asistente Agenda Cita` en Draft. Solo se abrió `2.1 Nuevo mensaje de WhatsApp` (Draft, cero inscripciones): el canvas muestra un trigger de Customer replied llamado `Nuevo contacto: WhatsApp` con filtro `Reply channel is "SMS"`, seguido por acciones de asistente/etiqueta, movimiento de oportunidad, dos seguimientos con esperas de 2 horas/6 horas/2 días, movimiento a descalificado y fin. La diferencia entre nombre WhatsApp y canal SMS es una **posible discrepancia de borrador para confirmar**, no un bug confirmado ni algo que se haya corregido.
- También se abrió el borrador `2.6 Asistente Agenda Cita` (Draft, cero inscripciones): trigger de Appointment status filtrado por evento Normal, estado confirmed, un calendario específico y tag `asistente de whatsapp`, seguido de `Agenda reunion` y fin. Se omitió el ID interno del calendario. El nodo del trigger mostraba una alerta. No se inspeccionó su configuración completa ni se hizo prueba/publicación.
- En calendario, el borrador `4.2 No asisten a reunión (SIN email)` (Draft, cero inscripciones) presentaba el patrón `Opportunity changed → etapa "No Asiste" + tag asistente → Wait 1 min → Status Cita: No-show`. Es evidencia de un journey que parte de un cambio de oportunidad y actualiza la cita relacionada. Para BDC OS esto requiere que el contexto de ejecución lleve referencias de oportunidad, contacto y cita con validación tenant-scoped; no basta con pasar un `contactId` genérico.
- El borrador `4.4 Conversando con IA` solo mostraba el canvas vacío y el control para agregar acciones; no tenía trigger ni nodos visibles. No se considera evidencia de que exista allí un journey funcional de IA.
- En Settings del borrador `4.1 Agenda: Recordatorios (SIN email)` se observaron opciones globales para Allow re-entry, Allow multiple opportunities, Stop on response, Timezone, Time window, sender defaults y Mark as read. En esa configuración concreta: re-entry estaba activo; múltiples oportunidades, stop-on-response, time window y marcar como leída estaban inactivos. La zona se mostraba como `Account timezone`; no se debe asumir que esos valores son defaults universales de GHL.
- El texto de ayuda observado para Stop on response especifica que el workflow termina cuando el contacto responde a un mensaje enviado por ese workflow. No se debe presentar esa opción de GHL como equivalente a detenerse por una respuesta del asesor; el control humano y el opt-out deben modelarse por separado en BDC OS.
- La pestaña Execution logs de ese mismo borrador no tenía registros. Mostraba filtros por fecha/acción/estado/contacto, Auto refresh y Export; columnas de Record/Action/Status/Executed on y una retención de logs visible de 60 días. La hora de la columna se etiquetaba `EST -05:00`; BDC OS debe usar `America/New_York` y validar DST en sus propios logs, no copiar esa etiqueta fija como zona de negocio.
- En ese borrador, los botones `Add action` y `Add trigger` abrieron sus respectivos catálogos sin seleccionar ni insertar elementos. Las acciones más pertinentes observadas fueron: contacto (crear/buscar/actualizar, tags, asignar, DND, notas, conversación y tarea); comunicación (email, SMS, Messenger, Instagram DM, llamada, notificación interna, review request y Conversation AI); datos externos (Webhook, Custom webhook, Google Sheets); controles internos (If/Else, Router, Loop beta, Wait, Goal event, Split, Go to, formatters, math y add/remove from workflow); citas (estado, enlace de booking y nota); oportunidades (buscar/crear/actualizar, owner/followers y asociaciones); e IA (AI Agent, decision maker, resumen, intent detection, captura y acciones de proveedores). También aparecieron categorías ajenas al MVP dealer como Payments, Affiliate, Membership, IVR, cursos, Communities, Events y Voice AI.
- El catálogo de triggers observados incluía Contact (created/changed/tag/DND, notas y tareas), Events (inbound webhook, Scheduler, call/email events, Customer replied, inbound email, Conversation AI, custom trigger, formularios y enlaces), Appointments, Opportunities (creada/cambiada/etapa/stale), Communications/SLA, pagos, anuncios/social, ecommerce, Slack y Google Sheets (algunos polling o Beta). Sirve para validar el mapa conceptual, pero no implica que todos esos conectores estén disponibles/licenciados en el dealer ni que pertenezcan al MVP.
- La lista/canvas se observó en modo de lectura. No se cambió configuración, no se abrió prueba de ejecución y no se inspeccionaron workflows publicados. Una futura observación de más detalles debe preservar el mismo límite: inspeccionar sin editar, guardar, probar o publicar.
- La UI y las funciones habilitadas varían según cuenta y permisos; los nombres concretos de acciones y disponibilidad deben confirmarse antes de declararlos soporte de BDC OS.

### Fuentes oficiales revisadas

- HighLevel: [recorrido del Workflow Builder](https://help.gohighlevel.com/support/solutions/articles/155000001254), [acciones del workflow](https://help.gohighlevel.com/support/solutions/articles/155000002294), [Customer Replied](https://help.gohighlevel.com/support/solutions/articles/155000002677), [User Replied](https://help.gohighlevel.com/support/solutions/articles/155000008196-workflow-trigger-user-replied), [Wait](https://help.gohighlevel.com/support/solutions/articles/155000002470-workflow-action-wait), [ajustes del workflow](https://help.gohighlevel.com/support/solutions/articles/48001239875-workflow-settings-overview) y [API de workflows](https://marketplace.gohighlevel.com/docs/ghl/workflows/workflows/index.html).
- n8n: nodos [HighLevel](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.highlevel/), [If](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/), [Switch](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/), [Edit Fields](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/), [Code](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/), [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/), [Merge](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/), [Loop Over Items](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/), [Execute Sub-workflow](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/), [Error Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger/), [Postgres](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/) y [reintentar ejecuciones](https://docs.n8n.io/workflows/executions/all-executions/).

## Modelo de interacción que debemos investigar y adoptar

La documentación de GHL describe un canvas infinito, fit-to-screen/minimapa, nodos movibles, varios triggers, acciones secuenciales, ramas, espera, metas/salto de pasos, notas, pruebas, publicación separada del guardado, historial de versiones y estadísticas de inscripción/acciones. Sus triggers se filtran antes de inscribir contactos; cada workflow configura reingreso, tratamiento de varias oportunidades, zona/ventana de envío y detención al responder.

n8n aporta el patrón de conexiones tipadas de nodos, ramas If/Switch, combinación de rutas, mapping de los datos que salen de nodos anteriores, esperas que persisten y retoman la ejecución, webhooks, subworkflows, integraciones por recurso/operación, historial de ejecuciones y reintentos. El nodo HighLevel documentado por n8n cubre contactos, oportunidades, tareas y calendarios; no reemplaza la API propia de BDC OS ni proporciona acceso a nuestras conversaciones.

**Dirección para BDC OS:** conservar la claridad del journey de CRM de GHL y adoptar el canvas/nodos flexibles de n8n; especializarlos para dealer y permitir consultar contexto conversacional completo mediante interfaces tenant-scoped de BDC OS. El acceso a nuestra base de conversaciones no debe convertirse en un nodo de SQL libre para usuarios.

## Inventario de nodos y capacidades propuestas

### Nodos canónicos compartidos entre GHL y n8n

La regla de producto es fusionar en BDC OS los conceptos que ejecutan la misma función. GHL y n8n se conservan como nombres de referencia/origen en el catálogo, no como dos implementaciones duplicadas. Si dos conceptos tienen semántica o efectos distintos, se mantienen separados aunque visualmente se parezcan.

| Nodo canónico BDC OS | Equivalente GHL | Equivalente n8n | Regla de fusión y límite |
|---|---|---|---|
| **Disparador de evento** | Triggers de contacto, respuesta, oportunidad, cita y cambios | Trigger nodes; Webhook Trigger | Un contrato común de evento tipado con salidas de datos. El webhook es una fuente de evento con autenticación específica, no una segunda copia de todos los triggers.
| **Condición / bifurcación** | If/Else, Router, filtros del trigger | If, Switch | Un solo nodo configurable para condición simple o múltiples casos nombrados. Mantener puertos de salida tipados (true/false o casos/default); no duplicar If y Switch si la misma UI cubre ambas formas.
| **Esperar / reanudar** | Wait | Wait | Un nodo durable con duración, fecha o evento; debe persistir checkpoint y reanudar run. “Esperar respuesta” será modo por evento de este nodo o una extensión visible, no un sondeo distinto.
| **Acción sobre registro CRM** | Acciones de contacto, asignación, oportunidad y cita | Operaciones del nodo HighLevel de n8n para contactos, oportunidades y calendarios | Fusionar por entidad/operación: contacto, oportunidad y cita son configuraciones del mismo grupo de acciones, pero no exponer CRUD genérico ni permitir registros fuera del dealer.
| **Enviar mensaje al contacto** | Acciones de comunicación y WhatsApp/SMS/email según proveedor | Nodo de integración si existe para el canal; de lo contrario conector externo | Un nodo de salida BDC con política de canal, consentimiento, ventana, stop-on-response e idempotencia. No se fusiona con notificación interna.
| **HTTP Request saliente** | Webhook/HTTP de salida o Custom Webhook action (según disponibilidad) | HTTP Request | Compartir un nodo HTTP saliente con credenciales seguras, allowlist, timeout y salidas éxito/error; proveedores registrados pueden dar una UI tipada encima.
| **Webhook entrante** | Trigger de webhook entrante | Webhook Trigger | Mismo propósito de recibir una llamada externa; conservar como trigger, distinto de HTTP Request saliente por dirección y superficie de seguridad. Los borradores `Actualizar datos del cliente` y `Extracciones IA` presentan el patrón webhook→lookup de contacto→actualización CRM; no se ejecutaron y no se inspeccionó su contrato ni endpoint.
| **Transformar datos** | Format/Math/Date u otras acciones utilitarias | Edit Fields/Set, Code | Un nodo de mapeo/formato tipado. No incorporar código arbitrario al MVP; el nodo Code de n8n es una capacidad avanzada que no equivale a una transformación segura de CRM.
| **Bucle de elementos** | Loop (Beta, observado en el catálogo) | Loop Over Items | Conceptualmente agrupan iteración de entradas; aplazar al post-MVP con límite de elementos, cancelación y condición de término obligatoria para prevenir ciclos infinitos.
| **Combinar ramas** | No se observó nodo equivalente en el catálogo GHL | Merge | Capacidad n8n para esperar/componer varias entradas de una ejecución; no confundir con Router/If. BDC debe posponerla hasta definir concurrencia, correlación de ramas y qué pasa cuando una rama falla o queda esperando.
| **Leer contexto de conversación** | Filtros/acciones de conversación donde existan | No hay equivalente directo en el nodo HighLevel documentado | Nodo propio BDC que lee mensajes persistidos y entrega contexto limitado por dealer. No fusionar con Postgres/SQL libre.
| **Tarea interna / aviso al equipo** | Create Task, internal notification | Create Task (HighLevel) o integración de notificación | Las tareas se pueden fusionar como una acción CRM cuando exista entidad/API BDC. Aviso interno queda distinto del mensaje externo por destinatario, canal y efectos.
| **Subworkflow reutilizable** | Go To / salto a paso no equivale a llamar un workflow reutilizable | Execute Sub-workflow | Mantener separado y posponer: Go To cambia el punto del mismo grafo; subworkflow invoca otro workflow con contrato propio.
| **Split / experimento** | Split | No es equivalente a If/Switch determinista | Mantener separado y diferir: división aleatoria o porcentual sirve para experimento; no debe fusionarse con una condición que evalúa datos.
| **Consulta de base de datos** | No se encontró equivalente de dealer en el catálogo observado/documentado | Postgres | No habilitar como nodo de usuario. BDC usa acciones/lecturas de dominio scoped por dealer; Postgres libre atraviesa el límite de seguridad y no es funcionalmente equivalente.
| **Manejador de error** | Logs/estado de ejecución observados; no se encontró Error Trigger en el catálogo visible | Error Trigger / Stop And Error | No es un nodo de negocio por defecto. BDC necesita primero error estructurado por step, política común de retry/dead-letter y alertas seguras; diferir un workflow de errores configurable.

La observación autenticada confirma directamente que el builder inspeccionado presenta un canvas de nodos, acciones conectadas, espera, minimapa y zoom/fit-to-screen; la UI lo etiqueta **Standard builder** y no se comprobó si existe una variante avanzada en GHL. El requisito de BDC OS, conforme a la indicación del usuario, es un **Advanced Builder de canvas libre parecido a n8n**: nodos posicionables, conexiones visuales entre puertos, ramas visibles, zoom/pan, minimapa/encuadre y configuración contextual. No reducirlo a un formulario lineal ni asumir que el modo estándar de GHL es la referencia avanzada.

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
| **Stop on response** | Setting GHL observado: terminar el workflow si el contacto responde a un mensaje enviado por ese workflow | Cancelar envíos programados posteriores del run al recibir respuesta del contacto; durable y correlacionado al contacto/conversación del trigger. |
| **Toma de control humana** | User Replied trigger y flujo de conversación; el setting Stop on response observado no menciona explícitamente la respuesta del asesor | Política BDC separada: suspender automatización mientras el asesor atiende o hasta que libere la conversación. Debe usar evento/estado CRM, no inferirse del reply del cliente. |
| **Opt-out / consentimiento** | Filtros de contacto/DND y reglas de canal | Guard de seguridad global por canal que bloquea acciones de salida; no es equivalente a Stop on response. |
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
- n8n `Edit Fields` permite mapear/setear campos con GUI o JSON; `HTTP Request` cubre operaciones REST con credenciales; `Merge` sincroniza/combina flujos concurrentes; `Loop Over Items` tiene puertos loop/done; `Execute Sub-workflow` invoca otro workflow con inputs tipados y puede esperar; `Error Trigger` inicia un workflow de error al fallar otro workflow automático. Son capacidades distintas y de nivel avanzado; incluirlas en una lista visual sin implementar estados/contratos sería engañoso.
- El nodo HighLevel de n8n documenta CRUD de contactos/oportunidades/tareas y lectura de slots/reserva de calendarios; para APIs no cubiertas propone HTTP Request con credencial HighLevel.
- GHL agrupa acciones en CRM/contacto, comunicación, datos, herramientas internas, citas, oportunidades, marketing y otras áreas. Para BDC OS de dealers bastan primero CRM, conversaciones, pipeline, calendario y avisos internos. Pagos, cursos, comunidades, afiliados, IVR y ads no pertenecen al MVP.
- El API de Workflows de GHL lista crear/buscar/leer/actualizar/publicar/logs, pero documenta disponibilidad limitada a ciertos subaccounts. La compatibilidad/licencia se debe validar en REA y no se presupone para la cuenta.

## Subtareas propuestas

La implementación de Automatizaciones no empieza hasta cerrar la definición del producto y las interfaces de dominio. Las subtareas quedan separadas para revisarlas y aceptarlas en orden:

| Subtarea | Entrega | Dependencias | Criterio de cierre |
|---|---|---|---|
| **CRM-05-A · REA GHL live** | **Revisión visual de solo lectura completada para el alcance seguro.** Se observaron listados/categorías, los catálogos de acciones/triggers, canvas de varios borradores, configuración del trigger Customer Replied, Settings y Execution logs. No se probaron/publicaron workflows ni se inspeccionaron flujos publicados. No es una captura REA formal: el CDP/REA continúa bloqueado por cleanup incompleto previo. | Ampliar en el futuro solo si Producto lo solicita y se resuelve la limpieza REA. | Cada hallazgo lleva etiqueta directa/documental/inferencia y límites; no editar, probar, guardar ni publicar workflows del usuario. No inferir comportamiento runtime desde nodos Draft. |
| **CRM-05-B · REA n8n y catálogo** | **Comparación de core nodes y operaciones CRM completada para el alcance de BDC.** Se revisó documentación oficial de HighLevel, If, Switch, Edit Fields, Code, HTTP Request, Webhook, Wait, Merge, Loop Over Items, Execute Sub-workflow, Error Trigger, Postgres y ejecuciones/reintentos. Se definió qué equivalentes se fusionan y cuáles conservan semántica distinta. | No hay instancia n8n de la cuenta abierta para runtime REA; esta comparación funcional es documental. | Matriz de nodos/operaciones y uso BDC cerrada para alcance CRM; no enumera miles de app/community integrations ni prueba compatibilidad de versión/licencia en una instancia concreta. |
| **CRM-05-C · Inventario de eventos BDC** | Contrato de eventos para contacto, inbound/outbound message, respuesta humana, asignación, oportunidad y cita; transacción/outbox, deduplicación y reingreso. | Verificar límites en los repos backend y reglas del modelo. | Schema versionado de eventos con tenantId, actor/origen, entidad, occurredAt, eventId, payload allowlist y tests. |
| **CRM-05-D · Definición del canvas y workflow DSL** | UX del canvas y esquema persistente de nodos/aristas, puertos, posiciones, variables, validación y errores visibles. | CRM-05-A/B y C. | JSON versionable/migrable; nodos inválidos/ciclos/entradas huérfanas identificados antes de guardar/publicar; draft y publicado separados. |
| **CRM-05-E · Motor durable** | Runs y steps, cola, ejecución en orden/ramas, esperas, cancelación, retry/backoff, dead-letter y replay. | Contrato de evento y DSL aprobados. | Ejecuta nodos reales; reinicio de proceso no pierde run; paso idempotente; fallo visible/recuperable; tenant aislado; pruebas de integración recorren el grafo persistido. |
| **CRM-05-F · Nodos CRM MVP** | Contacto, condición IF/Switch, Wait, Stop, tags, actualizar campo, asignar, crear tarea (cuando exista dominio), oportunidad y cita. | API de cada acción/entidad y motor durable. | Cada nodo tiene UI + schema + executor backend; al conectarlo cambia/consulta datos reales locales, entrega salida al siguiente nodo y tiene pruebas de éxito, validación, error, retry/idempotencia y dos dealers. No cuentan nodos que solo se dibujan o muestran una respuesta mock. |
| **CRM-05-G · Contexto de conversación e IA** | Nodo seguro de cargar historial/último mensaje/búsqueda de mensajes; evaluación de reglas de texto y posible clasificación. | Permisos de datos, presupuesto IA y política aprobados. | El nodo consulta mensajes persistidos reales scoped por dealer, entrega el contexto esperado al nodo siguiente y prueba límite/cross-tenant; límites de resultados/tokens, redacción de logs, no raw SQL/code. |
| **CRM-05-H · Comunicaciones e integraciones** | Envío de mensaje soportado, avisos internos, HTTP/webhook saliente y credenciales por dealer. | CRM-05-E/F, política de consentimiento y canal, Meta settings de cada dealer. | Prueba de contrato contra sandbox/local y falla simulada; stop-on-response/opt-out, idempotencia, ventanas por canal, salidas y reintentos reales observables. No envíos reales hasta autorización posterior. |
| **CRM-05-I · Prueba, logs y publicación** | Simulador con datos sintéticos, step-through, diff draft/publicado, historial/versiones, logs/resumen por run y permisos. | Canvas y motor funcionales. | La simulación muestra el resultado que cada executor produciría sin persistir efectos externos; pruebas verifican que Publish ejecute la versión guardada y que Replay no duplique efectos. |
| **CRM-05-J · Seguridad y regresión final** | Matriz amenazas/roles, RLS, consentimiento, auditoría, cuotas, abuso de ciclos y carga; E2E de dealer A/B. | Subtareas anteriores. | Cada nodo publicado tiene al menos un camino E2E real (no mock) y casos negativos apropiados; cross-tenant, deduplicación, concurrencia, retries, cancelación y transcript cubiertos; build y contenedores locales recreados. |

### Definición de “nodo terminado y funcional”

Un nodo no se considera implementado solo por aparecer en el canvas. Para contarlo en el catálogo disponible debe cumplir todo esto:

1. Se puede arrastrar/conectar, abrir su panel de configuración y guardar una configuración válida; valores inválidos o conexiones imposibles muestran un error accionable.
2. El motor reconoce su tipo/version, valida su entrada y permisos, ejecuta el efecto o consulta real y produce una salida tipada que el siguiente nodo puede consumir.
3. El resultado observable coincide con el estado persistido en la API/base local. Los nodos de control eligen la salida correcta; los de espera se reanudan; los de efecto reportan éxito/error real.
4. Tiene pruebas de éxito, borde/error y, cuando corresponda, retry idempotente, cancelación y aislamiento de dos dealers. Los conectores externos usan sandbox/fake provider verificable, no una respuesta hardcoded.
5. El run permite ver estado/resultado/error y permite reintentar o cancelar según el tipo. Los logs no revelan secretos ni copian conversaciones completas innecesariamente.

Los nodos que aún carezcan de entidad/API (por ejemplo, tarea interna o notificación de equipo) quedan etiquetados **planeados/deshabilitados** hasta que el backend soporte su operación completa. No deben aparecer como habilitados en producción.

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

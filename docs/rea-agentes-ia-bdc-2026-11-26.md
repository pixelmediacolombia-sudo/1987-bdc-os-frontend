# REA-04 · Agentes de IA para BDC OS

**Corte:** 26 de noviembre de 2026  
**Estado:** investigación de solo lectura de GHL y contraste estático con el backend BDC completados para el alcance funcional. La captura formal REA de la cuenta GHL no quedó retenida por `cleanup_incomplete`; la observación manual no se presenta como evidencia REA formal. No se hicieron llamadas a modelos ni se conectaron API Calls/MCP como herramientas. La construcción del agente queda separada como CRM-07 futuro.

**Recordatorio operativo:** después de cada cambio de código se debe reconstruir y recrear el contenedor local afectado antes de validar o continuar. Esta actualización es documentación y no requiere recarga del contenedor.

## Alcance decidido por el usuario

- El producto empezará con agentes sencillos.
- La primera experiencia será **Conversation AI sencillo de texto** para el trabajo BDC con leads.
- El producto debe permitir configurar varios agentes independientes. Esto no significa orquestación multiagente: cada agente puede tener su configuración sencilla y tarea acotada.
- Solo se podrán elegir modelos disponibles a través de la API de OpenAI.
- El historial persistido de conversaciones en BDC OS debe aportar memoria contextual para no repetir preguntas ni inventar hechos.
- La experiencia debe ser fácil para el cliente: configuración inicial mínima, sin exponer opciones técnicas innecesarias.
- Cada agente tendrá un único control visible para prenderlo o apagarlo.
- La base de conocimiento será opcional: se agrega solo cuando el dealer necesite complementar la memoria de conversaciones con información aprobada.
- El agente no tendrá acciones API ni servidores MCP en este primer alcance.
- La implementación del agente será una tarea posterior e independiente, **CRM-07**. Esta REA no crea, activa ni implementa agentes.

La memoria recuperada debe reducir respuestas sin sustento, pero no garantiza por sí sola que el modelo nunca alucine. El agente debe responder con los datos recuperados de BDC o el conocimiento aprobado, pedir aclaración cuando falte información y pasar a una persona cuando no pueda confirmar la respuesta.

## Observación directa de GHL

Se revisó en Chrome la cuenta Off Lease Motors / Stafford, Virginia, en modo de solo lectura. No se crearon, probaron, editaron ni publicaron agentes.

### Superficies observadas

- **Agent Studio:** el panel mostraba `Managed Agents 0` y ofrecía crear un agente o partir de plantillas. Las plantillas visibles incluían investigación/calificación de leads, brief de oportunidad, solicitud de reseña, contenido y marketing.
- **Conversation AI:** página separada para crear y administrar varios agentes. La vista contenía una tabla de actividad/conversaciones; no se inspeccionaron datos de contactos.
- **Voice AI:** superficie separada, con plantillas de recepcionista y reserva de citas y una demo de voz que permaneció apagada y sin interacción.
- **Knowledge Base:** mostraba 2 de 15 espacios usados y dos bases existentes. No se abrió ni leyó su contenido.
- **Agent Templates:** el filtro Conversation AI listaba ejemplos para atención general por texto, calificación de leads, reserva de citas y concierge multicanal. No se instalaron plantillas.
- También aparecen secciones separadas para Agent Logs, AI Usage y Content AI. No se inspeccionaron registros de contactos ni se hicieron llamadas a esos agentes.
- La captura aportada por el usuario y la vista de solo lectura del agente confirman un Conversation AI para Messenger: GPT-4.1 seleccionado en el selector de GHL, una acción `API Call` llamada `DealerAdmin - Contexto de conversación Messenger`, y reglas de prompt para consultar historial/detalles antes de responder, conservar datos ya informados, preguntar una cosa por turno y no prometer ni negociar condiciones de venta. La captura mostraba un aviso de retiro fechado; se registra como texto de esa captura, no como confirmación del estado vigente del modelo. No se copió el prompt ni se abrió la acción para ver endpoint/credenciales.
- El agente estaba en `Auto-Pilot`, con control configurable del tiempo de espera, límite de mensajes, pausa cuando el equipo envía mensajes manuales/workflow, respuesta opcional a imágenes/notas de voz, disclaimer de IA saliente y resumen de conversación. La UI indica que el test integrado no envía mensajes a contactos, pero no se ejecutó.
- Ese agente no tenía Knowledge Base Triggers ni servidores MCP conectados. Por tanto, el contexto conversacional aparece conectado como acción API separada, no como memoria nativa de KB en esta configuración. El detalle y funcionamiento de la acción no se probaron.

La captura confirma que existe una configuración Conversation AI y que la interfaz admite administrar varios agentes; el `Managed Agents 0` observado en Agent Studio solo se refiere a Managed Agents, no a todas las superficies de agentes. La captura no demuestra que la API Call responda correctamente ni que el agente pase pruebas.

## Lectura de la documentación oficial de GHL

- [AI Tools in HighLevel](https://help.gohighlevel.com/support/solutions/articles/155000002166-ai-tools-in-highlevel) distingue Conversation AI para conversaciones entrantes, Voice AI para llamadas, Managed Agents para agentes nuevos basados en instrucciones y Agent Studio/Flow Agents para mantener flujos visuales existentes. La guía actual recomienda Managed Agents para crear agentes nuevos; esto es una descripción de GHL, no una decisión para copiar su proveedor o arquitectura.
- [Managed Agent Memory](https://help.gohighlevel.com/support/solutions/articles/155000009131) describe memoria como hechos relevantes y procedimientos, no como transcripción completa automática. Esto difiere de la preferencia BDC OS de recuperar contexto desde la base de conversaciones propia.
- [AI Agent Node](https://help.gohighlevel.com/support/solutions/articles/155000007648) documenta prompts, herramientas, variables, resultados estructurados, búsqueda en KB, búsqueda web, API/MCP y routing. Es una capacidad más amplia que el primer agente sencillo.
- [Voice AI appointment booking](https://help.gohighlevel.com/support/solutions/articles/155000005293-appointment-booking-in-voice-ai) combina disponibilidad/calendarios, recopilación de datos y confirmación durante llamadas. Se mantiene separado de la primera experiencia de texto.

## Orientación preliminar para la futura tarea CRM-07

### Configuración simple para el cliente

La primera versión debe reducir decisiones al mínimo. El dealer puede crear varios agentes independientes y editar solo lo esencial —nombre e instrucciones del agente—, elegir un modelo permitido de OpenAI y prenderlo/apagarlo con un único interruptor. La memoria de conversación se inyecta automáticamente; no se expone como una integración que el cliente tenga que configurar. La base de conocimiento es opcional y se agrega solo si necesita aportar información aprobada que no está en las conversaciones. No hay panel de acciones, API Calls, MCP ni ajustes avanzados en el primer flujo.

### Varios agentes sencillos de Conversation AI

Requisito para CRM-07: usar el patrón sencillo de Conversation AI, permitir varios agentes independientes por dealer y conservar instrucciones/tarea acotadas por agente. No introducir equipos de agentes ni delegación entre ellos en el primer alcance. El primer agente atenderá mensajes entrantes, usará el historial relevante de ese contacto/conversación, recopilará datos faltantes de calificación, resumirá necesidades y podrá solicitar una cita o escalar a un asesor cuando corresponda. Cualquier operación que escriba CRM o envíe mensajes queda fuera de este alcance y requiere diseño y autorización por dealer, consentimiento e idempotencia; no se considera aprobada por esta REA.

### Memoria con datos propios de BDC

Requisito de memoria para CRM-07:

1. Recuperar mensajes y campos CRM mediante acceso de dominio limitado al `dealerId`, contacto y conversación autorizados.
2. Entregar al modelo solo los turnos recientes y/o resumen pertinente para la pregunta actual, con límites de tamaño y fuente identificable.
3. Tratar el texto del cliente y los mensajes recuperados como datos, nunca como instrucciones para saltarse las reglas del agente.
4. Si el historial/CRM no acredita una afirmación, no inventar precio, disponibilidad, características, citas ni promesas; preguntar o escalar.
5. Mantener el contenido completo de la conversación fuera de logs generales; auditar fuente, versión/modelo, resultado y operación sin copiar PII innecesaria.

El contraste estático confirmó que el backend ya tiene un `ConversationHydrator`: lee dealer, último transcript (configurable entre 8 y 12 mensajes), hechos activos y objetivos pendientes. Las consultas filtran `tenant_id` y establecen `app.tenant_id` por transacción; contacto/conversación y hechos se vinculan por tenant. Esto sirve como base técnica de memoria, pero hoy está acoplado al flujo de calificación existente: no demuestra todavía memoria configurable por agente ni recuperación/resumen más largo.

El adapter compatible con OpenAI está cableado al runtime para extracción estructurada; `ConversationAiService` usa los hechos del modelo solo para enriquecer el motor determinístico, que conserva autoridad sobre política y respuesta. No es todavía un agente generativo de respuesta libre ni prueba la selección de modelos OpenAI para agentes cliente. No se encontró módulo de base de conocimiento en el árbol backend inspeccionado; la KB opcional requerirá diseño/implementación propia o una integración aprobada posteriormente.

La tabla/flags existentes cubren sombra y envío del flujo Sofia a nivel tenant, con envío apagado por defecto en el composer. No representan el interruptor sencillo por agente solicitado para CRM-07. Este interruptor debe persistirse por dealer/agente y controlar de forma fail-closed entrada, generación y envío.

### Límites del primer alcance

- Sin sistema multiagente ni selección dinámica de agentes especialistas.
- Sin agente de voz, campañas de marketing, navegación web, generación de imágenes/video ni herramientas externas abiertas.
- Sin afirmar que la memoria elimina todas las alucinaciones.
- Sin acciones API, servidores MCP ni herramientas externas del agente. La base de conocimiento es opcional y solo aporta material aprobado.
- Solo modelos ofrecidos por la API de OpenAI; la selección concreta depende de la prueba local y de las capacidades disponibles al momento de CRM-07.

## Prueba local de conectividad OpenAI

El usuario indicó que la API key ya existe y autorizó probar localmente. La búsqueda silenciosa realizada en el entorno del frontend y sus `.env` habituales no encontró `OPENAI_API_KEY`; su ubicación actual queda por confirmar. **No se ha llamado a OpenAI ni enviado información.** La conectividad/selección de modelo no se requiere para cerrar esta auditoría REA y queda pendiente para una subtarea posterior, con payload sintético y sin mensajes ni datos de clientes. No se invocó una API Call de agente ni MCP.

Si luego se realiza la prueba de conectividad, no implementa CRM-07 y la clave no debe guardarse en archivos rastreados.

## Separación de tareas

| ID | Entrega | Estado |
|---|---|---|
| **REA-04-A · GHL AI agents** | Comparar Managed Agents, Conversation AI, Voice AI, Knowledge Base, plantillas, memoria, logs y usage; contrastar la captura del agente Conversation AI aportada por el usuario. | Avance de solo lectura completado; corregido que Agent Studio reporte cero Managed Agents mientras Conversation AI sí tiene configuración. |
| **REA-04-B · Memoria BDC** | Verificar entidades/consultas persistidas, scoping por dealer y límites de contexto. | Completado por lectura estática; base de memoria existente con alcance limitado al flujo actual. |
| **REA-04-C · OpenAI local** | Verificar disponibilidad de la key existente y solicitar un modelo con datos sintéticos. | Fuera del cierre de esta auditoría; pendiente para subtarea local futura. No se hizo solicitud. |
| **CRM-07 · Asistente Conversacional BDC** | Implementar varios agentes simples con memoria inyectada, KB opcional y un interruptor on/off por agente. | Futuro; no iniciado. Sin acciones API ni MCP. |

# Meta CAPI en producción: auditoría y continuidad

**Fecha de revisión:** 2026-11-21 (America/Bogota)
**Alcance:** backend desplegado en Render; revisión de configuración y estado, sin cambios ni envíos CAPI.
**Estado:** auditoría de consumo completada; reconciliación de dealers pendiente.

## Trabajo realizado el 21 de noviembre

- Se incorporó ADM-06: salud global localmente, con vista protegida en frontend (`f7583e3`) y endpoint protegido en backend (`23368ed`). Existe evidencia visual del entorno Docker en `output/evidence/adm-06-salud-global-docker.png`. El frontend aún no está publicado; el backend sí tiene despliegue productivo. La captura es evidencia histórica del estado local, no una comprobación del Docker Engine en esta revisión.
- Se agregó el directorio de usuarios admin en frontend (`2057a5a`) y su endpoint backend (`be094e0`). El frontend permanece en `main` y el backend en `master`.
- Se revisó el artefacto compilado de frontend y el subárbol compilado `identity` del backend con REA, sin copiar código. REA reportó análisis estático parcial: frontend `ev_d05cf67a714f8bb694e63b8ae6c62f7af0cdd174e8f79d6ea60ef423ab53bb9f`; backend `ev_7860ac46de26a0756da934ef7cf07e56f96dd93b54b4c29ab410b591a2dd922`. La cobertura tiene incógnitas y el backend revisado es solo el módulo `identity`, no el sistema completo.
- La captura de navegador REA (`ev_a94501f06763e945d2abaa7057f994fff3429976f8f263287db3352f0ffe29bc`) fue una navegación a una página de ayuda de GHL, sin captura de DOM, accesibilidad, pantalla ni red; no confirma comportamiento real de BDC OS ni configuración de GHL.
- Se fijó la etapa de compilación de `Dockerfile` a la imagen oficial `node:24.22.1-alpine` y se reconstruyó el servicio frontend con `docker compose --progress quiet up -d --build frontend`. Se comprobó `node --version` en la imagen: `v24.22.1`. Los cinco contenedores Compose quedaron `running/healthy`, con `restarts=0` y `oom=false`; frontend `http://localhost:4173` y backend `/health` respondieron HTTP 200.
- Se revisaron los siete tokens de Render sin revelar valores y se confirmó que el backend productivo actual no los consume por sus nombres individuales; el worker CAPI sigue apagado.

## Resultado ejecutivo

Los siete tokens antiguos responden `is_valid: true` en Meta. Sin embargo, el backend que corre en producción **no está consumiendo los pares individuales de variables de Render**: el módulo compilado carga cero dealers desde su configuración de entorno, `QUALIFICATION_SIGNAL_ENABLED` es `false` y la función que alimenta el worker lista cero dealers.

Por lo tanto, que los tokens sigan siendo válidos en Meta no significa que BDC OS los esté usando. No se enviaron eventos de prueba ni de producción.

## Evidencia revisada

| Comprobación | Resultado | Alcance |
|---|---|---|
| Tokens por dealer en Meta | 7 de 7 con `is_valid: true`; `expires_at` y `data_access_expires_at` devolvieron `0` | Comprueba validez informada por Meta durante esta consulta; no garantiza permisos sobre el dataset ni envío CAPI exitoso. |
| Lectura del objeto dataset | Las siete consultas `GET /{dataset_id}?fields=id` respondieron HTTP 400, código 100 (`Missing Permission`) | Solo prueba lectura del objeto dataset. No se envió `POST /events` ni permite afirmar que el permiso de escritura CAPI falle. |
| Variables del proceso Render | Están presentes los siete pares individuales `META_CAPI_TOKEN_*` / `META_CAPI_DATASET_*` | Se verificó presencia, nunca se imprimieron ni guardaron valores secretos. |
| Respaldo de entorno que entiende el backend | `META_CAPI_DEALERS_JSON` no está presente; el módulo compilado cargó `0` configuraciones | El fallback requiere JSON indexado por UUID del tenant, con `datasetId` y `accessToken`. |
| Credenciales para OAuth de Meta | `META_APP_ID` y `META_APP_SECRET` no están presentes en las variables visibles del servicio | No son necesarias para el resultado de validez obtenido, pero no hay configuración visible de esas variables en este servicio. |
| Worker de señal de calificación | `QUALIFICATION_SIGNAL_ENABLED=false` | `main.ts` inicia el worker únicamente cuando esta bandera es verdadera. |
| Dealers listados para el worker | `public.list_qualification_signal_dealers()` devolvió `0` filas | Es la función que llama el repositorio del worker para iterar dealers. Su definición lee `tenant_processing_routes`. |
| Conteo SQL directo de tenants | Devolvió cero filas visibles y `row_security_active=true` | No se usa como prueba de base vacía; RLS limita esa consulta sin contexto de tenant. |

## Conclusión sobre consumo

En el despliegue revisado, el backend no consume los nombres individuales `META_CAPI_TOKEN_ACTION`, `META_CAPI_TOKEN_ARLINGTON` y sus pares. El cargador actual acepta `META_CAPI_DEALERS_JSON` como respaldo de entorno y el flujo de producción obtiene las credenciales propias de cada tenant desde `public.tenants` (`meta_dataset_id` y `encrypted_meta_access_token`).

Además, el worker está apagado y su función de listado no devuelve dealers. En el estado actual no hay evidencia de que esos siete valores de Render estén participando en envíos de BDC OS.

## Trabajo realizado

- Se consultó la validez de los siete tokens con el endpoint de depuración de Meta. Todos devolvieron `is_valid: true`.
- Se probó lectura de metadatos de cada dataset; Meta respondió código 100, `Missing Permission`.
- Se inspeccionaron los nombres de variables del servicio Render sin revelar valores.
- Se ejecutó el cargador compilado del backend en el servicio; devolvió cero dealers configurados por entorno.
- Se leyó la bandera global del worker y se invocó la misma función de listado usada por el worker; resultado: bandera desactivada y cero dealers.
- No se modificaron Render, la base de datos, el backend ni el frontend. No se copiaron tokens a este repositorio. No se enviaron eventos CAPI ni se ejecutaron pruebas de código.

## Cruce con el PDF anterior de alcance Admin

El PDF anterior tiene corte del 20 de noviembre de 2026. Sus estados históricos y los cambios posteriores quedan separados así:

| Paquete / pendiente anterior | Estado al 21 de noviembre de 2026 |
|---|---|
| ADM-00 a ADM-05 | El PDF anterior los marcó completos al corte del 20 de noviembre. La evolución de overrides de políticas por dealer quedó expresamente planificada aparte y sigue pendiente. |
| ADM-06: salud global | La vista de salud y endpoint protegido se implementaron después: frontend `f7583e3` y backend `23368ed`. Hay evidencia local Docker en `output/evidence/adm-06-salud-global-docker.png`. El frontend todavía no está publicado en producción. |
| Directorio de usuarios admin | Agregado el 21 nov: frontend `2057a5a`, backend `be094e0`. El frontend aún no está publicado. |
| ADM-06: controles, alertas y límites globales | La verificación de salud API/PostgreSQL/Redis está implementada; los controles editables, alertas y límites de plataforma requieren definir responsable, validación y auditoría antes de agregarlos. |
| ADM-07: QA, seguridad y piloto | Sigue como trabajo continuo. El PDF anterior registra suites locales aprobadas; queda pendiente el piloto con sandbox autorizado de proveedor y regresión después de reconciliar la configuración CAPI. No se usó producción para una prueba de envío. |
| Overrides de políticas por dealer | Pendiente como evolución de ADM-05: esquema versionado, overrides aislados por tenant, validación/preview, auditoría y reversión a la base común. |
| SMTP real y `BDC_APP_URL` | El PDF anterior los señala como requisitos de producción para invitaciones. No se verificaron durante la auditoría CAPI de hoy. |
| Cuentas de soporte y permisos | El PDF anterior deja abierta la decisión de si se necesitarán futuros usuarios de soporte además del admin global único. |
| Node 24.22.1 en Docker | Completado hoy: `Dockerfile` fijado a `node:24.22.1-alpine`, servicio frontend reconstruido y versión comprobada en `v24.22.1`. Todos los contenedores quedaron healthy, con cero reinicios. La versión Node del host no se cambió. |

## Alcance y límites de REA

REA revisó estáticamente `dist` del frontend y únicamente `dist/features/identity` del backend. En frontend señaló cobertura semántica parcial y estados desconocidos; en backend también encontró relaciones sin resolver. Esos resultados sirven para orientar lectura del código y rutas a validar, no para afirmar que se observó la ejecución completa. La navegación a una guía de ayuda de GHL tampoco es una prueba de uso real. La investigación REA queda como mapa inicial; se debe continuar con evidencia del producto BDC OS ejecutándose y con la superficie de administración que se quiera comparar.

Se conservaron los límites del plan anterior: no cambiar calificación de leads ni OpenAI y no habilitar escrituras Meta CAPI en producción durante esta etapa.

## Pendiente dentro de esta tarea

1. Investigar por qué `public.list_qualification_signal_dealers()` devuelve cero: revisar las rutas de procesamiento y el estado de migraciones usando el contexto administrativo autorizado y respetando RLS.
2. Identificar los tenants de producción y mapear cada dealer al UUID correcto. Confirmar por dealer, sin leer secretos, si hay dataset, token cifrado, `meta_capi_enabled` y `qualification_signal_enabled`.
3. Determinar si el error de lectura del dataset es solo falta de permiso para leer el objeto o si también falta acceso operativo para CAPI. La respuesta actual no valida un envío.
4. Acordar cuál es la fuente de verdad para las credenciales. El backend actual está diseñado para credenciales cifradas por tenant en producción; los pares individuales de Render no están conectados al cargador.
5. No retirar las variables antiguas de Render hasta comprobar que ningún otro servicio o proceso aún las consume.

## Siguiente tarea recomendada: reconciliar Meta CAPI por tenant

1. Hacer una auditoría de solo lectura de `tenant_processing_routes` y `tenants` con contexto administrativo correcto. Entregar una matriz de dealer, UUID y banderas de configuración; nunca incluir tokens.
2. Reconciliar los siete pares de Render con esos UUID y datasets. Resolver explícitamente cualquier par compartido o dealer que no tenga correspondencia.
3. Usar el mecanismo seguro de configuración del backend para guardar cada token cifrado en el tenant correspondiente. Si todavía no existe un flujo administrativo productivo disponible, definir primero una operación controlada y auditable; no introducir un fallback permanente basado en nombres comerciales.
4. Mantener `QUALIFICATION_SIGNAL_ENABLED=false` en producción. Cuando exista un entorno/dataset de prueba, validar un único dealer allí, sin enviar datos reales.
5. Solo después de verificar el mapping, permisos y prueba aislada, preparar una activación gradual por dealer y solicitar autorización explícita antes de habilitar envíos de producción.
6. Retirar los pares antiguos de Render después de confirmar que dejaron de tener consumidores.

En paralelo, publicar el frontend mediante el flujo acordado y validar salud/directorio de admin en el entorno publicado. Mantener como tareas de continuidad ADM-07, SMTP/`BDC_APP_URL`, decisión de cuentas de soporte y overrides de políticas por dealer. Node 24.22.1 ya quedó aplicado y verificado en el stack local.

El backlog priorizado y listo para distribuir —incluye CAPI/Admin, brechas de evidencia REA y módulos CRM aún placeholder— está en [`backlog-rea-distribucion.md`](backlog-rea-distribucion.md). El documento detalla dueños sugeridos, dependencias, criterios de aceptación y el límite de cobertura de REA.

## Referencias de código y Meta

- Backend: `src/modules/control/infrastructure/meta-capi.config.ts` carga `META_CAPI_DEALERS_JSON`.
- Backend: `src/infrastructure/config/env.config.ts` lee `QUALIFICATION_SIGNAL_ENABLED`.
- Backend: `src/main.ts` inicia el worker solo si la bandera global está habilitada.
- Backend: `src/modules/control/infrastructure/persistence/postgres/postgres-qualification-signal.repository.ts` lista dealers, aplica contexto de tenant y selecciona dataset/token.
- Backend: `src/modules/webhooks/infrastructure/persistence/postgres/qualification-signals.migration.ts` define `list_qualification_signal_dealers()` sobre `tenant_processing_routes`.
- Meta Graph API: <https://developers.facebook.com/docs/graph-api/reference/debug_token/?locale=es_LA>

## Límites y seguridad

Esta nota no contiene tokens, IDs completos de datasets, connection strings ni payloads de leads. La respuesta `is_valid` es una observación puntual de Meta; un token válido puede dejar de serlo si se revoca. La auditoría no demuestra que un evento real haya sido recibido por Meta.

## Validación ADM-07 local: 24 de noviembre de 2026

- Se levantó el stack Docker local; los cinco servicios quedaron saludables. Frontend y `/health` del backend respondieron HTTP 200.
- Playwright con Edge validó el directorio de usuarios contra la base local (1 prueba), la salud API/PostgreSQL/Redis y el bloqueo de salud global para rol dealer (2 pruebas), además de navegación Admin/dealer, directorio y cierre de sesión con APIs simuladas (5 pruebas).
- `npm run test` pasó 27 pruebas; `npm run build` pasó. `npm run lint` terminó correctamente con advertencias existentes en `e2e/admin-system-health.spec.ts`, `DealerConfigurationPanel.tsx` y `AdminSystemHealth.tsx`.
- Se corrigieron dos expectativas desactualizadas en `e2e/crm.spec.ts`: el título del directorio es “Usuarios y accesos” y la vuelta al resumen se hace desde la navegación Admin.
- Evidencia local: `output/evidence/adm-06-salud-global-docker-2026-11-24.png` y `output/evidence/adm-07-directorio-usuarios-docker-2026-11-24.png`.
- Esta validación fue solo local. No se publicó ni verificó el frontend en producción, no se leyó configuración secreta y no se modificó ni probó el envío de Meta CAPI en producción.

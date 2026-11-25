# Avance P0 local - 25 de noviembre de 2026

## Alcance

Se usó el plan del 24 de noviembre para priorizar CAPI-01 y REA-01. La instrucción operativa del usuario es que todo el trabajo y todas las pruebas de esta etapa sean locales; por eso no se consultaron servicios productivos, no se validaron SHA publicados y no se hicieron cambios de despliegue.

## CAPI-01

- Revisión del recorrido de configuración y entrega en el backend local. La configuración de entorno se indexa por UUID de tenant; el envío persistido usa `meta_dataset_id` y `encrypted_meta_access_token` y el worker descifra el token justo antes de llamar al proveedor.
- Se encontró y corrigió un bypass: `META_CAPI_DEALERS_JSON` podía hacer que `claimNextCapiEvent` reclamara un evento aunque `meta_capi_enabled=false`. Ahora la bandera del tenant es obligatoria para ambas fuentes de credenciales.
- Se añadió una prueba regresiva con dataset/token sintéticos. Backend compilado y 10 pruebas focalizadas aprobadas: guard de tenant, configuración por tenant, carga de rutas bajo RLS y errores 400/403 del proveedor simulados sin HTTP, con comprobación de redacción del token.
- En el Docker local, la función `list_qualification_signal_dealers()` devolvió 2 filas, `list_tenant_route_ids()` devolvió 2 y el rol de aplicación vio 2 tenants. Ninguno tiene CAPI habilitado, dataset ni credencial cifrada; uno tiene `qualification_signal_enabled=true`. El worker figura apagado y `META_CAPI_DEALERS_JSON` no está presente. Solo se reportan conteos y presencia.

Matriz anonimizada del Docker local (los alias son temporales y no corresponden al mapa comercial):

| Tenant local | Nombre presente | CAPI activo | Dataset presente | Credencial cifrada presente | Señal de calificación activa |
|---|---:|---:|---:|---:|---:|
| local-1 | No | No | No | No | Sí |
| local-2 | Sí | No | No | No | No |

- El mapeo operativo por tenant y la presencia cifrada de credenciales siguen pendientes de una fuente local autorizada. Esta revisión no reconcilia aliases ni valores de producción.
- Commits locales del backend: `0edcc87` (respeta el flag CAPI por tenant) y `a56e613` (errores del provider cubiertos con stubs). No se publicaron.

## REA-01 y Admin local

- Playwright ejecutó las 12 E2E locales: salud de API/PostgreSQL/Redis, directorio de usuarios, auditoría, configuración, navegación Admin/dealer, logout, contactos y denegación de salud global al rol dealer.
- La primera ejecución ocurrió antes de aislar solicitudes externas y no quedó instrumentada para confirmar cero tráfico de terceros; dado que la app incluye Google Fonts, pudo haber repetido solicitudes de fuentes. Se añadió un fixture que permite HTTP(S) solo a `localhost`, `127.0.0.1` y `::1`; la suite completa se repitió y pasó 12/12 con el resto de orígenes abortado antes de enviar la solicitud.
- Los escenarios de usuario/sesión de la suite CRM usan sesiones y respuestas sintéticas interceptadas; los escenarios de salud y directorio usan el backend y PostgreSQL locales. No se usaron contactos reales.
- La suite renovó las capturas locales de auditoría y configuración Admin (`adm-04`/`adm-05`) y las de salud y directorio (`adm-06`/`adm-07`). Se revisaron visualmente; las configuraciones Meta usan datos sintéticos y las credenciales no se muestran.
- REA lanzó Chromium local y capturó DOM y accesibilidad de la pantalla de acceso. El único endpoint de la app observado fue `GET /backend/auth/session`, con respuesta 401; no se obtuvo una sesión Admin/dealer.
- Esa captura también generó dos solicitudes exitosas de fuentes Google (`fonts.googleapis.com` y `fonts.gstatic.com`). El registro muestra que enviaron metadatos estándar de navegador (por ejemplo, `User-Agent` y `Referer` local); no se capturaron cuerpos ni valores de encabezados. No hubo datos de BDC, credenciales ni contactos. Esto incumplió el requisito estricto de mantener toda solicitud en local; no se repetirán capturas de navegador sin bloqueo de red externa.
- REA-01 sigue parcial: E2E local aprobada para roles y vistas; captura REA autenticada y totalmente aislada de red externa pendiente.
- SHA del frontend local revisado: `b19c1d1` (`main`). Esto no afirma qué versión esté publicada.

## Límites que continúan

- No se probó la API de Meta ni se enviaron eventos.
- No se verificó ningún entorno productivo ni se alteraron datos productivos.
- CAPI-01 y REA-01 permanecen parciales: falta completar la matriz con una fuente local autorizada y obtener la captura REA de navegador con evidencia DOM/red sanitizada.
- ADM-07 queda limitado a la validación local. La comprobación de publicación pertenece a la etapa final definida por el usuario.

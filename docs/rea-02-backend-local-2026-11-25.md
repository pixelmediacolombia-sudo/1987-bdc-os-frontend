# REA-02: mapa estático local del backend

**Fecha:** 25 de noviembre de 2026 (America/Bogota)  
**Alcance:** inventario parcial del backend local. Sin ejecución de aplicación, pruebas, llamadas externas ni acceso a producción.

## Identidad y método

- Repositorio local: `C:\dev\1987-bdc-os-backend`, rama `master`, HEAD `a5d7fd8692e442993d236156828dcb758c18a524` (`test: clean local WhatsApp CAPI fixture`).
- Artefacto inspeccionado: `C:\dev\1987-bdc-os-backend\dist`, identidad REA SHA-256 `e970bee0e4765ab55a2387ac69cc435752fe2f0fee8cae504ee7f8060714e89d`.
- La carpeta contenía 240 archivos `.js`; el inventario REA reportó 720 archivos relevantes y 480 fuentes JavaScript. Se analizaron estáticamente 63 archivos seleccionados en cinco grupos: webhooks, control, memory/Meta, rutas y composición HTTP, y arranque/configuración. REA trató JavaScript como texto inerte; no arrancó el servidor ni ejecutó bootstrap.
- El primer análisis encontró indicios de artefactos residuales en el `dist` existente. Para separar evidencia vigente, se compiló `src` localmente a `C:\dev\1987-bdc-os-frontend\tmp\rea02-backend-clean-dist`, sin escribir en el `dist` existente. `tsc` terminó con código 0. La salida limpia contiene 179 `.js`; coincide con los archivos de `src` y no agrega rutas. El `dist` existente tiene 240 `.js`: 61 solo aparecen allí y ninguno solo en la salida limpia. De los archivos con la misma ruta, solo `modules/control/application/shared-dealer-whatsapp.local.e2e.test.js` difiere; la salida nueva incluye la limpieza del tenant en `finally` incorporada en HEAD.
- Artefacto limpio analizado por REA: SHA-256 `b533a4d4fdbd4c1017e7f537b5d7893d714cae04c606ae1b07da24a417dc4dea`. El código fuente tiene 179 `.ts`: 124 archivos de implementación y 55 archivos de prueba. Se analizaron los 124 archivos de implementación en nueve selecciones que cubren arranque, configuración, rutas, identidad, decisiones, IA, medios, seguridad, webhooks, control, memoria, Meta, persistencia y diagnósticos. Las pruebas compiladas no se ejecutaron ni se incluyeron en el mapa de runtime. Evidencias limpias: `ev_8635251854fd7eed565271efc1fb552a6368cfbd552086c6260ff91bcbc3e2ea`, `ev_7bcb1954820cdb1f01a6ef05de9b8234b06cf4f0da0ce26d5065e98a51957c07`, `ev_6bfdd0a941183557ed80a5d1646a24ba50e1212e1a940c1db64ba6585fa05f3e`, `ev_eafb21ef6a66980e9d4694d370b4b36860fb26b229cad95088dda8bae6e4de86`, `ev_baa8cf56545ad41c0673d16026b3fce4aaedb6e7bdc81e51ca12f09fdd1c5d6c`, `ev_ad6a440b1c88f02888bb74387c21ef64b71b1ebb4e26eced265db5bd4305db39`, `ev_8c27eef7c2ed28dfcbaf1eafcaa49bd63adfbaff27a092adcff54d35d79b6c20`, `ev_cc63e1d330302d71d02c798ad59bec99a910e1654c4c82457916c5db213dbd13` y `ev_710482cb28b9a8d05b035793fd2fdf99354d7389bcd0c881765e657801968dba`. Los análisis exploratorios del `dist` anterior tienen evidencia separada: `ev_9485b46a3d9fac1ad86d5d94cdf1e7e1c14161295d7b92a41e3855bc3ae46623`, `ev_fe8085f7ef075637c862e46503e04acae9c99549a41870924d8f1ec5abf45ef6`, `ev_23a6db0dfe3eae5347c8cf71bec9e41f6bb53e53e3b3a7285f3fded71ef670ca`, `ev_ed5abe96929e1c8bcba6900a925ef5ebe519107ef813af809a146bf6b87732d6` y `ev_1a265c23835d0ecc0d35552a0918a1527c241ee0ba948c848fb1cf946299f584`.

## Observaciones estáticas

- `main.ts` inicializa configuración, PostgreSQL, Redis, migraciones y `createBackendRuntime`; instala cierre para SIGINT/SIGTERM.
- `create-http-app.ts` monta `/health`, el router de identidad bajo `/auth`, el callback Meta `/oauth/meta/callback`, webhooks Meta bajo `/webhooks/meta`, el dashboard bajo `/mi-dia` y diagnósticos bajo `/internal/admin/diagnostics`. El router `/auth` combina sesión, administración, invitaciones y contactos. El guard de diagnósticos se aplica antes de sus routers internos.
- El router de Meta recibe GET de verificación y POST firmado. El runtime inicia la cola Redis para procesar esos webhooks. El worker de señales de calificación solo se construye e inicia cuando `QUALIFICATION_SIGNAL_ENABLED` está habilitado; el flujo de apagado lo detiene.
- Las rutas de diagnósticos incluyen salud Redis, políticas y conciliación de entregas inciertas. Los controladores se inyectan en la app de arranque.
- Inventario de rutas fuente: sesión (`/auth/login`, `/auth/session`, `/auth/logout`); invitaciones (`/auth/invitations/accept`); Admin (dealers, configuración, conexión Meta, altas/bajas/cambios e invitaciones, usuarios, auditoría y salud); contactos bajo `/auth/contacts`; Meta callback y webhook; dashboard `/mi-dia`; y diagnósticos protegidos para políticas, Redis y conciliación de entregas.
- Arranques de proceso detectados: `burstBuffer.start()` y `webhookQueue.start()` se invocan al componer el runtime; `QualificationSignalWorker` solo inicia si la bandera CAPI está habilitada. El apagado detiene las colas/servicios y el worker opcional. El poller de la cola de ráfaga y el de webhooks usan intervalos Redis; no son servicios separados del proceso.
- El código fuente actual contiene persistencia PostgreSQL para webhooks, señales de calificación, conexiones de mensajería Meta y memoria/hidratación; también hay cola de webhooks y cliente/cola Redis para los flujos correspondientes. Las migraciones aparecen en esos módulos.
- El mapa de persistencia también incluye identidad, sesiones, invitaciones, RLS/rol runtime, auditoría Admin, contactos, decisión/política, estado conversacional, registro y recuperación de entregas, flags tenant y sombras IA. El adaptador de token usa AES-256-GCM; su inclusión estática no implica que se hayan leído credenciales.
- El `dist` conserva archivos compilados GHL (`process-ghl-webhook`, parser, validador y controller) que no tienen contraparte en `src` actual; tampoco se encontró una ruta GHL montada por el runtime fuente. Esto es compatible con residuos de una compilación previa, pero no determina qué ejecuta una imagen o despliegue.

## Límites y discrepancia del artefacto

- Se cubrieron por selección los 124 archivos de implementación TypeScript. REA no analizó los 55 archivos de prueba ni ejecutó ninguno. La extracción semántica mantiene unknowns y fue parcial/truncada; importaciones estáticas no prueban alcanzabilidad, permisos ni ejecución.
- `dist/main.js.map` referencia `../src/main.ts`, pero no incluye `sourcesContent`. La compilación limpia en salida separada confirma el conjunto de rutas compiladas y la diferencia de un archivo, aunque no se comparó semánticamente cada archivo emitido.
- El script `build` del `package.json` ejecuta `tsc` sin limpiar primero `dist`; por eso el árbol existente conserva 61 `.js` adicionales. La identidad SHA `e970bee0e4765ab55a2387ac69cc435752fe2f0fee8cae504ee7f8060714e89d` identifica ese árbol residual; el candidato de compilación limpia tiene su propio SHA y no sustituye ni reinicia el runtime local.
- La comparación con SHA productivo/desplegado queda diferida a la etapa final indicada por el usuario. No se consultó ni modificó ningún sistema productivo.

## Siguiente trabajo local

1. Ampliar el mapa REA desde la salida limpia a los módulos restantes de rutas, workers y persistencia; conservar unknowns cuando haya resolución dinámica.
2. Mantener cualquier validación desplegada para la etapa final. No habilitar el worker CAPI ni enviar eventos.

**Estado REA-02 local:** el mapa estático cubre los 124 archivos de implementación, rutas, workers y persistencia del backend limpio. No se ejecutaron pruebas ni servicios. El contraste con SHA desplegado queda pendiente para la etapa final del usuario.

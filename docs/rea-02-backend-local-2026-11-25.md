# REA-02: mapa estático local del backend

**Fecha:** 25 de noviembre de 2026 (America/Bogota)  
**Alcance:** inventario parcial del backend local. Sin ejecución de aplicación, pruebas, llamadas externas ni acceso a producción.

## Identidad y método

- Repositorio local: `C:\dev\1987-bdc-os-backend`, rama `master`, HEAD `a5d7fd8692e442993d236156828dcb758c18a524` (`test: clean local WhatsApp CAPI fixture`).
- Artefacto inspeccionado: `C:\dev\1987-bdc-os-backend\dist`, identidad REA SHA-256 `e970bee0e4765ab55a2387ac69cc435752fe2f0fee8cae504ee7f8060714e89d`.
- La carpeta contenía 240 archivos `.js`; el inventario REA reportó 720 archivos relevantes y 480 fuentes JavaScript. Se analizaron estáticamente 63 archivos seleccionados en cinco grupos: webhooks, control, memory/Meta, rutas y composición HTTP, y arranque/configuración. REA trató JavaScript como texto inerte; no arrancó el servidor ni ejecutó bootstrap.
- El primer análisis encontró indicios de artefactos residuales en el `dist` existente. Para separar evidencia vigente, se compiló `src` localmente a `C:\dev\1987-bdc-os-frontend\tmp\rea02-backend-clean-dist`, sin escribir en el `dist` existente. `tsc` terminó con código 0. La salida limpia contiene 179 `.js`; coincide con los archivos de `src` y no agrega rutas. El `dist` existente tiene 240 `.js`: 61 solo aparecen allí y ninguno solo en la salida limpia. De los archivos con la misma ruta, solo `modules/control/application/shared-dealer-whatsapp.local.e2e.test.js` difiere; la salida nueva incluye la limpieza del tenant en `finally` incorporada en HEAD.
- Artefacto limpio analizado por REA: SHA-256 `b533a4d4fdbd4c1017e7f537b5d7893d714cae04c606ae1b07da24a417dc4dea`, evidencia `ev_8635251854fd7eed565271efc1fb552a6368cfbd552086c6260ff91bcbc3e2ea`. Se analizaron 30 archivos seleccionados; el inventario contiene 358 fuentes y deja 328 sin examinar. Los análisis exploratorios del `dist` anterior tienen evidencia separada: `ev_9485b46a3d9fac1ad86d5d94cdf1e7e1c14161295d7b92a41e3855bc3ae46623`, `ev_fe8085f7ef075637c862e46503e04acae9c99549a41870924d8f1ec5abf45ef6`, `ev_23a6db0dfe3eae5347c8cf71bec9e41f6bb53e53e3b3a7285f3fded71ef670ca`, `ev_ed5abe96929e1c8bcba6900a925ef5ebe519107ef813af809a146bf6b87732d6` y `ev_1a265c23835d0ecc0d35552a0918a1527c241ee0ba948c848fb1cf946299f584`.

## Observaciones estáticas

- `main.ts` inicializa configuración, PostgreSQL, Redis, migraciones y `createBackendRuntime`; instala cierre para SIGINT/SIGTERM.
- `create-http-app.ts` monta `/health`, el router de identidad bajo `/auth`, el callback Meta `/oauth/meta/callback`, webhooks Meta bajo `/webhooks/meta`, el dashboard bajo `/mi-dia` y diagnósticos bajo `/internal/admin/diagnostics`. El router `/auth` combina sesión, administración, invitaciones y contactos. El guard de diagnósticos se aplica antes de sus routers internos.
- El router de Meta recibe GET de verificación y POST firmado. El runtime inicia la cola Redis para procesar esos webhooks. El worker de señales de calificación solo se construye e inicia cuando `QUALIFICATION_SIGNAL_ENABLED` está habilitado; el flujo de apagado lo detiene.
- Las rutas de diagnósticos incluyen salud Redis, políticas y conciliación de entregas inciertas. Los controladores se inyectan en la app de arranque.
- El código fuente actual contiene persistencia PostgreSQL para webhooks, señales de calificación, conexiones de mensajería Meta y memoria/hidratación; también hay cola de webhooks y cliente/cola Redis para los flujos correspondientes. Las migraciones aparecen en esos módulos.
- El `dist` conserva archivos compilados GHL (`process-ghl-webhook`, parser, validador y controller) que no tienen contraparte en `src` actual; tampoco se encontró una ruta GHL montada por el runtime fuente. Esto es compatible con residuos de una compilación previa, pero no determina qué ejecuta una imagen o despliegue.

## Límites y discrepancia del artefacto

- La revisión REA sigue siendo selectiva: 30 archivos del artefacto limpio; 328 fuentes no se examinaron. El grafo semántico fue parcial/truncado y no prueba alcanzabilidad, permisos ni ejecución.
- `dist/main.js.map` referencia `../src/main.ts`, pero no incluye `sourcesContent`. La compilación limpia en salida separada confirma el conjunto de rutas compiladas y la diferencia de un archivo, aunque no se comparó semánticamente cada archivo emitido.
- El script `build` del `package.json` ejecuta `tsc` sin limpiar primero `dist`; por eso el árbol existente conserva 61 `.js` adicionales. La identidad SHA `e970bee0e4765ab55a2387ac69cc435752fe2f0fee8cae504ee7f8060714e89d` identifica ese árbol residual; el candidato de compilación limpia tiene su propio SHA y no sustituye ni reinicia el runtime local.
- La comparación con SHA productivo/desplegado queda diferida a la etapa final indicada por el usuario. No se consultó ni modificó ningún sistema productivo.

## Siguiente trabajo local

1. Ampliar el mapa REA desde la salida limpia a los módulos restantes de rutas, workers y persistencia; conservar unknowns cuando haya resolución dinámica.
2. Mantener cualquier validación desplegada para la etapa final. No habilitar el worker CAPI ni enviar eventos.

**Estado REA-02:** avance parcial documentado; se creó y analizó una compilación local limpia, pero el análisis estático de los módulos restantes sigue pendiente. No se ejecutaron pruebas ni servicios.

# BDC OS Frontend

Aplicación CRM de 1987 Marketing & Films en React + TypeScript + Vite. El objetivo es construir, por etapas y según los requerimientos, la experiencia comercial propia de BDC OS: bandeja, contactos, oportunidades, pipelines, automatizaciones, calendario y reportes.

## Desarrollo local

El stack Compose levanta frontend, backend, PostgreSQL 18 y Redis 7. La base y Redis viven en una red privada del proyecto; frontend y API se enlazan solo a `127.0.0.1`.

1. En este directorio, crea la credencial local una sola vez:

       npm run bootstrap:admin

   El comando crea `.env` con el correo de prueba `admin@bdc-os.local`, guarda solo un hash scrypt y muestra una contraseña temporal una vez. Conserva esa contraseña fuera del repositorio.
2. Desde este directorio, levanta los servicios:

       docker compose up -d --build
       docker compose ps

3. Abre <http://localhost:4173>. API: <http://localhost:3000/health>.

La imagen del backend se construye desde el repositorio hermano `../1987-bdc-os-backend`. El esquema de identidad está publicado en la rama `codex/identity-user-foundation` del backend (commit `e566194`); usa esa rama para reconstruir el stack hasta que la migración se integre a la rama principal. El arranque local aplica el esquema y, solo con `NODE_ENV=development`, crea el único admin a partir del hash del `.env`. El admin está guardado en la base local; la pantalla de inicio de sesión queda para una tarea posterior.

El Compose local usa credenciales GHL de marcador porque la versión actual del backend aún exige configuración de GHL. No carga `.env` de producción ni envía mensajes a GHL. En producción se migrará cada flujo según los requerimientos y con pruebas de paridad antes de retirar sus variables. Meta CAPI continúa como conexión directa del backend y sus variables deben conservarse.

## Identidad de usuarios y empresas

`public.app_users` representa cuentas humanas (`admin` o `user`). Un índice único permite como máximo un `admin` global. Los dealers/empresas siguen siendo `public.tenants`; `public.user_tenant_memberships` relaciona usuarios normales con uno o más dealers. El hash de contraseña nunca se guarda en SQL ni en texto plano.

## Verificación

    npm run lint
    npm run test
    npm run test:e2e
    npm run build

Las pruebas e2e requieren que `docker compose up -d` esté activo y Chromium de Playwright instalado (`npx playwright install chromium`). Todos los datos visibles en la primera pantalla son ficticios y las acciones de crear oportunidad se guardan únicamente en memoria del navegador.

## Plan de trabajo inicial

Ver [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md) para las etapas del frontend y la migración progresiva desde GHL.

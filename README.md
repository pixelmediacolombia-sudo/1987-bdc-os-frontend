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

La imagen del backend se construye desde el repositorio hermano `../1987-bdc-os-backend`. El arranque local aplica el esquema y, solo con `NODE_ENV=development`, crea el único admin a partir del hash del `.env`. El login usa una cookie HttpOnly y sesiones revocables.

BDC OS administra los dealers, contactos, conversaciones, mensajes y calificación de leads. Facebook Messenger, Instagram y WhatsApp se conectan mediante la API de Meta; Meta CAPI conserva su configuración independiente por dealer. Para pruebas locales, los endpoints de Meta pueden apuntarse a simuladores HTTP y el stack Compose no usa credenciales de producción.

## Identidad de usuarios y empresas

`public.app_users` representa cuentas humanas (`admin` o `user`). Un índice único permite como máximo un `admin` global. Los dealers/empresas siguen siendo `public.tenants`; `public.user_tenant_memberships` relaciona usuarios normales con uno o más dealers. El hash de contraseña nunca se guarda en SQL ni en texto plano.

El rol `admin` entra al panel global para revisar el directorio, el estado y los usuarios asociados a todos los dealers. El rol `user` entra a la plantilla comercial del dealer con atención de contactos, oportunidades y pipeline. El admin ya puede crear un dealer desde el directorio: BDC OS registra la empresa e invita al responsable por correo para que defina su contraseña.

Las invitaciones son de un solo uso y vencen en 72 horas. En Compose local, el correo queda capturado por Mailpit en <http://localhost:8025>; no sale a una dirección externa. En despliegues, configura `BDC_APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` y `SMTP_FROM_NAME` en el backend. Sin SMTP configurado, el panel presenta un enlace copiable de respaldo.

## Arquitectura del frontend

El código de `src` sigue Onion Architecture. Las dependencias apuntan hacia el dominio; el dominio no importa React, HTTP ni infraestructura.

- `domain/`: entidades, tipos, reglas puras y puertos de repositorio.
- `application/`: casos de uso que coordinan los puertos del dominio.
- `infrastructure/`: adaptadores HTTP, DTOs del backend y datos de demostración.
- `presentation/`: aplicación React, pantallas, formularios y estilos.
- `core/`: composición de dependencias que conecta adaptadores con casos de uso.

La presentación accede al backend mediante los casos de uso exportados por `core/container.ts`. Los contratos HTTP y la conversión de DTOs a modelos de dominio quedan dentro de infraestructura.

## Verificación

    npm run lint
    npm run test
    npm run test:e2e
    npm run build

Las pruebas e2e requieren que `docker compose up -d` esté activo y Chromium de Playwright instalado (`npx playwright install chromium`). Los datos visibles en los paneles son ficticios y las oportunidades creadas en la plantilla dealer se guardan únicamente en memoria del navegador.

## Plan de trabajo inicial

Ver [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md) para las etapas del frontend.

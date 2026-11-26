# Actualización obligatoria de contenedores locales

## Regla de trabajo

Cada cambio de código debe reflejarse de inmediato en el contenedor local del componente afectado, antes de dar la tarea por terminada:

**Recordatorio permanente: después de cada cambio de código, reconstruir y recrear el contenedor afectado antes de continuar.**

- Si cambia `C:\dev\1987-bdc-os-backend`, recompilar el backend y recrear su contenedor local.
- Si cambia `C:\dev\1987-bdc-os-frontend`, generar el build del frontend y recrear su contenedor local.
- Si cambian ambos repositorios, actualizar ambos contenedores.
- No validar la interfaz desde una instancia vieja de Docker ni dejar Vite como sustituto del contenedor actualizado.

## Procedimiento

1. Capturar el estado visual actual antes de cambiar la interfaz.
2. Compilar el componente modificado usando dependencias e imágenes ya disponibles localmente; no descargar imágenes durante el build.
3. Crear la imagen local del componente y recrear solo su servicio, sin reiniciar PostgreSQL, Redis o Mailpit.
4. Esperar el estado `healthy` y consultar la app a través del puerto publicado por Docker.
5. Confirmar que el contenedor usa la imagen recién creada. Si se cambia el código del otro repositorio, repetir los pasos para ese componente.
6. En pruebas automatizadas, inyectar proveedores falsos y no enviar mensajes reales a Meta. La validación de producción queda para la etapa final.

El Compose de desarrollo está en `compose.yaml`. Sus servicios de aplicación son `backend` y `frontend`; PostgreSQL, Redis y Mailpit son dependencias locales y no se recrean para cambios de código de la aplicación.

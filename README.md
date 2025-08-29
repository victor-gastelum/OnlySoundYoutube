# Only Sound Youtube (Opera GX)

Extensión MV3 para Opera GX/Chromium que permite:
- Buscar videos de YouTube y ver miniaturas.
- Reproducir **solo el audio** en segundo plano (no se muestra el video).
- Mantener la reproducción aunque cierres el popup (usa documento `offscreen`).

Importante:
- Se usa el reproductor oficial embebido de YouTube (`/embed` con `enablejsapi=1`). **No** se descarga ni extrae audio. Esto ayuda a cumplir los Términos de Servicio.
- Para “tener sesión iniciada” en YouTube, basta con que tengas iniciada la sesión en `youtube.com` en el navegador. La reproducción usará tus cookies si YouTube lo permite. Si necesitas OAuth para acceder a recursos privados (p. ej., Suscripciones), puedes integrarlo más adelante con `chrome.identity`.

## Requisitos

- Opera GX (o cualquier navegador Chromium compatible con Manifest V3 y `chrome.offscreen`).
- Credenciales de **YouTube Data API v3** (API Key) para la búsqueda:
  1. Ve a Google Cloud Console → APIs & Services → Credentials.
  2. Crea una **API key**.
  3. Habilita la **YouTube Data API v3** para tu proyecto.

## Configuración

1. Clona o copia estos archivos.
2. Edita `src/config.js` y reemplaza:
   ```js
   export const YOUTUBE_API_KEY = "YOUR_YOUTUBE_DATA_API_KEY";
   ```
   por tu API key real.
3. (Opcional) Añade iconos en `icons/` (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`).

## Instalar en Opera GX

1. Abre `opera://extensions`.
2. Activa “Developer mode” (modo desarrollador).
3. Clic en “Load unpacked” y selecciona la carpeta del proyecto.
4. Abre el popup de la extensión, busca, y reproduce.

Si necesitas iniciar sesión:
- Pulsa “Abrir YouTube para iniciar sesión” desde el popup y autentícate en `youtube.com`.

## Cómo funciona el audio sin mostrar video

- Se crea un **documento offscreen** (MV3) que contiene un `<iframe>` del reproductor de YouTube con `enablejsapi=1`.
- El iframe está oculto (0×0), pero el audio se reproduce.
- La extensión controla el reproductor por `postMessage` (`playVideo`, `pauseVideo`, `loadVideoById`, `setVolume`, etc.), sin cargar scripts remotos (cumple CSP MV3).
- El popup envía comandos al offscreen y recibe cambios de estado para sincronizar los controles.

## Limitaciones y cumplimiento

- No se separa el audio del video ni se usan fuentes no oficiales. Esto respeta los Términos de YouTube.
- Algunas restricciones (edad, región, premium) pueden requerir sesión o no permitir reproducción embebida.
- Las cookies de `youtube.com` pueden estar afectadas por políticas de terceros; si algo falla, abre YouTube y comprueba que la sesión está activa.

## Roadmap (opcional)

- Soporte OAuth con `chrome.identity` para búsquedas con cuenta del usuario.
- Cola/playlist, siguiente/anterior.
- Visualización de progreso y seek.
- Modo YouTube Music.

## Problemas comunes

- “Configura tu API Key”: edita `src/config.js`.
- Sin sonido: asegúrate de que el navegador permite autoplay con sonido para iframes de YouTube.
- Sesión no detectada: abre `https://www.youtube.com/` e inicia sesión; vuelve a intentar.


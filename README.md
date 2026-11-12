# SinCalma Studio — landing

Landing inmersiva de SinCalma Studio, estudio de música en Palermo, Buenos Aires.
Sitio estático sin build ni dependencias: HTML, CSS y módulos JavaScript nativos. Las animaciones usan Canvas 2D, Web Animations API y Web Audio.

- **Producción:** https://sincalma-studio.pages.dev (Cloudflare Pages)
- **Carpeta publicada:** `public/`

## Estructura

```
public/
  index.html          markup y SEO (OG, JSON-LD LocalBusiness, sin dirección exacta)
  css/styles.css      tokens, tipografía fluida y todas las secciones
  js/main.js          datos del cliente, armador de WhatsApp, menú y escenas de scroll
  js/fx.js            motor de efectos: reveals, progreso de secciones fijas, grano,
                      semitono, membrana, drone sintetizado y scramble (el scroll es el nativo)
  assets/  fonts/     imágenes del moodboard y fuentes woff2 autoalojadas
  _headers            caché y cabeceras de seguridad para Cloudflare Pages
docs/
  COPY.md             copy deck completo
  CONTENIDO-PENDIENTE.md  checklist de datos y fotos pendientes del cliente
```

## Datos del cliente

Al principio de `public/js/main.js`, en `CONFIG`:

| Dato | Valor actual |
|---|---|
| `whatsapp` | `5491100000000` (placeholder) |
| `instagram` | `sincalmastudio` |
| `openHour` / `closeHour` | 10 / 22 (hora de Buenos Aires) |

Los posts del túnel de Instagram están en `IG_POSTS` (mismo archivo). Hoy son imágenes del moodboard.

## Cómo está armado

- Cada escena larga es una `section.pin` más alta que la pantalla con un hijo `.sticky`. El motor (`fx.createEngine`) escribe el avance del scroll en la variable CSS `--p` y `main.js` se suscribe con `eng.onFrame()` para mover cada escena.
- Las apariciones se declaran en el HTML con `data-in="up|fade|mask|scale|wipe|dots"` (más `data-delay` y `data-dur` opcionales).
- Con `prefers-reduced-motion` no hay loader, zoom ni apariciones; el contenido queda visible.
- Colores: solo la paleta del manual de marca (`--green`, `--royal`, `--dodger`, `--anakiwa`, blanco y negro).

## Desarrollo local

```bash
python -m http.server 5178 --directory public
```

## Deploy

Antes de publicar cambios de CSS o JS, actualizá la versión `?v=` en `index.html` (estilos y `main.js`) y en el `import` de `fx.js` al principio de `main.js`, así ningún navegador mezcla archivos viejos con nuevos.


```bash
npx wrangler pages deploy public --project-name sincalma-studio --branch main
```

## Imagen para compartir y favicons

Las fuentes están en `tools/brand-images/`: `og.html` (1200×630) e `icon.html` se renderizan con Edge/Chrome headless y `icons.py` compone el símbolo S y exporta `og-image-v2.jpg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` e `icon-192/512.png` en `public/`. Para regenerarlas, copiá a esa carpeta las fuentes woff2, `scs-white.svg`, `sym-s.png` y las estrellas de `public/`.

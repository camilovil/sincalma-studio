# SinCalma Studio — landing

Landing inmersiva de SinCalma Studio (estudio musical, Palermo, Buenos Aires).
Sitio estático sin build: HTML + CSS + módulos JS nativos, con los efectos del handoff de diseño portados a Canvas 2D / WAAPI.

- **Producción:** https://sincalma-studio.pages.dev (Cloudflare Pages)
- **Carpeta publicada:** `public/`

## Estructura

```
public/
  index.html          markup y SEO (OG, JSON-LD MusicStudio, sin dirección exacta)
  css/styles.css      tokens, tipografía fluida y todas las secciones
  js/main.js          config del cliente, armador de WhatsApp, menú, escenas de scroll
  js/fx.js            motor de efectos (reveals, grano, halftone, cursor, drone, membrana…)
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
| `instagram` | `sincalma.studio` (placeholder) |
| `openHour` / `closeHour` | 10 / 22 (hora de Buenos Aires) |

Los posts del túnel de Instagram están en `IG_POSTS` (mismo archivo). Hoy son imágenes del moodboard.

## Desarrollo local

```bash
python -m http.server 5178 --directory public
```

## Deploy

```bash
npx wrangler pages deploy public --project-name sincalma-studio --branch main
```

# Forma by Luxx (Offline-First PWA)

Aplicación unificada personal optimizada para **iPhone (iOS Safari / PWA standalone)** con diseño limpio estilo Apple HIG y funcionamiento **100% offline-first** mediante Service Worker y `localStorage`, desplegada en **GitHub Pages** (`https://lucaszucaro5-code.github.io/mini-apps/`).

Ejecuta el protocolo **Sistema Maestro v7.1** a través de 4 pestañas en barra inferior fija:
1. **Home** — Progreso hacia Hito 1 (`70,7 kg` | `84,5 cm` | `15% GC`), tendencia SVG, carga de registro diario, historial pre-sembrado desde el `21/09/2026`, sincronización híbrida en segundo plano con Google Sheets y descarga CSV/JSON.
2. **Gym** — Tracker Torso/Pierna A-B v7.1 con reloj flotante, descansos automáticos (`2 min` / `90 s`), straps solo en espalda, Deadbug 3 series, SportClub Δ, Spotify PKCE/Embed y Google Keep.
3. **NEAT** — Acumulador diario de pasos por actividad, velocidad promedio editable en calle (`3,0–7,5 km/h`) y MTB física en watts (`12–30 km/h`).
4. **Meals** — Calculadora `Crudo ↔ Cocido` (Modo Papa/Unidad Testigo + biblioteca editable), reemplazos parciales (`Turrón ↔ Avena`, etc. + Matriz `v7.1`), extras de fin de semana con balance de déficit semanal, UI de captura por foto (preparada sin conexión Gemini aún) y referencia offline del plan fijo.

Ubicación local oficial: `C:\dev\apps\mini-apps\`

## Estructura del Repositorio

```text
mini-apps/
├── index.html                  # Shell unificada "Forma by Luxx" (Home + Meals + TabBar)
├── styles.css                  # Sistema de diseño Apple HIG Light/Dark
├── app.js                      # Estado local, pre-seed, sync híbrido, calculadoras Home y Meals
├── manifest.json               # Web App Manifest "Forma by Luxx"
├── sw.js                       # Service Worker offline global (forma-luxx-v14)
├── PRODUCT.md                  # Definición duradera del producto
├── DESIGN.md                   # Especificación visual y tokens
├── .impeccable/design.json     # Tokens estructurados
├── icons/                      # Íconos PNG (180/192/512) y SVG de Forma by Luxx
├── neat/                       # Módulo NEAT (embebido en tab NEAT + accesible en /neat/)
├── gym/                        # Módulo Gym Tracker + puente Google Apps Script (apps_script_sync.gs)
└── docs/archive/               # Respaldo histórico
```

## URLs en Producción (GitHub Pages)

- App Principal (**Forma by Luxx**): `https://lucaszucaro5-code.github.io/mini-apps/`
- Acceso directo módulo **Gym**: `https://lucaszucaro5-code.github.io/mini-apps/gym/`
- Acceso directo módulo **NEAT**: `https://lucaszucaro5-code.github.io/mini-apps/neat/`

# Mini Apps Personales (PWA para iPhone)

Colección modular de mini aplicaciones web optimizadas para **iOS Safari** en modo pantalla completa (`Agregar a inicio`), con funcionamiento **100% offline** mediante Service Worker y despliegue continuo en **GitHub Pages** (`https://lucaszucaro5-code.github.io/mini-apps/`).

Ubicación local oficial: `C:\dev\apps\mini-apps\`

## Estructura del Repositorio

```text
mini-apps/
├── index.html                  # Hub / lanzador principal de mini apps
├── manifest.json               # Web App Manifest del Hub
├── sw.js                       # Service Worker global (cachea Hub + todas las mini apps)
├── .nojekyll                   # Evita procesamiento Jekyll en GitHub Pages
├── .gitignore                  # Reglas de exclusión de archivos locales/temporales
├── icons/                      # Íconos PNG (180/192/512) y SVG del Hub
├── neat/
│   ├── index.html              # Calculadora NEAT v7.2 + Registro Diario
│   ├── styles.css              # Estilos modulares de NEAT
│   ├── app.js                  # Lógica de cálculo, acumulador del día y registros diarios
│   ├── manifest.json           # Web App Manifest específico de NEAT
│   └── icons/                  # Íconos PNG (180/192/512) y SVG de NEAT
├── gym/
│   ├── index.html              # Gym Tracker & Keep — Sistema Maestro v7.1
│   ├── apps_script_sync.gs     # Puente Google Apps Script para sincronizar rutina en vivo
│   ├── manifest.json           # Web App Manifest específico de Gym v7.1
│   └── icons/                  # Íconos PNG (180/192/512) y SVG de Gym v7.1
└── docs/
    └── archive/
        └── neat_calculator_base.html  # Respaldo histórico del prototipo base
```

## Cómo agregar una nueva Mini App en el futuro

1. Crear una nueva carpeta en la raíz (ej. `macros/` o `piscina/`), con su propio `index.html`, `manifest.json` e `icons/`.
2. Registrar el Service Worker global desde la nueva app con `navigator.serviceWorker.register('../sw.js', { scope: '../' })`.
3. Añadir sus archivos al arreglo `PRECACHE_URLS` en `sw.js` (y subir el número de `CACHE_NAME`).
4. Agregar la nueva tarjeta al arreglo `MINI_APPS` dentro de `index.html`.

## Despliegue en GitHub Pages

Todo push a la rama `main` de `lucaszucaro5-code/mini-apps` publica automáticamente el sitio en:
- Hub: `https://lucaszucaro5-code.github.io/mini-apps/`
- NEAT: `https://lucaszucaro5-code.github.io/mini-apps/neat/`
- Gym: `https://lucaszucaro5-code.github.io/mini-apps/gym/`

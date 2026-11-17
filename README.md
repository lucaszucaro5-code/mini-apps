# Mini Apps Personales (PWA para iPhone)

Colección modular de mini aplicaciones web optimizadas para **iOS Safari** en modo pantalla completa (`Agregar a inicio`), con funcionamiento **100% offline** mediante Service Worker y despliegue gratuito en **GitHub Pages**.

## Estructura del Repositorio

```text
MiniApps-iPhone/
├── index.html                  # Hub / lanzador principal de mini apps
├── manifest.json               # Web App Manifest del Hub
├── sw.js                       # Service Worker global (cachea Hub + todas las mini apps)
├── .nojekyll                   # Evita procesamiento Jekyll en GitHub Pages
├── icons/                      # Íconos PNG (180/192/512) y SVG del Hub
└── neat/
    ├── index.html              # Calculadora NEAT — Sistema Maestro v7.1
    ├── manifest.json           # Web App Manifest específico de NEAT v7.1
    ├── neat_calculator_base.html # Respaldo del HTML original base
    └── icons/                  # Íconos PNG (180/192/512) y SVG de NEAT v7.1
```

## Cómo agregar una nueva Mini App en el futuro

1. Crear una nueva carpeta en la raíz (ej. `macros/` o `hipertrofia/`), con su propio `index.html`, `manifest.json` e `icons/`.
2. Registrar el Service Worker global desde la nueva app con `navigator.serviceWorker.register('../sw.js', { scope: '../' })`.
3. Añadir sus archivos al arreglo `PRECACHE_URLS` en `sw.js` (y subir `CACHE_NAME` a `miniapps-sm-v2`, etc.).
4. Agregar la nueva tarjeta al arreglo `MINI_APPS` dentro de `index.html`.

## Despliegue gratuito en GitHub Pages

1. Crear un repositorio público en GitHub (por ejemplo `mini-apps`).
2. Subir el contenido de la carpeta `MiniApps-iPhone/` a la rama `main`.
3. Ir a **Settings → Pages → Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/ (root)` → **Save**.
4. En ~1 minuto quedará publicado en `https://<tu-usuario>.github.io/<tu-repo>/` (y la Calculadora NEAT en `https://<tu-usuario>.github.io/<tu-repo>/neat/`).

## Instalación en iPhone (iOS Safari)

1. Abrir **Safari** en el iPhone (no Chrome ni navegador embebido) e ir a `https://<tu-usuario>.github.io/<tu-repo>/neat/` (o a la raíz si querés el Hub).
2. Esperar 2 segundos a que aparezca **`Offline listo`** arriba a la derecha (eso confirma que el Service Worker ya cacheó toda la app).
3. Tocar el botón **Compartir** (cuadrado con flecha hacia arriba) → **Agregar a inicio** → **Agregar**.
4. Abrir el nuevo ícono desde la pantalla de inicio: se ejecutará en **pantalla completa**, guardará automáticamente tu peso y último preset en `localStorage`, y funcionará **sin internet**.

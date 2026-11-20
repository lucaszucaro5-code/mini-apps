# Design System — Forma by Luxx

## Direction & Aesthetic Thesis
**Apple iOS Native Utility (Human Interface Guidelines)**: Superficie limpia, táctica y silenciosa pensada para uso con una sola mano en iPhone (`390px–430px` y hasta `740px` en escritorio), priorizando lectura instantánea con números tabulares y superficies agrupadas iOS en modo claro y oscuro, sin gradientes decorativos, sin glows ni kickers repetitivos sobre títulos.

## Palette Tokens

### Light Mode (Default Day Scene — Cocina / Gimnasio / Calle con luz natural)
- **System Grouped Background (`--bg`):** `#F2F2F7`
- **Secondary Surface / Card (`--surface`):** `#FFFFFF`
- **Tertiary Fill (`--surface-2`):** `#E5E5EA`
- **Quaternary Control Fill (`--surface-3`):** `#F2F2F7`
- **Primary Label (`--label`):** `#1C1C1E`
- **Secondary Label (`--label-2`):** `#636366`
- **Tertiary Label (`--label-3`):** `#8E8E93`
- **Hairline Separator (`--separator`):** `rgba(60, 60, 67, 0.14)`
- **System Tint Primary (`--accent`):** `#007AFF`
- **Health Positive (`--green`):** `#28A745` / tint `#1E8E3E`
- **Warning / Attention (`--amber`):** `#D97706`
- **Critical / Alert (`--red`):** `#D72B21`

### Dark Mode (`prefers-color-scheme: dark` — Noche / Dormitorio / Entreno oscuro)
- **System Grouped Background (`--bg`):** `#000000`
- **Secondary Surface / Card (`--surface`):** `#1C1C1E`
- **Tertiary Fill (`--surface-2`):** `#2C2C2E`
- **Quaternary Control Fill (`--surface-3`):** `#3A3A3C`
- **Primary Label (`--label`):** `#F5F5F7`
- **Secondary Label (`--label-2`):** `#AEAEB2`
- **Tertiary Label (`--label-3`):** `#8E8E93`
- **Hairline Separator (`--separator`):** `rgba(255, 255, 255, 0.14)`
- **System Tint Primary (`--accent`):** `#0A84FF`
- **Health Positive (`--green`):** `#30D158`
- **Warning / Attention (`--amber`):** `#FF9F0A`
- **Critical / Alert (`--red`):** `#FF453A`

## Typography
- **Font Family:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif`
- **Monospace / Measurements:** `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`
- **Numerals:** `font-variant-numeric: tabular-nums` en pesos, gramos, calorías, pasos, fechas y cronómetros.
- **Scale:**
  - Large Title: `28px`, weight `700`, tracking `-0.025em`
  - Section Title: `18px`, weight `700`, tracking `-0.015em`
  - Card Title: `15px`, weight `650`
  - Body / Control: `15px–16px` (`>=16px` en inputs para evitar auto-zoom en iOS Safari)
  - Footnote / Meta: `12px–13px`

## Layout & Spacing
- **Max Shell Width:** `680px` centrado con márgenes laterales `16px`.
- **Navigation Chrome:**
  - Top bar compacto (`Forma by Luxx`, píldora discreta de estado Offline/Sync y acceso a configuración/backup).
  - Bottom Tab Bar fijo con material translúcido (`backdrop-filter: saturate(180%) blur(20px)`), altura `58px + env(safe-area-inset-bottom)`, 4 pestañas equiespaciadas (`Home`, `Gym`, `NEAT`, `Meals`) con íconos SVG de trazo `1.8px` y objetivos táctiles `>= 44×44 pt`.
- **Corner Radii:** `16px` (tarjetas agrupadas), `12px` (campos y sub-tarjetas), `10px` (botones), `999px` (píldoras de estado).
- **Depth:** Separadores hairline de `1px` y sutil sombra difusa en superficies elevadas en Light Mode; contraste tonal puro (`#000000` / `#1C1C1E` / `#2C2C2E`) en Dark Mode.

## Signature Component Patterns
- **`UISegmentedControl` Web:** Fondo `--surface-2`, pill activo `--surface` con sombra sutil `0 1px 3px rgba(0,0,0,0.12)`.
- **Tarjeta Resultado de Balanza (`Meals`):** Cifra protagonista en `32px–36px` tabular (`Pesá X g`), explicación directa debajo (`Descontás Y g · Factor Z`).
- **Barra de Progreso Hito 1 (`Home`):** Barra limpia de trayectoria desde `76,5 kg` hasta `70,7 kg` con marcadores reales y sparkline/curva SVG minimalista.

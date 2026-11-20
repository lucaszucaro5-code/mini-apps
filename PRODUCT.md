# Product — Forma by Luxx

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS modular PWA (GitHub Pages, 100% offline-first vía Service Worker y `localStorage`, con puente híbrido Google Apps Script hacia Google Sheets).

## Users

- **Usuario principal:** Lucas Zúcaro (Pergamino, Buenos Aires, Argentina — `GMT-3`), en ejecución diaria de su plan propio de recomposición corporal (**Protocolo Sistema Maestro v7.1**, objetivo Hito 1: `70,7 kg` | `84,5 cm` cintura | `15% GC`).
- **Contexto de uso:** Smartphone iPhone (iOS Safari instalado en pantalla de inicio como PWA standalone), en cocina (balanza en mano pesando alimentos crudos/cocidos), gimnasio (SportClub con conectividad variable), calle/cinta/bici y escritorio.

## Product Purpose

Centralizar en una sola aplicación móvil offline-first los cuatro pilares diarios de ejecución física y nutricional de Lucas (**Home**, **Gym**, **NEAT** y **Meals**), reemplazando múltiples planillas y calculadoras sueltas sin depender de conexión a internet para operar en el día a día.

## Positioning

A diferencia de apps genéricas de fitness o contadores de calorías pensados para armar dietas variables desde cero, **Forma by Luxx** está diseñada para un protocolo estricto y repetitivo donde el valor diario real está en calibrar gramos en cocina (`Crudo ↔ Cocido` con unidad testigo), calcular descuentos parciales exactos (`Turrón ↔ Avena`), registrar NEAT físico real y entrenar con incrementos reales del gimnasio local, con respaldo híbrido automático a Google Sheets cuando vuelve la conexión.

## Operating Context

- **Plan activo subyacente:** `Sistema Maestro v7.1` (Ancla Semana 1: `2026-09-21` · Semana actual: `Semana 9` · Presupuesto diario congelado: `2.316 kcal | 156,4 g P | 288 g C | ~65 g G | 36 g Fibra`).
- **Offline-first obligatorio:** Toda carga, cálculo, cronómetro, lectura histórica y edición funciona con internet apagado; internet solo se utiliza para sincronizar con Google Sheets, Spotify o buscar actualizaciones de la app.
- **Respaldo blindado:** Bitácora local en `localStorage` compatible con las claves existentes (`sm_neat_v7_2_logs`, `sm_neat_v7_1_state`, `sm_gym_*`), cola de sincronización pendiente hacia Apps Script (`Pesajes, Medidas y Proyección`), y exportación directa a CSV/JSON compatible con Google Sheets / Excel.

## Capabilities and Constraints

- **Barra de navegación inferior fija (4 secciones):** `Home` · `Gym` · `NEAT` · `Meals`.
- **`Home`:** Estado general del día y avance al Hito 1, promedio móvil de 7 días, gráfico de tendencia de peso, carga/edición rápida de peso/cintura/GC%/pasos, historial pre-sembrado desde `21/09/2026`, estado de sync híbrido y exportación de planilla.
- **`Gym`:** Tracker Torso/Pierna A-B con reloj global flotante, descansos automáticos (`2 min` / `90 s`), straps solo en espalda, Deadbug 3 series, SportClub Δ, Spotify PKCE/Embed y exportación Keep.
- **`NEAT`:** Simulador y acumulador diario por actividad (calle con velocidad editable `3,0–7,5 km/h`, cinta inclinada `2–9%`, bicicleta MTB con física en watts `12–30 km/h`, pasos extra).
- **`Meals`:** Calculadora `Crudo ↔ Cocido` con Modo Papa/Unidad Testigo + factores editables, reemplazos parciales/equivalencias (`Turrón ↔ Avena` y matriz completa `v7.1`), sumador de extras de fin de semana con impacto semanal, UI de captura de plato por foto (preparada sin conexión Gemini API todavía) y referencia offline del menú diario.
- **Compatibilidad de rutas:** Mantener accesibles `/neat/` y `/gym/` para marcadores previos de iOS Safari.

## Brand Commitments

- **Nombre visible de la app:** `Forma by Luxx` (`Forma` = verse en forma; `Luxx` = apodo/marca personal de Lucas).
- **Motor / Plan subyacente:** Referenciado discretamente como `Plan activo: Sistema Maestro v7.1`, separando claramente el nombre de la aplicación del protocolo nutricional/deportivo.
- **Identidad visual:** Estética nativa Apple iOS / HIG, sobria, tipografía SF Pro con números tabulares, contraste limpio en modo claro y oscuro, cero estética genérica de plantilla IA.

## Evidence on Hand

- Planilla fuente `Sistema Maestro v7.1` (`1EsijOHzl_EniHCM_MfLyXPrbtJOvKbUdAPUdM_Tm7CA`):
  - `Pesajes, Medidas y Proyección`: 35 registros diarios desde `2026-09-21` (`76,5 kg`) hasta `2026-11-20` (`72,3 kg`).
  - `Alimentación y Equivalencias`: Presupuesto congelado `2.316 kcal`, bloques horarios y matriz de equivalencias isocalóricas.
  - `Rutina Gym, Postura y Cardio`: Protocolo Torso/Pierna A-B v7.1.
- Puente Google Apps Script existente en `C:\dev\apps\mini-apps\gym\apps_script_sync.gs`.
- Módulos existentes `C:\dev\apps\mini-apps\neat\` (v7.2) y `C:\dev\apps\mini-apps\gym\` (v7.1).

## Product Principles

1. **Cero fricción con balanza o barra en mano:** Respuestas directas en gramos, repeticiones o pasos con 1 o 2 toques, sin menús profundos ni flujos burocráticos.
2. **Offline absoluto, sincronización paciente:** Ninguna acción del usuario espera a la red; la nube recibe actualizaciones en segundo plano cuando hay señal.
3. **Números auditables y sin cajas negras:** Toda fórmula (factores crudo/cocido, descuentos de avena, watts MTB, déficit semanal) muestra su cuenta real.
4. **Respaldo en múltiples capas:** Ningún dato histórico vive en un solo lugar (dispositivo + Google Sheets + descarga CSV/JSON en 1 toque).

# Works Jeans · Sistema de diseño de la tienda

Fuente de verdad para workjeans.mx. No aplica al panel de administración.

Generado con la skill ui-ux-pro-max (búsquedas: `--design-system`, `--domain ux`, `--domain color`,
`--domain typography`) y ajustado a la identidad ya existente de la marca.

## Decisión sobre la paleta

La skill propuso una paleta verde esmeralda de ecommerce genérico (`#059669` / `#10B981` / `#EA580C`).
**No se adopta.** Works Jeans ya tiene una identidad construida y reconocible: negro, amarillo de
señalización industrial y mezclilla índigo, con la franja de peligro como elemento propio. Cambiarla
destruiría el reconocimiento sin ganar nada. Lo que sí se toma de la skill son sus reglas
estructurales: contraste, tamaño de objetivos táctiles, escala tipográfica y espaciado.

## Color

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--black` | `#0f0f0f` | Texto principal, fondos de alto contraste | 19.4:1 sobre blanco |
| `--yellow` | `#ffd600` | Acción principal, resaltados | Solo con texto negro (15.6:1) |
| `--yellow-deep` | `#e6c000` | Estado activo y foco | — |
| `--text` | `#1e1e1e` | Cuerpo de texto | 15.8:1 |
| `--muted` | `#5f5f5f` | Texto secundario | 7.0:1 (antes `#6a6a6a`, 5.9:1) |
| `--paper` | `#ffffff` | Fondo | — |
| `--gray` | `#f3f3f3` | Fondo de sección | — |
| `--line-2` | `#cfcfcf` | Bordes | — |
| `--hazard` | franja 45° negro/amarillo | Separador de marca | Decorativo, `aria-hidden` |

Regla: el amarillo nunca lleva texto blanco. El texto sobre amarillo siempre es `--black`.

## Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | Anton | Títulos de sección y encabezados de página |
| Etiqueta | Oswald | Kickers, etiquetas, botones, datos |
| Cuerpo | Inter | Párrafos, listas, formularios |

Las tres viajan como WOFF2 propio, precargadas, con `font-display: swap`. No se añaden pesos nuevos.

**Escala mínima (móvil).** Ningún texto de lectura baja de 15px. Los tamaños por debajo de 14px se
reservan para etiquetas en mayúsculas con espaciado, nunca para frases.

| Token | Móvil | Escritorio |
|---|---|---|
| `--fs-display` | 2.25rem | 3.5rem |
| `--fs-h2` | 1.5rem | 2rem |
| `--fs-body` | 1rem (16px) | 1rem |
| `--fs-small` | 0.9375rem (15px) | 0.875rem |
| `--fs-label` | 0.75rem mayúsculas | 0.75rem mayúsculas |

Interlineado de cuerpo: 1.65. Longitud de línea máxima: 68 caracteres.

## Espaciado

Escala de 4px: 4, 8, 12, 16, 24, 32, 48, 64, 96.
Margen lateral en móvil: 16px fijos. Separación entre secciones: 48px en móvil, 96px en escritorio.

## Objetivos táctiles

- Altura mínima de cualquier control: **44px**. Ancho mínimo: **44px**.
- Separación mínima entre controles vecinos: **8px**.
- Los enlaces del pie y de navegación llevan relleno vertical suficiente para alcanzar 44px aunque el
  texto sea más bajo.

## Movimiento

Transiciones de 150 a 250ms. Nada supera 300ms. Se anima `transform` y `opacity`, nunca `width`,
`height` ni `top`. Todo respeta `prefers-reduced-motion`.

## Reglas que no se rompen

1. Sin emojis como iconos: SVG en línea.
2. Foco visible en todo lo que recibe teclado.
3. Sin desplazamiento horizontal a 390px.
4. Sin estilos escritos dentro del HTML (lo prohíbe la política de contenido).
5. Contraste mínimo 4.5:1 en texto, 3:1 en texto grande.
6. Toda imagen con `width`, `height`, `srcset` y texto alternativo descriptivo.

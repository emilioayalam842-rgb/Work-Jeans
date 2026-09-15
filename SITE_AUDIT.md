# SITE_AUDIT — Works Jeans (workjeans.mx)

Fecha: 15 de septiembre de 2026. Auditoría y corrección sobre el sitio en producción (Railway + Cloudflare).

## 1. Diagnóstico inicial

| Área | Estado encontrado |
| --- | --- |
| Stack | Node 20 + Express 4, HTML/CSS/JS sin framework, datos en JSON sobre volumen `/data` (Railway), imágenes con `sharp`, pagos Stripe Checkout, correo Resend, sesiones `express-session`. Sin base de datos externa ni Supabase. |
| Rutas | Portada estática con SEO inyectado, `/pantalones-de-trabajo`, `/camisas-de-trabajo`, landings y artículos desde `contenido.js`, `/producto/:id`, `/sitemap.xml`, `/feed/google-merchant.xml`, `robots.txt`, panel `/workmapadmin.html` con API `/api/admin/*` protegida por roles. |
| Productos | 6 modelos (3 pantalones, 3 camisas) con variantes talla/largo/color, SKU, stock por almacén, costo, mayoreo. |
| Carrito | `localStorage`, cotización en servidor (`/api/cart/quote`) con promociones y cupones. |
| Checkout | Stripe Checkout (dirección MX, teléfono, cupón) o pedido por WhatsApp. |
| Envíos | **No se calculaba**: Stripe cobraba solo productos y la política decía "se cotiza después". |
| Facturación | Solo RFC, razón social y correo, sin validación. |
| Panel admin | Completo (pedidos, kanban, catálogo, inventario, compras, devoluciones, promociones, reportes, usuarios, MFA, bitácora). |
| SEO | Titles/descriptions únicos, canonicals, JSON-LD (ClothingStore, Product, FAQ, Breadcrumb, Article), sitemap dinámico. **FAQPage de la portada estaba roto** (incluía las tablas de tallas como "pregunta"). `/producto/:id` era la portada con un modal encima. |
| Analytics | Ninguno. |
| Performance | Fuentes locales woff2 con preload y `font-display: swap`, imágenes redimensionadas por el servidor con `srcset`, dimensiones declaradas, gzip. Sin librerías pesadas. |
| Mobile | Correcto en general; desbordamiento horizontal de 4 px por el cajón del carrito. |
| Contenido desactualizado | NOM-017-STPS-2008 (derogada por la 2024), INAI en el aviso de privacidad (extinto desde marzo de 2025), "alta visibilidad" usado como si fuera certificación, "dura cientos de lavadas", "dura más que cualquier otro en el mercado", "una prenda dura entre 8 y 14 meses". |
| Legal | Aviso de privacidad con ley y autoridad anteriores; sin términos y condiciones. |
| Conversión / UX | Hero con la camisa (el producto insignia es el pantalón), 8 enlaces en el menú, "stock inmediato" repetido, tallas como rango ("28 a 50"), cotizador de mayoreo en medio de la portada, envío desconocido hasta después de pagar. |
| Código duplicado | Header y footer copiados en 5 plantillas (index, categoria, pagina, producto, empresas). Aceptado por ahora; ver recomendaciones. |
| Riesgos | Cambios en `cart.js` afectan portada y producto; migraciones de datos al arrancar (descripciones) son idempotentes. |

## 2. Prioridades

**CRITICAL (corregido):** páginas de producto reales con SSR; FAQ JSON-LD inválido; envío invisible hasta después del pago; norma y ley desactualizadas; claims sin prueba y "alta visibilidad" implícita.

**HIGH (corregido):** factura CFDI incompleta; sin validación de stock antes de cobrar; doble clic en checkout; sin página /empresas ni registro de cotizaciones; portada sin jerarquía; sin medición.

**MEDIUM (corregido parcialmente):** header/footer; fichas técnicas; accesibilidad menor (aria-label en cupón); success/cancel sin noindex.

**LOW (pendiente):** reseñas verificadas, comparador de productos, buscador/filtros (6 productos, no prioritario), partials de header/footer, A/B testing.

## 3. Cambios realizados (por fase)

1. **Producto:** `producto.html` + `producto.js`; `/producto/:id` renderiza nombre, precio, galería, disponibilidad, tallas con existencias (agotadas deshabilitadas), Agregar / Comprar ahora, barra fija en móvil, secciones (descripción, características, especificaciones, certificaciones, tallas, cuidados, envíos, cambios, facturación, mayoreo, personalización, relacionados), canonical, Open Graph de producto, Product + BreadcrumbList. Ficha técnica imprimible en `/producto/:id/ficha`. Campos nuevos en el panel (specs, características, cuidados, video, SEO, certificaciones). Modal retirado de la portada.
2. **Carrito / envío / checkout:** zonas por CP en Configuración; `/api/cart/quote` devuelve envío y total; Stripe recibe `shipping_options`; sin tarifa se avisa y no se cobra; validación de stock antes de crear la sesión; botón "Procesando…"; `idempotencyKey`.
3. **Facturación:** RFC (regex), razón social, CP fiscal, régimen y uso de CFDI (catálogos SAT), validados en cliente y servidor; visibles en panel, WhatsApp y Stripe.
4. **Legal/regulatorio:** NOM-017-STPS-2024 con fechas y fuentes DOF; nota de "no certificado" en reflejantes; migración de descripciones; aviso de privacidad con la ley de 2025 y la nueva autoridad; sección de contacto; comentario de revisión jurídica.
5. **Portada:** hero con pantalón y dos CTAs; ticker sin repeticiones; 6 ventajas distintas; sección Empresas; tallas explícitas; FAQ reordenada y schema regenerado; menú de 5 entradas; pie en columnas.
6. **Empresas:** `/empresas` con servicios reales, industrias, cotizador por talla y formulario que guarda leads (`/api/leads`) y avisa por correo; embudo en Panel → Ventas → Cotizaciones.
7. **Medición:** `analytics.js` + `/api/track` (sin datos personales) y paneles de embudo en el dashboard; GA4 opcional con consentimiento.
8. **Seguridad (sesión anterior, mismo día):** traversal, XSS almacenado, límites, usuarios/roles, MFA, bitácora, Cloudflare.

## 4. Archivos modificados o nuevos

Nuevos: `producto.html`, `producto.js`, `ficha.html`, `empresas.html`, `admin-leads.js`, `analytics.js`, `CONTENT_MISSING.md`, `EXTERNAL_ACTIONS.md`, `SITE_AUDIT.md`.
Modificados: `server.js`, `cart.js`, `mayoreo.js`, `cookies.js`, `index.html`, `categoria.html`, `pagina.html`, `contenido.js`, `styles.css`, `workmapadmin.html`, `admin.js`, `admin-reportes.js`, `aviso-de-privacidad.html`, `envios-y-devoluciones.html`, `success.html`, `cancel.html`, `settings.json`, `products.json`, `.gitignore`.

## 5. Pendientes

- Reseñas verificadas (compra real → reseña moderada). No se fabricaron reseñas; la calificación de Google (1 opinión) sigue oculta hasta 5 reseñas.
- Testimonios: sin datos reales no se muestra la sección.
- Sección "Hechos en Monterrey" con fotos de proceso: pendiente de fotografía.
- Términos y condiciones de venta.
- Partials de header/footer para dejar de duplicar HTML en 5 plantillas.
- Buscador y filtros: no prioritario con 6 productos.
- Página de confirmación en `/pedido/confirmado`: hoy es `/success.html` (funciona igual, con `noindex`).
- Emails transaccionales al cliente (confirmación, enviado, entregado): hoy solo se avisa al negocio; el cliente recibe el recibo de Stripe.

## 6. Información que debe proporcionar Works Jeans

Ver `CONTENT_MISSING.md` (fichas técnicas, tarifas de envío, mínimos de mayoreo, fotografía, correo de contacto, razón social, tablas de tallas confirmadas).

## 7. Problemas legales que requieren revisión humana

Ver `EXTERNAL_ACTIONS.md` §7–10: aviso de privacidad (autoridad y plazos bajo la ley de 2025), términos y condiciones, afirmaciones sobre reflejantes, seguimiento de la NOM-017-STPS-2024.

## 8. SEO

Corregido: FAQ schema, canonicals de producto, `/empresas` en sitemap, titles únicos, un H1 por página, breadcrumbs con schema en producto y empresas, `noindex` en success/cancel/ficha/nota.
Pendiente del negocio: pedir indexación en Search Console, Merchant Center, Google Business Profile, reseñas.

## 9. Performance

Sin cambios de fondo: fuentes locales con preload, imágenes redimensionadas/WebP con `srcset`, `width/height` declarados, sin librerías externas, gzip y caché de imágenes de 30 días. Recomendación: medir Core Web Vitals reales en PageSpeed Insights tras publicar y revisar el LCP del hero (imagen de 800 px con `fetchpriority=high`).

## 10. UX

Corregido: jerarquía de portada, menú, tallas explícitas, envío visible, factura completa, CTA en móvil, estados "Procesando…", errores amigables en checkout. Pendiente: fotografía real, testimonios.

## 11. Recomendaciones futuras

1. Fotografía propia (mayor impacto en conversión).
2. Capturar fichas técnicas y tarifas de envío en el panel.
3. Reseñas verificadas vinculadas a pedidos.
4. Emails transaccionales al cliente.
5. Partials de plantillas y pruebas automáticas mínimas (rutas, quote, checkout).
6. Con más productos: buscador y filtros por tipo, color, reflejante, talla y precio.

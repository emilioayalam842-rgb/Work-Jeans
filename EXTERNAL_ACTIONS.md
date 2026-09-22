# EXTERNAL_ACTIONS — acciones fuera del código

Cosas que el sitio ya está preparado para aprovechar, pero que requieren cuentas, decisiones o trabajo humano.

## Pagos y correo (bloquean ventas)

1. **Openpay (pasarela elegida):** en el dashboard de Openpay → Configuración → Credenciales, copiar **ID** y **Llave privada** (primero las de *sandbox*). En Railway → works-jeans → web → Variables: `OPENPAY_MERCHANT_ID`, `OPENPAY_PRIVATE_KEY`, `OPENPAY_SANDBOX=true`. Registrar el webhook en Openpay → Configuración → Webhooks con la URL `https://www.workjeans.mx/api/openpay/webhook` (eventos: charge.succeeded, charge.failed, charge.cancelled, charge.refunded); si le pones usuario y contraseña, ponerlos también como `OPENPAY_WEBHOOK_USER` y `OPENPAY_WEBHOOK_PASS`. Al registrarlo Openpay pide un *código de verificación*: aparece en los logs de Railway (`Openpay webhook: código de verificación …`). Probar en sandbox con las tarjetas de prueba de Openpay. Para salir a producción: llaves de producción y `OPENPAY_SANDBOX=false`. Métodos: tarjeta (página segura de Openpay con redirección), SPEI y pago en tienda (`OPENPAY_STORES=false` para ocultarlo).
   *Stripe* sigue soportado como alternativa: `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` con el webhook `https://www.workjeans.mx/api/stripe/webhook`. Si ambos están configurados, la tienda usa Openpay.
2. **Resend:** `RESEND_API_KEY` para recibir avisos de pedidos, cotizaciones, contacto y stock bajo. Para los **correos al cliente** (pedido recibido, enviado, entregado, cancelado, confirmación de cotización) es obligatorio verificar el dominio workjeans.mx en Resend (registros DNS en Cloudflare) y poner `NOTIFY_FROM="Works Jeans <pedidos@workjeans.mx>"`: el remitente de prueba `onboarding@resend.dev` solo entrega al dueño de la cuenta. Configurar el correo de avisos en Panel → Configuración.

## Google

3. **Google Business Profile:** reclamar la ficha "Works jeans", confirmar dirección (Calle Emiliano Zapata 3737, Venustiano Carranza, 64560 Monterrey), horario (lunes a viernes 9:00–18:00), teléfono (956 231 3696) y sitio (https://www.workjeans.mx). Verificar que **no exista una ubicación anterior** en Google Maps ni en Waze; si existe, solicitar su cierre o corrección. Pedir reseñas a clientes reales.
4. **Search Console:** ya está verificado el dominio y enviado el sitemap. Pedir indexación de las URLs nuevas: `/empresas`, `/producto/...` (6), `/articulos/...`, `/guia-de-tallas`, `/ropa-de-trabajo-reflejante`. Límite ~10 solicitudes por día.
5. **Merchant Center:** crear la cuenta, verificar el dominio y registrar el feed `https://www.workjeans.mx/feed/google-merchant.xml` (title, description, image, price, availability, condition, brand y URL ya van en el feed). Requiere política de envíos y devoluciones visibles (ya existen).
6. **Google Analytics 4 (opcional):** crear la propiedad y capturar el ID `G-…` en Panel → Configuración. Solo se carga con consentimiento de cookies. La medición propia del embudo funciona sin GA.

## Fotografía profesional (shooting list)

**Producto (fondo neutro, misma luz para todos):** frente, espalda, perfil, bolsas, cintura/pretina, botón, cierre, costuras, textura de la mezclilla, etiqueta, prenda puesta, uso real. Reflejantes: foto normal, foto con flash, detalle de cinta.
**Fabricación:** máquinas, corte, costura, equipo de trabajo, almacén, empaque.
**Lifestyle:** taller, construcción, planta, logística (personas reales con permiso de imagen).
Nombrar los archivos de forma descriptiva (`pantalon-trabajo-mezclilla-frente.jpg`), subirlos desde el panel (se convierten a WebP y se redimensionan solos).

## Revisión jurídica

7. **Aviso de privacidad:** el texto se actualizó a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares publicada el 20 de marzo de 2025 y a la nueva autoridad (Secretaría Anticorrupción y Buen Gobierno). Un abogado debe confirmar: denominación exacta de la autoridad y del órgano, plazo de respuesta a solicitudes ARCO, razón social del responsable, y si se requiere aviso simplificado en el formulario de contacto y en el cotizador.
8. **Términos y condiciones de venta:** no existen; conviene redactarlos (precios, disponibilidad, tiempos, cambios, personalización sin cambio, jurisdicción).
9. **Reflejantes:** el sitio afirma que las prendas **no** están certificadas (ANSI/ISEA 107 / ISO 20471). Si en el futuro se certifica algún modelo, capturar la certificación en el panel y ajustar los textos.
10. **NOM-017-STPS-2024:** el contenido se actualizó a la norma vigente (DOF 28 de marzo de 2025, en vigor desde el 28 de septiembre de 2025). Revisar periódicamente el DOF por modificaciones.

## Operación

11. **Tarifas de envío:** capturarlas en Panel → Configuración → Envíos por código postal. Hasta entonces el sitio no cobra envío con tarjeta y avisa que se confirma después.
12. **Datos de productos:** ver CONTENT_MISSING.md (fichas técnicas).
13. **Usuarios del panel:** crear un usuario por persona con el rol mínimo (Panel → Usuarios y roles) y activar verificación en dos pasos en la cuenta `admin`.
14. **Respaldos:** descargar un respaldo desde Panel → Configuración → Respaldo antes de cambios grandes; el volumen de Railway guarda los datos, pero no sustituye una copia externa.
15. **Redes sociales:** si hay Instagram/Facebook, usar siempre "Works Jeans" como nombre de marca y enlazarlos desde el sitio (hoy no hay enlaces sociales configurados).

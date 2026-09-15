// Páginas de contenido (landings y artículos) que el servidor renderiza para SEO.
// Cada entrada tiene: título, descripción, encabezado, intro, cuerpo en HTML y, si aplica,
// qué productos mostrar y preguntas frecuentes para el esquema FAQPage.

const PUBLISHED = '2026-09-15';

const LANDINGS = {
  'ropa-de-trabajo-reflejante': {
    kicker: 'Reflejante',
    h1: 'Ropa de trabajo reflejante',
    h1Html: 'Ropa de trabajo<br>reflejante.',
    title: 'Ropa de Trabajo Reflejante: Pantalones y Camisas con Cinta Reflejante | Works Jeans',
    description: 'Pantalones y camisas de mezclilla con cintas reflejantes verde o naranja para vialidades, plantas y turnos de noche. Tallas completas, mayoreo con stock en Monterrey y envíos a todo México.',
    intro: 'Mezclilla resistente con cintas reflejantes cosidas en pecho, mangas y piernas. Para que tu equipo se vea de lejos sin cambiar la ropa que ya aguanta el trabajo.',
    products: (p) => /reflejante/.test(p.id),
    body: `
      <h2>Qué es la ropa reflejante y cuándo ayuda</h2>
      <p>La ropa reflejante lleva cintas retrorreflectantes que devuelven la luz de faros y lámparas hacia su origen. Así, una persona que trabaja de noche, en vialidades, patios de maniobras, plantas con montacargas o zonas con poca luz se distingue a decenas de metros. En México, la NOM-017-STPS-2024 (publicada en el DOF el 28 de marzo de 2025 y vigente desde el 28 de septiembre de 2025, en sustitución de la NOM-017-STPS-2008) obliga al patrón a seleccionar y entregar el equipo de protección personal según los riesgos de cada puesto; en muchos giros la ropa con reflejante forma parte de ese equipo.</p>
      <p><strong>Importante:</strong> nuestras prendas llevan cinta reflejante cosida sobre mezclilla. No son prendas certificadas de alta visibilidad bajo ANSI/ISEA 107 ni ISO 20471. Si el reglamento de tu centro de trabajo exige una prenda certificada, consúltanos antes de comprar.</p>
      <h2>Reflejante sobre mezclilla, no sobre tela delgada</h2>
      <p>Muchos chalecos y camisas reflejantes son de malla o poliéster ligero que se rompe en semanas. Nosotros cosemos las cintas reflejantes sobre mezclilla 100% algodón: la misma tela y las mismas costuras reforzadas de nuestros <a href="/pantalones-de-trabajo">pantalones de trabajo</a> y <a href="/camisas-de-trabajo">camisas de trabajo</a>. La prenda se lava y aguanta como cualquier jean.</p>
      <h2>Dónde va la cinta</h2>
      <p>Camisa: una cinta horizontal en pecho y espalda y una en cada manga. Pantalón: dos cintas horizontales en cada pierna, a la altura de la rodilla y la pantorrilla. El ancho de la cinta y su material se indican en la ficha técnica de cada producto cuando están confirmados.</p>
      <h2>Verde o naranja</h2>
      <p>Ofrecemos cintas en verde lima y naranja. El verde destaca más de día y en fondos oscuros; el naranja se usa mucho en construcción y vialidades. Si tu empresa ya tiene un color definido por su reglamento interno, respétalo; si no, elige el que contraste mejor con el entorno donde trabaja tu gente.</p>
      <h2>Uniformes reflejantes para empresas</h2>
      <p>Surtimos corridas completas de tallas (28 a 50 en pantalón, XCH a 5XG en camisa) con stock inmediato desde Monterrey, y podemos bordar el logotipo de tu empresa. Arma tu pedido en la <a href="/empresas">página para empresas</a> o escríbenos por WhatsApp.</p>
    `,
    faq: [
      ['¿Las cintas reflejantes aguantan el lavado?', 'Son cintas cosidas, no pegadas. Recomendamos lavar al revés, con agua fría y sin cloro para conservar el brillo por más tiempo.'],
      ['¿Estas prendas están certificadas como alta visibilidad?', 'No. Llevan cinta reflejante cosida, pero no cuentan con certificación ANSI/ISEA 107 ni ISO 20471. Si tu empresa exige prenda certificada, consúltanos antes de comprar.'],
      ['¿Puedo combinar camisa y pantalón reflejantes?', 'Sí. Camisa y pantalón reflejantes forman un uniforme completo con cintas en pecho, mangas y piernas.'],
    ],
  },
  'uniformes-industriales-monterrey': {
    kicker: 'Monterrey · Nuevo León',
    h1: 'Uniformes industriales en Monterrey',
    h1Html: 'Uniformes<br>industriales<br>en Monterrey.',
    title: 'Uniformes Industriales en Monterrey: Ropa de Trabajo de Mezclilla | Works Jeans',
    description: 'Fabricante de uniformes industriales en Monterrey: pantalones y camisas de mezclilla para obra, planta y taller, con o sin reflejante. Stock inmediato, mayoreo y bordado con tu logotipo.',
    intro: 'Fabricamos en Monterrey y tenemos tienda en la colonia Venustiano Carranza. Uniformas a tu cuadrilla hoy, sin esperar semanas de producción.',
    products: () => true,
    body: `
      <h2>Ropa de trabajo hecha en Monterrey</h2>
      <p>Works Jeans nació en Monterrey para resolver un problema común en la industria regia: uniformes que se rompen a los dos meses. Confeccionamos pantalones y camisas de mezclilla 100% algodón con costuras reforzadas, pensadas para obra, planta, taller mecánico, patio de carga y campo.</p>
      <h2>Stock inmediato, no pedidos a 6 semanas</h2>
      <p>Mantenemos inventario de todas las tallas en nuestra tienda de Calle Emiliano Zapata 3737, Col. Venustiano Carranza. Puedes pasar a probar la talla, recoger el pedido el mismo día o pedir envío a cualquier parte de Nuevo León y del país.</p>
      <h2>Uniformes con tu logotipo</h2>
      <p>Bordamos o estampamos en DTF el logotipo de tu empresa en camisas y pantalones. Para pedidos de mayoreo armamos la corrida de tallas contigo y te damos precio por volumen. Usa el <a href="/empresas">cotizador</a> o llama al 81 2861 3551.</p>
      <h2>Zonas que atendemos</h2>
      <p>Monterrey, San Nicolás, Guadalupe, Apodaca, Escobedo, Santa Catarina, San Pedro, García, Juárez y toda el área metropolitana, además de envíos por paquetería a todo México.</p>
    `,
    faq: [
      ['¿Tienen tienda física en Monterrey?', 'Sí, en Calle Emiliano Zapata 3737, Col. Venustiano Carranza, Monterrey. Abrimos de lunes a sábado de 9:00 a. m. a 6:00 p. m.'],
      ['¿Cuál es el mínimo para precio de mayoreo?', 'Depende de la prenda; cada producto muestra su precio de mayoreo y la cantidad mínima. Escríbenos y armamos la cotización.'],
    ],
  },
  'mayoreo-ropa-de-trabajo': {
    kicker: 'Mayoreo · Empresas y distribuidores',
    h1: 'Ropa de trabajo por mayoreo',
    h1Html: 'Ropa de trabajo<br>por mayoreo.',
    title: 'Ropa de Trabajo por Mayoreo para Empresas y Distribuidores | Works Jeans',
    description: 'Uniformes de mezclilla por mayoreo con stock inmediato: pantalones y camisas de trabajo, con reflejante y bordado de logotipo. Precios por volumen y envíos a todo México desde Monterrey.',
    intro: 'Surtimos a empresas, contratistas, constructoras y distribuidores. Corridas completas de tallas, precio por volumen y entrega rápida.',
    products: () => true,
    body: `
      <h2>Cómo funciona el mayoreo</h2>
      <p>Armas tu pedido por prenda y talla en el <a href="/empresas">cotizador</a>, lo recibimos por WhatsApp y te confirmamos precio, disponibilidad y fecha de entrega el mismo día. Cada producto publica su precio de mayoreo y la cantidad mínima para aplicarlo; si tu volumen es mayor, cotizamos aparte.</p>
      <h2>Para quién</h2>
      <ul>
        <li><strong>Empresas y contratistas</strong> que uniforman cuadrillas: obra, planta, mantenimiento, logística.</li>
        <li><strong>Distribuidores y tiendas</strong> de ropa de trabajo que quieren mezclilla nacional con stock constante.</li>
        <li><strong>Escuelas técnicas y programas de capacitación</strong> que necesitan uniformes resistentes.</li>
      </ul>
      <h2>Personalización</h2>
      <p>Bordado de logotipo en pecho o espalda, estampado DTF y etiqueta por talla en cada prenda para facilitar el reparto en almacén. Las prendas personalizadas se fabrican sobre pedido.</p>
      <h2>Pago y envío</h2>
      <p>Transferencia, tarjeta o pago en tienda. Enviamos a todo México por paquetería con guía; en Monterrey podemos entregar o puedes recoger en tienda.</p>
    `,
    faq: [
      ['¿Facturan?', 'Sí, emitimos factura CFDI. Indícanos RFC, razón social y correo al hacer el pedido.'],
      ['¿Cuánto tarda un pedido de mayoreo?', 'Si es de inventario, sale en 1 a 2 días hábiles. Con bordado o DTF, normalmente de 5 a 10 días hábiles según el volumen.'],
    ],
  },
  'pantalon-de-mezclilla-para-trabajo': {
    kicker: 'Pantalón de mezclilla · Uso industrial',
    h1: 'Pantalón de mezclilla para trabajo',
    h1Html: 'Pantalón de<br>mezclilla para<br>trabajo.',
    title: 'Pantalón de Mezclilla para Trabajo: Resistente y de Corte Recto | Works Jeans',
    description: 'Pantalón de mezclilla para trabajo 100% algodón, corte recto, cinco bolsas y costuras reforzadas. Tallas 28 a 50, con opción reflejante. Hecho en Monterrey, envíos a todo México.',
    intro: 'El pantalón de mezclilla que sí aguanta el trabajo: tela pesada, remaches, cinco bolsas y tallas hasta la 50.',
    products: (p) => p.category === 'Pantalones',
    body: `
      <h2>Qué hace diferente a un pantalón de mezclilla para trabajo</h2>
      <p>No es el mismo jean de moda con otra etiqueta. Usamos mezclilla de mayor gramaje, doble costura en las zonas que más sufren (tiro, entrepierna, bolsas traseras), remaches en puntos de tensión y acabado preencogido. El corte es recto, con espacio para moverse, agacharse y subir escaleras sin que jale.</p>
      <h2>Tallas reales, del 28 al 50</h2>
      <p>La mayoría de las marcas se detienen en la 40 o 42. Nosotros llegamos a la 50 con el mismo patrón, porque una cuadrilla tiene cuerpos de todos los tamaños. Consulta la <a href="/guia-de-tallas">guía de tallas</a> para elegir bien la primera vez.</p>
      <h2>Con o sin reflejante</h2>
      <p>El mismo pantalón está disponible con cintas reflejantes en las piernas para trabajos de noche o en vialidades. Mira la página de <a href="/ropa-de-trabajo-reflejante">ropa de trabajo reflejante</a>.</p>
      <h2>Cuidado</h2>
      <p>Lava al revés con agua fría, sin cloro, y seca a la sombra. Con esos cuidados la mezclilla conserva el color y las costuras por más tiempo.</p>
    `,
    faq: [
      ['¿El pantalón encoge al lavarlo?', 'No de forma apreciable: la mezclilla viene preencogida. La tolerancia de medidas es de una pulgada.'],
      ['¿Tiene bolsa para herramienta?', 'Lleva cinco bolsas: dos delanteras, dos traseras y una relojera. Si necesitas bolsas especiales para tu equipo, cotízalo por mayoreo.'],
    ],
  },
  'guia-de-tallas': {
    kicker: 'Guía de tallas',
    h1: 'Guía de tallas de ropa de trabajo',
    h1Html: 'Guía de<br>tallas.',
    title: 'Guía de Tallas de Pantalones y Camisas de Trabajo: Cómo Medir | Works Jeans',
    description: 'Cómo elegir la talla correcta de pantalón de trabajo (28 a 50) y camisa (XCH a 5XG): tablas en pulgadas, dónde medir y consejos para uniformar a tu equipo sin cambios.',
    intro: 'Mide una prenda que te quede bien, extendida sobre una mesa, y compárala con las tablas. Tolerancia de una pulgada.',
    products: null,
    body: `
      <h2>Cómo medir una camisa</h2>
      <ul>
        <li><strong>A · Largo:</strong> del punto más alto del hombro (junto al cuello) al borde inferior.</li>
        <li><strong>B · Pecho:</strong> de costura a costura, justo debajo de la axila, con la camisa abotonada y extendida.</li>
        <li><strong>C · Hombros:</strong> de costura a costura por la espalda.</li>
        <li><strong>D · Manga:</strong> de la costura del hombro al borde del puño.</li>
      </ul>
      {{TABLA_CAMISAS}}
      <h2>Cómo medir un pantalón</h2>
      <ul>
        <li><strong>A · Cintura:</strong> con el pantalón abrochado y extendido, mide de lado a lado por la pretina y multiplica por dos.</li>
        <li><strong>B · Cadera:</strong> contorno en la parte más ancha, unos 20 cm abajo de la pretina.</li>
        <li><strong>C · Largo:</strong> de la pretina al borde de la pierna, por el costado.</li>
      </ul>
      {{TABLA_PANTALON}}
      <h2>Consejos para uniformar a un equipo</h2>
      <p>Pide a cada persona su talla de pantalón habitual y su talla de camisa; con eso arma la corrida. Si dudas entre dos tallas, elige la mayor: en trabajo se agradece el espacio para moverse y la prenda no encoge. Para grupos grandes conviene pedir una o dos piezas extra de las tallas más comunes (32 a 36 en pantalón, M a XG en camisa).</p>
      <p>¿Sigues con dudas? Mándanos por WhatsApp las medidas de una prenda que le quede bien a la persona y te decimos la talla.</p>
    `,
    faq: [
      ['¿Las medidas son en pulgadas o centímetros?', 'En pulgadas, como es costumbre en pantalones de mezclilla. Una pulgada equivale a 2.54 cm.'],
      ['¿Qué hago si compré la talla equivocada?', 'Tienes 15 días para cambiar de talla con la prenda sin usar y con etiquetas. Consulta la política de envíos y devoluciones.'],
    ],
  },
};

const ARTICLES = {
  'work-jeans-vs-pantalon-de-mezclilla-normal': {
    kicker: 'Artículo',
    h1: 'Work jeans vs. pantalón de mezclilla normal: en qué se diferencian',
    h1Html: 'Work jeans vs.<br>pantalón normal.',
    title: 'Work Jeans vs. Pantalón de Mezclilla Normal: Diferencias Reales | Works Jeans',
    description: 'Tela, costuras, remaches, corte y precio: las cinco diferencias entre un work jean y un pantalón de mezclilla de moda, y por qué importan cuando trabajas con las manos.',
    intro: 'Los dos son de mezclilla. Ahí termina el parecido.',
    products: (p) => p.category === 'Pantalones',
    body: `
      <h2>1. La tela pesa más</h2>
      <p>Un jean de moda usa mezclilla de 10 a 12 onzas por yarda, muchas veces con elastano para que estire. Un work jean usa mezclilla de 13 a 14 onzas, 100% algodón. Pesa más, protege más contra raspones y tarda mucho más en desgastarse en rodillas y muslos.</p>
      <h2>2. Las costuras son dobles y los remaches, reales</h2>
      <p>En un pantalón de trabajo las costuras del tiro, la entrepierna y las bolsas van dobles, con hilo grueso. Los remaches en las esquinas de las bolsas evitan que se abran cuando cargas herramienta. En un jean de moda muchos remaches son decorativos.</p>
      <h2>3. El corte deja moverse</h2>
      <p>El work jean es recto o ligeramente holgado: te agachas, subes escaleras y te arrodillas sin que jale. Un jean entallado limita el movimiento y revienta las costuras al forzarlo.</p>
      <h2>4. Tallas completas</h2>
      <p>La ropa de trabajo debe existir en 28 y en 50, porque una cuadrilla no viene en un solo tamaño. La mayoría de las marcas de moda no pasan de la 42.</p>
      <h2>5. Precio por uso, no por etiqueta</h2>
      <p>Un work jean cuesta parecido a un jean de marca media, pero dura tres o cuatro veces más en condiciones reales de trabajo. Dividido entre los meses de uso, sale mucho más barato.</p>
      <p>Si lo tuyo es trabajar, mira nuestros <a href="/pantalones-de-trabajo">pantalones de trabajo</a>: mezclilla pesada, costuras dobles y tallas 28 a 50.</p>
    `,
  },
  'ropa-de-trabajo-y-normas-de-seguridad-en-mexico': {
    kicker: 'Artículo',
    h1: 'Ropa de trabajo y normas de seguridad en México: lo que debes saber',
    h1Html: 'Ropa de trabajo<br>y normas de<br>seguridad.',
    title: 'Ropa de Trabajo y Normas de Seguridad en México (NOM-017-STPS) | Works Jeans',
    description: 'Qué exige la NOM-017-STPS-2024 sobre equipo de protección personal, cuándo conviene ropa con reflejante y cómo elegir uniformes que se usen de verdad. Actualizado a la norma vigente desde septiembre de 2025.',
    intro: 'Una guía práctica, sin lenguaje legal, para dueños de negocio y encargados de seguridad.',
    products: (p) => /reflejante/.test(p.id),
    body: `
      <h2>La norma vigente: NOM-017-STPS-2024</h2>
      <p>La Norma Oficial Mexicana NOM-017-STPS-2024, <em>Equipo de protección personal. Selección, uso y manejo en los centros de trabajo</em>, se publicó en el Diario Oficial de la Federación el 28 de marzo de 2025 y entró en vigor el 28 de septiembre de 2025. Sustituye a la NOM-017-STPS-2008, que estuvo vigente desde diciembre de 2008. Obliga al patrón a identificar los riesgos de cada puesto, seleccionar y entregar el equipo de protección personal (EPP) adecuado sin costo para el trabajador, capacitarlo en su uso y llevar registro. La ropa de trabajo forma parte del EPP cuando protege contra un riesgo identificado: abrasión, salpicaduras, baja visibilidad, entre otros.</p>
      <p>Si tu empresa todavía documenta sus procedimientos con la versión 2008, conviene actualizarlos: desde septiembre de 2025 la referencia obligatoria es la de 2024.</p>
      <h2>¿Cuándo conviene ropa con reflejante?</h2>
      <p>Siempre que la persona trabaje cerca de vehículos o maquinaria en movimiento, en vialidades, patios de maniobras, almacenes con montacargas o en turnos nocturnos. México no tiene una NOM específica de alta visibilidad; en la práctica se toman como referencia las normas internacionales ANSI/ISEA 107 y EN ISO 20471, que definen colores y cantidad de material reflejante. Nuestra <a href="/ropa-de-trabajo-reflejante">ropa reflejante</a> usa cintas retrorreflectantes cosidas en pecho, mangas y piernas; no está certificada bajo esas normas, así que si tu reglamento interno exige prenda certificada, revísalo con tu asesor antes de comprar.</p>
      <h2>Ropa de trabajo que sí se usa</h2>
      <p>La norma más estricta no sirve si el trabajador se quita la prenda porque es incómoda o se rompe. Por eso conviene elegir uniformes de algodón que respiren, con corte que deje moverse y que aguanten lavado frecuente. La mezclilla cumple las tres.</p>
      <h2>Lista rápida para el encargado de seguridad</h2>
      <ul>
        <li>Identifica por puesto qué riesgo cubre la ropa: abrasión, visibilidad, ambos.</li>
        <li>Entrega uniforme completo (camisa y pantalón) y registra la entrega.</li>
        <li>Define color de reflejante y logotipo para que todo el equipo sea identificable.</li>
        <li>Programa la reposición según el desgaste real de cada puesto.</li>
      </ul>
      <p>Este artículo es orientativo; para el cumplimiento formal consulta el texto vigente de la norma y a tu asesor en seguridad e higiene.</p>
      <h2>Fuentes</h2>
      <ul>
        <li><a href="https://dof.gob.mx/normasOficiales/9496/stps/stps.html" target="_blank" rel="noopener">DOF: NOM-017-STPS-2024, Equipo de protección personal. Selección, uso y manejo en los centros de trabajo</a></li>
        <li><a href="https://platiica.economia.gob.mx/normalizacion/nom-017-stps-2024/" target="_blank" rel="noopener">Secretaría de Economía: ficha de la NOM-017-STPS-2024</a></li>
      </ul>
    `,
  },
  'como-elegir-talla-de-uniforme-para-tu-cuadrilla': {
    kicker: 'Artículo',
    h1: 'Cómo elegir la talla de uniforme para tu cuadrilla sin equivocarte',
    h1Html: 'Tallas para<br>tu cuadrilla.',
    title: 'Cómo Elegir Tallas de Uniforme para tu Cuadrilla (Método Práctico) | Works Jeans',
    description: 'Método de tres pasos para armar la corrida de tallas de pantalones y camisas de trabajo para un equipo, evitar cambios y tener repuestos. Con tabla de proporción típica.',
    intro: 'Un pedido de 30 uniformes con 8 cambios es un dolor de cabeza. Así se evita.',
    products: () => true,
    body: `
      <h2>Paso 1: pregunta talla de pantalón y de camisa por persona</h2>
      <p>La talla de pantalón (28 a 50) casi todos la saben. La de camisa (XCH a 5XG) no siempre; si dudan, pídeles pecho y hombros de una camisa que les quede bien y compara con la <a href="/guia-de-tallas">guía de tallas</a>.</p>
      <h2>Paso 2: ante la duda, la talla mayor</h2>
      <p>En ropa de trabajo sobra un poco de espacio y no falta. Una prenda justa se rompe antes y estorba al moverse. La mezclilla preencogida no reduce con el lavado, así que no compres "para que encoja".</p>
      <h2>Paso 3: agrega repuestos de las tallas centrales</h2>
      <p>En un equipo típico de 20 personas la distribución suele ser parecida a esta:</p>
      <table class="content-table">
        <thead><tr><th>Pantalón</th><th>Personas</th><th>Camisa</th><th>Personas</th></tr></thead>
        <tbody>
          <tr><td>28–30</td><td>2</td><td>CH</td><td>2</td></tr>
          <tr><td>32–34</td><td>8</td><td>M</td><td>6</td></tr>
          <tr><td>36–38</td><td>6</td><td>G</td><td>7</td></tr>
          <tr><td>40–44</td><td>3</td><td>XG–2XG</td><td>4</td></tr>
          <tr><td>46–50</td><td>1</td><td>3XG–5XG</td><td>1</td></tr>
        </tbody>
      </table>
      <p>Pide una o dos piezas extra de 32, 34 y 36 en pantalón y de M y G en camisa. Cubren nuevas contrataciones y reposiciones sin esperar.</p>
      <h2>Arma el pedido en dos minutos</h2>
      <p>Con la lista lista, captura las cantidades por talla en el <a href="/mayoreo-ropa-de-trabajo">cotizador de mayoreo</a> y envíalo por WhatsApp. Nosotros confirmamos existencias y fecha de entrega el mismo día.</p>
    `,
  },
};

const SIZE_TABLES = {
  camisas: {
    caption: 'Camisas (XCH a 5XG), medidas en pulgadas',
    head: ['Talla', 'Largo (A)', 'Pecho (B)', 'Hombros (C)', 'Manga (D)'],
    rows: [
      ['XCH', '28.8"', '43.1"', '17.4"', '23.7"'], ['CH', '30.5"', '45"', '18.1"', '24.9"'], ['M', '32"', '45.9"', '19.1"', '25.1"'],
      ['G', '33.5"', '48.5"', '20.3"', '25.3"'], ['XG', '34.4"', '50.5"', '22.2"', '26.2"'], ['2XG', '35.2"', '51.8"', '23.2"', '26.3"'],
      ['3XG', '35.6"', '54.3"', '24.2"', '26.4"'], ['4XG', '35.9"', '56"', '25.5"', '27.8"'], ['5XG', '36.1"', '59"', '26.8"', '27.9"'],
    ],
  },
  pantalon: {
    caption: 'Pantalón (28 a 50), medidas en pulgadas',
    head: ['Talla', 'Cintura (A)', 'Cadera (B)', 'Largo (C)'],
    rows: [
      ['28', '29"', '34"', '32"'], ['29', '30"', '35"', '32"'], ['30', '31"', '36"', '32"'], ['32', '33"', '38"', '32"'], ['33', '34"', '39"', '32"'],
      ['34', '35"', '40"', '32"'], ['36', '37"', '42"', '32"'], ['38', '39"', '44"', '32"'], ['40', '41"', '46"', '32"'], ['42', '43"', '48"', '32"'],
      ['44', '45"', '50"', '32"'], ['46', '47"', '52"', '32"'], ['48', '49"', '54"', '32"'], ['50', '51"', '56"', '32"'],
    ],
  },
};

function tableHtml(t) {
  return `<div class="table-scroll"><table class="content-table"><caption>${t.caption}</caption><thead><tr>${t.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

module.exports = { PUBLISHED, LANDINGS, ARTICLES, SIZE_TABLES, tableHtml };

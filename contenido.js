// Páginas de contenido (landings y artículos) que el servidor renderiza para SEO.
// Cada entrada tiene: título, descripción, encabezado, intro, cuerpo en HTML y, si aplica,
// qué productos mostrar y preguntas frecuentes para el esquema FAQPage.

const PUBLISHED = '2026-09-15';

const LANDINGS = {
  'ropa-de-trabajo-reflejante': {
    kicker: 'Reflejante',
    h1: 'Ropa de trabajo reflejante',
    h1Html: 'Ropa de trabajo<br>reflejante.',
    title: 'Ropa de Trabajo Reflejante de Mezclilla | Works Jeans',
    description: 'Pantalones y camisas de mezclilla con cinta reflejante verde o naranja para vialidades, plantas y turnos de noche. Tallas completas y mayoreo en Monterrey.',
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
    title: 'Uniformes Industriales en Monterrey | Works Jeans',
    description: 'Fabricante de uniformes industriales en Monterrey: pantalones y camisas de mezclilla para obra, planta y taller, con stock inmediato y bordado de logotipo.',
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
      ['¿Tienen tienda física en Monterrey?', 'Sí, en Calle Emiliano Zapata 3737, Col. Venustiano Carranza, Monterrey. Abrimos de lunes a viernes de 9:00 a. m. a 6:00 p. m.'],
      ['¿Cuál es el mínimo para precio de mayoreo?', 'Depende de la prenda; cada producto muestra su precio de mayoreo y la cantidad mínima. Escríbenos y armamos la cotización.'],
    ],
  },
  'mayoreo-ropa-de-trabajo': {
    kicker: 'Mayoreo · Empresas y distribuidores',
    h1: 'Ropa de trabajo por mayoreo',
    h1Html: 'Ropa de trabajo<br>por mayoreo.',
    title: 'Ropa de Trabajo por Mayoreo para Empresas | Works Jeans',
    description: 'Uniformes de mezclilla por mayoreo con stock inmediato: pantalones y camisas, con reflejante y bordado. Precio por volumen y envíos desde Monterrey.',
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
    title: 'Pantalón de Mezclilla para Trabajo Resistente | Works Jeans',
    description: 'Pantalón de mezclilla para trabajo 100% algodón, corte recto, cinco bolsas y costuras reforzadas. Tallas 28 a 50, con opción reflejante y envío a México.',
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
      <h2>Dónde se rompe primero un pantalón de trabajo</h2>
      <p>Casi siempre en los mismos cuatro puntos: el tiro, la entrepierna, las rodillas y las esquinas de las bolsas traseras. Ahí es donde la tela se dobla, se estira y roza contra herramienta y superficies. Por eso llevan doble costura y remaches en los puntos de tensión: no hacen la prenda eterna, pero mueven el momento en que aparece el primer desgarre bastante más lejos que en un jean común.</p>
      <h2>Para qué trabajos sirve</h2>
      <p>Funciona para obra, planta, taller mecánico, almacén, patios de maniobras, instalación y mantenimiento. Es decir, trabajo que implica agacharse, cargar y estar de pie. Si tu operación tiene riesgo eléctrico por arco o exposición a fuego, este pantalón no es la prenda indicada: la mezclilla de algodón no es retardante a la flama y no tenemos certificación para eso. En esos casos conviene una prenda certificada y te lo decimos antes de venderte.</p>
      <h2>Cuánto dura y cuándo reponerlo</h2>
      <p>Depende del turno y del trabajo, no hay un número que valga para todos. La señal para reponer es clara: cuando la tela se adelgaza en rodillas o asentaderas y se transparenta, o cuando una costura empieza a abrirse. Rotar dos o tres pantalones por persona alarga el conjunto, porque cada prenda descansa entre lavados en vez de llevar uso y lavado diario. Lo desarrollamos en <a href="/articulos/cuantos-uniformes-necesita-cada-trabajador">cuántos uniformes necesita cada trabajador</a>.</p>
      <h2>Comprar una pieza o la corrida completa</h2>
      <p>Puedes comprar un pantalón para probar tela y talla antes de decidir por todo el equipo. Para cuadrillas armamos la corrida completa con etiquetas por talla, precio por volumen, bordado o DTF con tu logotipo y factura con CFDI. Pide la cotización en el <a href="/empresas">cotizador para empresas</a>.</p>
    `,
    faq: [
      ['¿El pantalón encoge al lavarlo?', 'No de forma apreciable: la mezclilla viene preencogida. La tolerancia de medidas es de una pulgada.'],
      ['¿Tiene bolsa para herramienta?', 'Lleva cinco bolsas: dos delanteras, dos traseras y una relojera. Si necesitas bolsas especiales para tu equipo, cotízalo por mayoreo.'],
      ['¿Sirve para trabajo con riesgo de fuego o arco eléctrico?', 'No. La mezclilla de algodón no es retardante a la flama y no tenemos certificación para ese uso. Para esos puestos se necesita una prenda certificada.'],
      ['¿Aguanta arrodillarse en concreto?', 'Lleva mezclilla 100% algodón con doble costura en las zonas de mayor desgaste. Ninguna tela es eterna sobre concreto, pero aguanta bastante más que un jean de moda.'],
      ['¿Puedo comprar uno solo antes de pedir para mi equipo?', 'Sí. Vendemos desde una pieza justamente para que pruebes tela y talla antes de la corrida completa.'],
      ['¿Qué talla pido?', 'La misma que usas en un jean normal. Si dudas entre dos, la mayor. Las medidas exactas están en la guía de tallas.'],
    ],
  },
  'guia-de-tallas': {
    kicker: 'Guía de tallas',
    h1: 'Guía de tallas de ropa de trabajo',
    h1Html: 'Guía de<br>tallas.',
    title: 'Guía de Tallas de Ropa de Trabajo | Works Jeans',
    description: 'Cómo elegir la talla de pantalón de trabajo (28 a 50) y camisa (XCH a 5XG): tablas en pulgadas, dónde medir y consejos para uniformar a tu equipo.',
    intro: 'Mide una prenda que te quede bien, extendida sobre una mesa, y compárala con las tablas. Tolerancia de una pulgada.',
    products: null,
    body: `
      <div class="size-calc" data-kind="both"></div>
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
      <h2>Por qué medir una prenda y no el cuerpo</h2>
      <p>Medirse encima con una cinta de sastre es incómodo y da números distintos según qué tan apretado se jale la cinta. Medir una prenda que ya queda bien, extendida sobre una mesa, es más exacto y cualquiera lo puede hacer sin ayuda: la prenda no se mueve y la medida se repite igual las veces que quieras. Por eso todas nuestras tablas están hechas sobre prenda extendida y no sobre cuerpo.</p>
      <h2>Qué pasa si quedas entre dos tallas</h2>
      <p>Pide la mayor. Nuestra mezclilla es 100% algodón preencogido: no encoge con el lavado, pero tampoco da de sí como las telas con elastano. En el trabajo la prenda tiene que dejarte agacharte, arrodillarte y subir escaleras, y una talla justa se siente bien en el probador y estorba a media jornada. La única excepción es la camisa de quien la usa fajada todo el día: ahí la talla exacta cae mejor.</p>
      <h2>Tallas grandes</h2>
      <p>Manejamos pantalón hasta la 50 y camisa hasta la 5XG, con el mismo patrón, la misma tela y el mismo acabado que el resto de las tallas. Las medidas de esas tallas están en las mismas tablas de arriba. Si necesitas una corrida con varias tallas grandes, revisa <a href="/ropa-de-trabajo-tallas-grandes">ropa de trabajo en tallas grandes</a>, donde explicamos cómo pedirlas sin errores.</p>
      <h2>Tolerancia de las medidas</h2>
      <p>Las tablas indican una tolerancia de una pulgada. Es normal en prendas confeccionadas: dos piezas de la misma talla pueden variar un poco entre sí sin que ninguna esté mal. Si una prenda se sale de esa tolerancia, escríbenos y la reponemos.</p>
      <h2>Si de todos modos no queda</h2>
      <p>Tienes 15 días naturales para cambiar de talla con la prenda sin usar, sin lavar y con etiquetas. En tienda el cambio no tiene costo; por paquetería el cliente cubre el envío de ida y vuelta. Los detalles están en <a href="/envios-y-devoluciones">envíos y devoluciones</a>.</p>
    `,
    faq: [
      ['¿Las medidas son en pulgadas o centímetros?', 'En pulgadas, como es costumbre en pantalones de mezclilla. Una pulgada equivale a 2.54 cm.'],
      ['¿Qué hago si compré la talla equivocada?', 'Tienes 15 días naturales para cambiar de talla con la prenda sin usar, sin lavar y con etiquetas. En tienda el cambio no tiene costo; por paquetería el cliente cubre el envío de ida y vuelta.'],
      ['¿La ropa encoge después de lavarla?', 'No. La mezclilla viene preencogida, así que la talla que compras es la que conservas. Lava con agua fría y del revés para que además no destiña.'],
      ['¿Mido el cuerpo o una prenda?', 'Una prenda que ya te quede bien, extendida sobre una mesa. Es más exacto que medirse encima y puedes repetir la medida las veces que quieras.'],
      ['¿Qué talla pido si estoy entre dos?', 'La mayor. La mezclilla no da de sí y en el trabajo conviene el espacio para agacharse y moverse.'],
      ['¿Hasta qué talla llegan?', 'Pantalón hasta la 50 y camisa hasta la 5XG, con el mismo patrón y acabado que las demás tallas.'],
    ],
  },
};

const ARTICLES = {
  'work-jeans-vs-pantalon-de-mezclilla-normal': {
    kicker: 'Artículo',
    h1: 'Work jeans vs. pantalón de mezclilla normal: en qué se diferencian',
    h1Html: 'Work jeans vs.<br>pantalón normal.',
    title: 'Work Jeans vs. Pantalón de Mezclilla Normal | Works Jeans',
    description: 'Tela, costuras, remaches, corte y precio: cinco diferencias entre un work jean y un pantalón de mezclilla de moda, y por qué importan al trabajar.',
    intro: 'Los dos son de mezclilla. Ahí termina el parecido.',
    products: (p) => p.category === 'Pantalones',
    body: `
      <h2>1. La tela pesa más</h2>
      <p>Un jean de moda suele usar mezclilla ligera, muchas veces con elastano para que estire. Un work jean usa mezclilla más pesada y 100% algodón: protege mejor contra raspones y tarda más en desgastarse en rodillas y muslos. El peso exacto de cada tela se indica en la ficha técnica del producto cuando está confirmado.</p>
      <h2>2. Las costuras son dobles y los remaches, reales</h2>
      <p>En un pantalón de trabajo las costuras del tiro, la entrepierna y las bolsas van dobles, con hilo grueso. Los remaches en las esquinas de las bolsas evitan que se abran cuando cargas herramienta. En un jean de moda muchos remaches son decorativos.</p>
      <h2>3. El corte deja moverse</h2>
      <p>El work jean es recto o ligeramente holgado: te agachas, subes escaleras y te arrodillas sin que jale. Un jean entallado limita el movimiento y revienta las costuras al forzarlo.</p>
      <h2>4. Tallas completas</h2>
      <p>La ropa de trabajo debe existir en 28 y en 50, porque una cuadrilla no viene en un solo tamaño. La mayoría de las marcas de moda no pasan de la 42.</p>
      <h2>5. Precio por uso, no por etiqueta</h2>
      <p>Un work jean cuesta parecido a un jean de marca media, pero está hecho para aguantar el trabajo diario. Dividido entre los meses de uso real, suele salir más barato que reponer un jean de moda cada pocos meses.</p>
      <p>Si lo tuyo es trabajar, mira nuestros <a href="/pantalones-de-trabajo">pantalones de trabajo</a>: mezclilla 100% algodón, costuras reforzadas y tallas del 28 al 50.</p>
    `,
    faq: [
      ['¿Puedo trabajar con un jean normal?', 'Puedes, pero dura menos. Un jean de moda no lleva las costuras reforzadas ni el corte recto que necesita alguien que se agacha, se arrodilla y carga todo el día; el desgaste aparece primero en tiro, rodillas y bolsas.'],
      ['¿El work jean se siente más rígido al principio?', 'La mezclilla 100% algodón se siente firme los primeros usos y se ablanda con el uso y los lavados. Viene preencogida, así que no te va a encoger después de la primera lavada.'],
      ['¿Qué talla pido si uso jean de moda?', 'La misma que usas normalmente. Si dudas entre dos, elige la mayor: la mezclilla no da de sí y en el trabajo se agradece el espacio. Manejamos del 28 al 50.'],
    ],
  },
  'ropa-de-trabajo-y-normas-de-seguridad-en-mexico': {
    kicker: 'Artículo',
    h1: 'Ropa de trabajo y normas de seguridad en México: lo que debes saber',
    h1Html: 'Ropa de trabajo<br>y normas de<br>seguridad.',
    title: 'Ropa de Trabajo y la NOM-017-STPS | Works Jeans',
    description: 'Qué exige la NOM-017-STPS-2024 sobre equipo de protección personal, cuándo conviene ropa con reflejante y cómo elegir uniformes que sí se usen.',
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
    faq: [
      ['¿La NOM-017-STPS obliga a usar ropa reflejante?', 'La norma obliga al patrón a analizar los riesgos de cada puesto y entregar el equipo de protección que corresponda. En varios giros eso incluye prendas con reflejante, pero la norma no nombra una prenda en concreto: depende del análisis de riesgos de tu centro de trabajo.'],
      ['¿Las prendas de Works Jeans cumplen esa norma?', 'Nuestras prendas llevan cinta reflejante cosida sobre mezclilla, pero no cuentan con certificación ANSI/ISEA 107 ni ISO 20471. Si el reglamento de tu empresa exige una prenda certificada de alta visibilidad, consúltanos antes de comprar.'],
      ['¿Desde cuándo aplica la versión 2024 de la norma?', 'Se publicó en el Diario Oficial de la Federación el 28 de marzo de 2025 y está vigente desde el 28 de septiembre de 2025, en sustitución de la NOM-017-STPS-2008.'],
    ],
  },
  'ropa-reflejante-de-trabajo-cuando-ayuda-y-que-no-es': {
    kicker: 'Artículo',
    h1: 'Ropa reflejante de trabajo: cuándo ayuda y qué no es',
    h1Html: 'Reflejante:<br>qué es y qué no.',
    title: 'Ropa Reflejante: Cuándo Ayuda y Qué No Es | Works Jeans',
    description: 'Diferencia entre una prenda con cinta reflejante y una certificada de alta visibilidad, dónde conviene usarla y qué revisar antes de comprar.',
    intro: 'Una cinta reflejante te hace visible bajo una luz. Una certificación es otra cosa. Conviene saber cuál necesitas.',
    products: (p) => /reflejante/.test(p.id),
    body: `
      <h2>Qué hace una cinta reflejante</h2>
      <p>La cinta retrorreflectante devuelve la luz hacia su origen. Cuando los faros de un montacargas o de un camión iluminan a la persona, la cinta brilla y el conductor la distingue a varios metros. De día, sin una fuente de luz que apunte a la prenda, la cinta casi no se nota: ahí lo que ayuda es el color de la ropa.</p>
      <h2>Prenda con reflejante no es prenda certificada</h2>
      <p>Las normas internacionales de alta visibilidad (ANSI/ISEA 107 en Estados Unidos, ISO 20471 en Europa) exigen una cantidad mínima de material fluorescente y reflejante, colores específicos y pruebas de laboratorio. Una camisa o pantalón con cinta cosida, como los nuestros, mejora la visibilidad pero <strong>no es una prenda certificada</strong> bajo esas normas. Si el reglamento interno de tu planta o el contrato con tu cliente exige certificación, pregúntalo antes de comprar.</p>
      <h2>Qué dice la norma mexicana</h2>
      <p>La NOM-017-STPS-2024, vigente desde el 28 de septiembre de 2025, obliga al patrón a identificar los riesgos de cada puesto y a entregar el equipo de protección que corresponda. No fija una norma propia de alta visibilidad; cada centro de trabajo define en su análisis de riesgos qué necesita. Lee más en <a href="/articulos/ropa-de-trabajo-y-normas-de-seguridad-en-mexico">ropa de trabajo y normas de seguridad</a>.</p>
      <h2>Dónde sí conviene usarla</h2>
      <ul>
        <li>Patios de maniobras, andenes y almacenes con montacargas.</li>
        <li>Vialidades, obra y mantenimiento en la calle, sobre todo al amanecer y al anochecer.</li>
        <li>Turnos nocturnos en planta con zonas de poca luz.</li>
      </ul>
      <h2>Qué revisar al comprar</h2>
      <ul>
        <li>Que la cinta vaya cosida, no pegada: aguanta más lavadas.</li>
        <li>Dónde está colocada: pecho y espalda en camisa; rodilla y pantorrilla en pantalón.</li>
        <li>Que la prenda base aguante el trabajo: de nada sirve la cinta si la tela se rompe en un mes.</li>
        <li>Lavado al revés, con agua fría y sin cloro, para conservar el brillo.</li>
      </ul>
      <p>Nuestra <a href="/ropa-de-trabajo-reflejante">ropa de trabajo reflejante</a> lleva cinta cosida sobre mezclilla 100% algodón, en verde o naranja, con tallas del 28 al 50 en pantalón y de XCH a 5XG en camisa.</p>
    `,
    faq: [
      ['¿La ropa reflejante de Works Jeans está certificada?', 'No. Lleva cinta reflejante cosida, pero no cuenta con certificación ANSI/ISEA 107 ni ISO 20471. Si necesitas prenda certificada, consúltanos antes de comprar.'],
      ['¿Verde o naranja?', 'Ambos reflejan igual bajo una luz. Elige el que contraste más con el entorno de trabajo o el que marque el reglamento interno de tu empresa.'],
    ],
  },
  'camisa-de-mezclilla-o-de-poliester-para-trabajar-en-planta': {
    kicker: 'Artículo',
    h1: 'Camisa de mezclilla o de poliéster para trabajar en planta: cuál conviene',
    h1Html: 'Mezclilla o<br>poliéster.',
    title: 'Camisa de Mezclilla o de Poliéster | Works Jeans',
    description: 'Comparación práctica entre camisas de trabajo de mezclilla de algodón y camisas de poliéster: calor, durabilidad, lavado, personalización y precio por uso.',
    intro: 'Las dos se venden como "camisa de trabajo". Se comportan muy distinto en un turno de ocho horas.',
    products: (p) => p.category === 'Camisas',
    body: `
      <h2>Calor y sudor</h2>
      <p>El algodón absorbe el sudor y deja pasar el aire; el poliéster tiende a retener el calor y a sentirse pegajoso cuando la persona suda. En planta sin clima, en obra o en taller, la gente aguanta mejor la jornada con algodón.</p>
      <h2>Desgaste</h2>
      <p>La mezclilla es un tejido grueso: resiste el roce con mesas, herramienta y superficies ásperas. Las camisas de poliéster delgado se rasgan o se pelan antes con ese mismo uso. A cambio, el poliéster arruga menos y pesa menos.</p>
      <h2>Chispas y calor radiante</h2>
      <p>El poliéster funde con el calor y puede pegarse a la piel; el algodón se chamusca pero no se derrite. Para soldadura o zonas con chispa se requiere ropa específica con tratamiento retardante, que ninguna de las dos es por sí sola, pero entre ambas el algodón es la base más segura.</p>
      <h2>Lavado</h2>
      <p>Ambas se lavan en casa. La mezclilla se lava al revés, con agua fría y sin cloro; puede encoger si no es preencogida. El poliéster seca rápido y no encoge, pero atrapa olores con más facilidad.</p>
      <h2>Personalización</h2>
      <p>Las dos aceptan bordado y estampado DTF. Sobre mezclilla el bordado luce bien y aguanta muchas lavadas; sobre poliéster delgado conviene DTF o bordado con entretela.</p>
      <h2>Precio por uso</h2>
      <p>La camisa de poliéster suele ser más barata al comprarla. Si se repone cada pocos meses, la de mezclilla termina costando menos por turno trabajado. Haz la cuenta con tu ritmo real de reposición.</p>
      <p>Mira nuestras <a href="/camisas-de-trabajo">camisas de trabajo de mezclilla</a>: 100% algodón, con bolsillo frontal, botones reforzados y tallas de XCH a 5XG.</p>
    `,
    faq: [
      ['¿Cuál da menos calor en planta?', 'El algodón. Absorbe el sudor y lo deja evaporar; el poliéster lo retiene contra la piel y en turnos largos se siente más caliente y huele más rápido.'],
      ['¿Cuál aguanta más lavados?', 'La mezclilla. Soporta lavado frecuente y manchas de grasa sin adelgazarse; las camisas de poliéster ligero se rompen antes en hombros, codos y costuras.'],
      ['¿Se puede bordar el logotipo en las dos telas?', 'Sí, pero el bordado asienta mejor sobre mezclilla porque la tela tiene cuerpo. Bordamos o estampamos en DTF en pedidos de mayoreo.'],
    ],
  },
  'bordado-o-dtf-como-poner-tu-logotipo-en-uniformes-de-trabajo': {
    kicker: 'Artículo',
    h1: 'Bordado o DTF: cómo poner tu logotipo en uniformes de trabajo',
    h1Html: 'Bordado<br>o DTF.',
    title: 'Bordado o DTF para Uniformes: Cuál Elegir | Works Jeans',
    description: 'Diferencias entre bordado y estampado DTF para logotipos en camisas y pantalones de trabajo: durabilidad, detalle, colores, ubicación y qué archivo enviar.',
    intro: 'Un logotipo bien puesto identifica a tu equipo y hace que la prenda dure más tiempo "en uniforme". Así se elige la técnica.',
    products: () => true,
    body: `
      <h2>Bordado</h2>
      <p>El logotipo se cose con hilo directamente sobre la prenda. Es la opción más resistente al lavado y al roce, se ve bien sobre mezclilla y transmite un acabado más formal. Funciona mejor con logotipos sencillos, de pocos colores y sin degradados. Los detalles muy finos o letras muy pequeñas pierden definición.</p>
      <h2>Estampado DTF</h2>
      <p>El diseño se imprime en una película y se transfiere con calor. Reproduce degradados, fotografías y muchos colores con detalle, y permite logotipos grandes (por ejemplo, en la espalda). Aguanta el lavado doméstico si se cuida (al revés, agua fría, sin plancha directa), pero con el tiempo y el roce intenso se desgasta antes que un bordado.</p>
      <h2>Dónde colocarlo</h2>
      <ul>
        <li><strong>Camisa:</strong> pecho izquierdo (bordado pequeño), espalda (DTF grande), manga (nombre o área).</li>
        <li><strong>Pantalón:</strong> bolsa trasera o parte baja de la pierna, siempre lejos de las costuras reforzadas y de la cinta reflejante.</li>
      </ul>
      <h2>Qué archivo enviar</h2>
      <p>Para bordado basta el logotipo en buena resolución; para DTF, lo ideal es un archivo vectorial (SVG, AI, PDF) o un PNG grande con fondo transparente. Indica los colores exactos si tu marca los tiene definidos.</p>
      <h2>Cómo se cotiza</h2>
      <p>La personalización se cotiza junto con el pedido, según técnica, tamaño y número de piezas. Arma tu pedido por talla en la <a href="/empresas">página para empresas</a>, elige "Bordado" o "DTF" y te respondemos con el costo por pieza.</p>
    `,
    faq: [
      ['¿Puedo personalizar una sola pieza?', 'La personalización la ofrecemos en pedidos de mayoreo. Si necesitas pocas piezas, escríbenos y revisamos si es viable.'],
      ['¿Las prendas personalizadas tienen cambio?', 'No, salvo defecto de fabricación. Por eso conviene confirmar tallas con la guía antes de personalizar.'],
    ],
  },
  'que-preguntar-antes-de-comprar-ropa-de-trabajo-por-mayoreo': {
    kicker: 'Artículo',
    h1: 'Qué preguntar antes de comprar ropa de trabajo por mayoreo',
    h1Html: 'Antes de comprar<br>por mayoreo.',
    title: 'Qué Preguntar al Comprar Ropa por Mayoreo | Works Jeans',
    description: 'Preguntas para el encargado de compras: tallas, existencias, reposición, factura, envío, personalización y cambios. Evita sorpresas en uniformes.',
    intro: 'Diez preguntas que ahorran semanas de retrasos y cambios de talla.',
    products: () => true,
    body: `
      <h2>1. ¿Qué tallas manejan y con qué patrón?</h2>
      <p>Pide la corrida completa y confirma que todas las tallas usan el mismo patrón. En una cuadrilla siempre hay alguien de 30 y alguien de 48.</p>
      <h2>2. ¿Hay existencia o se fabrica bajo pedido?</h2>
      <p>Cambia el tiempo de entrega por completo. Pregunta cuántas piezas hay en stock por talla y cuánto tarda lo que no está.</p>
      <h2>3. ¿Cuál es el precio de mayoreo y desde cuántas piezas aplica?</h2>
      <p>Debe estar por escrito, por modelo. Pregunta también si el precio se mantiene en reposiciones pequeñas.</p>
      <h2>4. ¿Facturan y con qué datos?</h2>
      <p>Confirma que emiten CFDI y ten a la mano RFC, régimen, código postal fiscal y uso de CFDI para que la factura salga a la primera.</p>
      <h2>5. ¿Cuánto cuesta el envío y quién lo paga?</h2>
      <p>En pedidos grandes el envío suele cotizarse aparte. Pide el costo y el tiempo antes de confirmar.</p>
      <h2>6. ¿Cómo se maneja un cambio de talla?</h2>
      <p>Pregunta plazo, condiciones (sin uso, con etiquetas) y quién paga el envío del cambio. Con prendas personalizadas normalmente no hay cambio.</p>
      <h2>7. ¿Qué personalización ofrecen y en qué tiempo?</h2>
      <p>Bordado y DTF son lo habitual. Pregunta tiempos y qué archivo necesitan de tu logotipo.</p>
      <h2>8. ¿Puedo ver una muestra?</h2>
      <p>Una prenda física evita malentendidos de tela, color y talla antes de comprometer todo el pedido.</p>
      <h2>9. ¿Cómo se identifican las tallas al recibir?</h2>
      <p>Etiqueta visible por prenda y empaque por talla ahorran horas al repartir uniformes.</p>
      <h2>10. ¿Cómo repongo piezas después?</h2>
      <p>Pregunta si puedes reponer tallas sueltas y en cuánto tiempo. La reposición es lo que mantiene uniformado al equipo el resto del año.</p>
      <p>En Works Jeans respondemos estas preguntas en la cotización. Arma tu pedido por talla en la <a href="/empresas">página para empresas</a> y te enviamos todo por escrito.</p>
    `,
    faq: [
      ['¿Qué es lo primero que hay que preguntar?', 'Si hay existencia de todas las tallas hoy y en cuánto tiempo reponen. Un proveedor sin stock te deja a medio uniformar a la cuadrilla.'],
      ['¿Cómo comparo dos cotizaciones que parecen iguales?', 'Pide el precio por talla y confirma si incluye IVA, personalización y envío. Muchas diferencias de precio desaparecen cuando se comparan esos tres puntos.'],
      ['¿Puedo pedir una muestra antes de la corrida completa?', 'Sí. Puedes comprar desde una pieza para revisar tela, costuras y talla antes de pedir para todo el equipo.'],
    ],
  },
  'como-cuidar-la-ropa-de-trabajo-de-mezclilla-para-que-dure-mas': {
    kicker: 'Artículo',
    h1: 'Cómo cuidar la ropa de trabajo de mezclilla para que dure más',
    h1Html: 'Cuidar la<br>mezclilla.',
    title: 'Cómo Cuidar la Ropa de Trabajo de Mezclilla | Works Jeans',
    description: 'Lavado, secado, manchas de grasa, reflejantes y rotación: consejos prácticos para alargar la vida de pantalones y camisas de trabajo de mezclilla.',
    intro: 'La mezclilla aguanta mucho, pero el lavado con cloro y la secadora al máximo la acaban antes de tiempo.',
    products: () => true,
    body: `
      <h2>Lavado</h2>
      <ul>
        <li>Al revés, para proteger el color y las cintas reflejantes.</li>
        <li>Agua fría o tibia; nunca cloro. El cloro decolora y debilita el hilo.</li>
        <li>Cierra botones y cremalleras para que no rocen otras prendas.</li>
        <li>Lava la ropa de trabajo aparte cuando trae grasa o polvo pesado.</li>
      </ul>
      <h2>Manchas de grasa y aceite</h2>
      <p>Aplica jabón líquido para trastes directamente sobre la mancha, frota suave con las yemas de los dedos, deja actuar unos minutos y lava normal. No planches una mancha de grasa: el calor la fija.</p>
      <h2>Secado</h2>
      <p>Lo mejor es a la sombra y colgado por la pretina o los hombros. Si usas secadora, a temperatura baja; el calor alto encoge el algodón y endurece las cintas reflejantes.</p>
      <h2>Reflejantes</h2>
      <p>Las cintas cosidas resisten el lavado doméstico; lo que las apaga es el cloro, la plancha directa y la secadora muy caliente. Si el brillo baja, revisa el proceso de lavado antes de dar la prenda por vencida.</p>
      <h2>Rotación</h2>
      <p>Dos o tres prendas por persona en rotación duran más que una sola usada todos los días: la mezclilla descansa, se lava sin prisa y se seca bien entre turnos.</p>
      <h2>Reparaciones</h2>
      <p>Una costura abierta o un botón flojo se arreglan en minutos si se atienden a tiempo. Deja pasar semanas y el hueco crece hasta que la prenda ya no sirve.</p>
      <p>Cada producto tiene su sección de cuidados en la ficha: revisa los <a href="/pantalones-de-trabajo">pantalones</a> y las <a href="/camisas-de-trabajo">camisas</a> de Works Jeans.</p>
    `,
    faq: [
      ['¿Con qué temperatura conviene lavar?', 'Con agua fría y la prenda del revés. El agua caliente destiñe la mezclilla mucho más rápido y no limpia mejor la grasa.'],
      ['¿Puedo usar cloro?', 'No. Destiñe la mezclilla de forma irregular y daña la cinta reflejante si la prenda la lleva.'],
      ['¿Cómo quito una mancha de grasa?', 'Trátala antes de lavar y revisa que haya salido antes de secar. El calor de la secadora fija la mancha y ya no sale.'],
      ['¿Cuántos juegos conviene rotar?', 'Dos o tres por persona. Así cada prenda descansa entre lavados y las tres duran más que dos usadas a diario.'],
    ],
  },
  'como-elegir-talla-de-uniforme-para-tu-cuadrilla': {
    kicker: 'Artículo',
    h1: 'Cómo elegir la talla de uniforme para tu cuadrilla sin equivocarte',
    h1Html: 'Tallas para<br>tu cuadrilla.',
    title: 'Cómo Elegir Tallas para tu Cuadrilla | Works Jeans',
    description: 'Método de tres pasos para armar la corrida de tallas de un equipo, evitar cambios y tener repuestos. Con tabla de proporción típica.',
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
    faq: [
      ['¿Tengo que medir a cada persona?', 'No hace falta. Basta con que cada quien mida una prenda que ya le quede bien, extendida sobre una mesa, y compare con la tabla de tallas.'],
      ['¿Qué hago con quien queda entre dos tallas?', 'Pide la mayor. La mezclilla no da de sí y en el trabajo conviene el espacio para agacharse y cargar.'],
      ['¿Conviene pedir tallas de más?', 'Sí. Un par de piezas en las tallas más comunes te sirven para ingresos nuevos y para cambios, sin esperar la siguiente compra.'],
    ],
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

// Segunda tanda de páginas y artículos (contenido-extra.js).
const EXTRA = require('./contenido-extra');
Object.assign(LANDINGS, EXTRA.LANDINGS_EXTRA);
Object.assign(ARTICLES, EXTRA.ARTICLES_EXTRA);

module.exports = { PUBLISHED, LANDINGS, ARTICLES, SIZE_TABLES, tableHtml };

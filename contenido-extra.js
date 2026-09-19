// Páginas y artículos adicionales (segunda tanda, 17 de septiembre de 2026).
// Mismo formato que contenido.js. Solo información confirmada: mezclilla 100% algodón preencogida,
// costuras reforzadas, cinta reflejante cosida (no certificada), tallas 28–50 y XCH–5XG, hecho en Monterrey.

const PUBLISHED_2 = '2026-09-17';

const WA = 'https://wa.me/528128613551';

function faqComunes() {
  return [
    ['¿Puedo comprar una sola pieza?', 'Sí. No hay mínimo de compra: eliges talla, pagas con tarjeta o cierras el pedido por WhatsApp y te lo enviamos o lo recoges en la tienda de Monterrey.'],
    ['¿Facturan?', 'Sí, emitimos CFDI. Al pagar marca "Necesito factura" y captura RFC, razón social, código postal fiscal, régimen y uso de CFDI.'],
    ['¿Cuánto tarda el envío?', 'Preparamos el pedido en 1 a 2 días hábiles y la paquetería entrega en 3 a 7 días hábiles según el destino. En Monterrey también puedes recoger en tienda.'],
  ];
}

// --- Páginas por industria ------------------------------------------------

const INDUSTRIAS = {
  'uniformes-para-construccion': {
    kicker: 'Construcción · Obra',
    h1: 'Uniformes de mezclilla para construcción',
    h1Html: 'Uniformes para<br>construcción.',
    title: 'Uniformes de Mezclilla para Construcción | Works Jeans',
    description: 'Pantalones y camisas de mezclilla para cuadrillas de obra: costuras reforzadas, cinco bolsas, opción reflejante y tallas 28 a 50. Corridas con stock.',
    intro: 'La obra castiga la ropa: concreto, varilla, rodillas en el piso. Por eso nuestros uniformes son de mezclilla 100% algodón con costuras dobles, no de tela delgada.',
    products: () => true,
    body: `
      <h2>Lo que necesita una cuadrilla de obra</h2>
      <p>En construcción la ropa se raspa contra block, se arrodilla sobre concreto y carga herramienta en las bolsas todo el día. Un uniforme de tela ligera dura semanas. Nuestro <a href="/pantalones-de-trabajo">pantalón de trabajo</a> es de mezclilla 100% algodón preencogida, con costuras dobles en tiro, entrepierna y bolsas, corte recto para agacharse sin que jale y cinco bolsas que sí aguantan un flexómetro o unas pinzas.</p>
      <h2>Reflejante para trabajar junto a maquinaria</h2>
      <p>Para cuadrillas que trabajan cerca de retroexcavadoras, camiones de volteo o en vialidades, tenemos el mismo pantalón y la misma camisa con cintas reflejantes cosidas en verde o naranja. Son cintas cosidas sobre mezclilla, no una prenda certificada de alta visibilidad (ANSI/ISEA 107 o ISO 20471); si tu obra exige certificación, consúltanos antes.</p>
      <h2>Corridas completas, porque una cuadrilla no viene en una sola talla</h2>
      <p>Pantalón del 28 al 50 y camisa de la XCH a la 5XG, con el mismo patrón en toda la corrida. Armas tu pedido por talla en el <a href="/empresas">cotizador para empresas</a>, te respondemos con precio de distribuidor o de socio según el volumen, y podemos bordar el logotipo de la constructora en camisa y pantalón.</p>
      <h2>Entrega en Monterrey y a toda la República</h2>
      <p>Tenemos stock en nuestra tienda de la colonia Venustiano Carranza, en Monterrey, y enviamos por paquetería con número de guía a cualquier obra del país. Facturamos con CFDI.</p>
    `,
    faq: [
      ['¿El pantalón aguanta arrodillarse en concreto?', 'Es mezclilla 100% algodón con costuras dobles en las zonas de mayor desgaste. Ninguna tela es eterna sobre concreto, pero aguanta mucho más que un pantalón de tela ligera o un jean de moda.'],
      ['¿Pueden bordar el logotipo de la constructora?', 'Sí, bordado o estampado DTF en pedidos de mayoreo. Cotízalo con tu corrida de tallas.'],
      ...faqComunes().slice(1),
    ],
  },
  'uniformes-para-manufactura-y-planta': {
    kicker: 'Manufactura · Planta',
    h1: 'Uniformes de mezclilla para manufactura y planta',
    h1Html: 'Uniformes para<br>manufactura<br>y planta.',
    title: 'Uniformes de Mezclilla para Manufactura | Works Jeans',
    description: 'Camisas y pantalones de mezclilla para líneas de producción: corte sin partes sueltas, tallas hasta 50 y 5XG, opción reflejante. Mayoreo desde Monterrey.',
    intro: 'Uniformar una planta es uniformar a cientos de personas de todas las tallas. Tenemos la corrida completa en stock y un solo patrón para todos.',
    products: () => true,
    body: `
      <h2>Ropa de trabajo para la línea de producción</h2>
      <p>En una planta el uniforme tiene que ser cómodo ocho horas de pie, resistir grasa y lavado frecuente y no tener partes sueltas que se enganchen. Nuestra <a href="/camisas-de-trabajo">camisa de trabajo</a> de mezclilla tiene botones reforzados y bolsillo frontal; el <a href="/pantalones-de-trabajo">pantalón</a> es de corte recto, sin cintas ni adornos que se atoren.</p>
      <h2>Reflejante en áreas de montacargas</h2>
      <p>Para almacén, patios y pasillos con tránsito de montacargas ofrecemos camisa y pantalón con cinta reflejante cosida en verde o naranja. No son prendas certificadas de alta visibilidad; si tu reglamento interno exige certificación, dinos y lo revisamos contigo.</p>
      <h2>Tallas para toda la plantilla</h2>
      <p>Pantalón del 28 al 50 y camisa de XCH a 5XG. Publicamos las <a href="/guia-de-tallas">tablas de medidas</a> para que recursos humanos levante tallas sin adivinar, y podemos ayudarte a armar la corrida a partir de tu lista de personal.</p>
      <h2>Logotipo, factura y reposiciones</h2>
      <p>Bordamos o estampamos el logotipo de la empresa. Facturamos con CFDI y, como fabricamos en Monterrey, las reposiciones por ingreso de personal o cambio de talla no esperan semanas de producción. Cotiza en la <a href="/empresas">página para empresas</a>.</p>
    `,
    faq: [
      ['¿Manejan el mismo uniforme para hombres y mujeres?', 'Nuestro patrón es único por talla (28 a 50 en pantalón, XCH a 5XG en camisa). Recomendamos medir con la guía de tallas para elegir la que mejor quede a cada persona.'],
      ['¿Pueden surtir reposiciones pequeñas después del pedido grande?', 'Sí. Tenemos stock en Monterrey y puedes pedir desde una pieza para reponer tallas.'],
      ...faqComunes().slice(1),
    ],
  },
  'uniformes-para-mantenimiento-y-talleres': {
    kicker: 'Mantenimiento · Talleres',
    h1: 'Uniformes de mezclilla para mantenimiento y talleres',
    h1Html: 'Uniformes para<br>mantenimiento<br>y talleres.',
    title: 'Uniformes de Mezclilla para Talleres | Works Jeans',
    description: 'Ropa de trabajo de mezclilla para técnicos y talleres: resiste grasa y lavado frecuente, cinco bolsas y costuras reforzadas. Desde una pieza o mayoreo.',
    intro: 'Grasa, aceite y lavadas cada dos días. La mezclilla 100% algodón asienta el color en vez de destiñirse a manchones, y las costuras dobles aguantan el uso diario.',
    products: () => true,
    body: `
      <h2>Ropa que se lava mucho y sigue viéndose bien</h2>
      <p>El uniforme de un técnico se lava más que cualquier otro. Nuestra mezclilla es 100% algodón preencogida: la talla que compras es la que se queda, y el color se asienta con el uso en lugar de mancharse. Lava al revés, con agua fría y sin cloro, y te dura mucho más.</p>
      <h2>Bolsas que sí sirven</h2>
      <p>El <a href="/pantalones-de-trabajo">pantalón de trabajo</a> tiene cinco bolsas con costuras reforzadas para llevar desarmador, calibrador o trapo sin que se abran. La <a href="/camisas-de-trabajo">camisa</a> tiene bolsillo frontal y botones reforzados que no se desprenden al agacharse.</p>
      <h2>Para talleres mecánicos, eléctricos y de servicio</h2>
      <p>Talleres automotrices, de maquinaria, de aire acondicionado, cuadrillas de mantenimiento de edificios y plantas: el mismo uniforme sirve para todos, con o sin cinta reflejante según el área. Compra desde una pieza en línea o pide la corrida completa para tu equipo con logotipo bordado.</p>
      <h2>Talla correcta desde el primer pedido</h2>
      <p>Consulta la <a href="/guia-de-tallas">guía de tallas</a>: se mide una prenda que quede bien y se compara con la tabla. Si dudas entre dos tallas, elige la mayor; en el taller se agradece el espacio para moverse.</p>
    `,
    faq: [
      ['¿La grasa se quita de la mezclilla?', 'Como en cualquier mezclilla, las manchas de grasa se tratan antes de lavar con jabón directo sobre la mancha. Lo que no recomendamos es cloro, porque desgasta la tela y el color.'],
      ['¿Tienen pantalón con reflejante para mantenimiento en patios?', 'Sí, pantalón y camisa con cintas reflejantes cosidas en verde o naranja. No son prendas certificadas de alta visibilidad.'],
      ...faqComunes(),
    ],
  },
  'uniformes-para-logistica-y-patios': {
    kicker: 'Logística · Patios · Transporte',
    h1: 'Uniformes reflejantes para logística y patios',
    h1Html: 'Uniformes para<br>logística<br>y patios.',
    title: 'Uniformes Reflejantes para Logística | Works Jeans',
    description: 'Camisas y pantalones de mezclilla con cinta reflejante para almacenes, patios de maniobras y transporte. Tallas completas y mayoreo con stock en Monterrey.',
    intro: 'Entre montacargas y tráileres lo primero es que te vean. Cinta reflejante cosida sobre mezclilla que aguanta el turno completo.',
    products: (p) => /reflejante/.test(p.id),
    body: `
      <h2>Que te vean de día y de noche</h2>
      <p>En un patio de maniobras o un andén de carga la gente convive con montacargas, camiones y poca luz. Nuestros uniformes reflejantes llevan cintas cosidas en pecho, espalda y mangas (camisa) y en ambas piernas (pantalón), en verde lima o naranja. El verde destaca en fondos oscuros y de día; el naranja es el color habitual en transporte y vialidades.</p>
      <p><strong>Importante:</strong> son cintas reflejantes cosidas sobre mezclilla. No son prendas certificadas de alta visibilidad (ANSI/ISEA 107 ni ISO 20471). Si tu operación o tu cliente exige prenda certificada, consúltanos antes de comprar.</p>
      <h2>Mezclilla, no malla</h2>
      <p>Un chaleco de malla se rompe en semanas y se usa encima de otra ropa. Aquí la cinta va sobre la misma mezclilla 100% algodón de nuestros <a href="/pantalones-de-trabajo">pantalones</a> y <a href="/camisas-de-trabajo">camisas</a>: una sola prenda que se lava y aguanta como un jean.</p>
      <h2>Uniformes para operadores, almacenistas y personal de patio</h2>
      <p>Corridas completas de tallas para toda la operación, bordado del logotipo de la empresa o del transportista y factura CFDI. Pide la cotización con tu corrida en la <a href="/empresas">página para empresas</a> o por <a href="${WA}">WhatsApp</a>.</p>
    `,
    faq: [
      ['¿Verde o naranja?', 'Si tu empresa ya tiene un color definido, respétalo. Si no, el verde contrasta mejor en fondos oscuros y de día; el naranja es el color tradicional en transporte y vialidades.'],
      ['¿La cinta reflejante se despega con el lavado?', 'Va cosida, no pegada. Lava al revés, con agua fría y sin cloro para conservar el brillo por más tiempo.'],
      ...faqComunes().slice(1),
    ],
  },
};

// --- Páginas por ciudad (zona metropolitana de Monterrey) -----------------

function ciudad(slug, nombre, contexto, faqLocal) {
  // El título y la descripción se cortan en los resultados de Google: nombre corto para que quepan.
  const corto = { 'San Nicolás de los Garza': 'San Nicolás', 'General Escobedo': 'Escobedo' }[nombre] || nombre;
  return {
    kicker: `${nombre} · Nuevo León`,
    h1: `Ropa de trabajo en ${nombre}`,
    h1Html: `Ropa de trabajo<br>en ${nombre}.`,
    title: `Ropa de Trabajo en ${corto}, N.L. | Works Jeans${corto.length > 11 ? '' : ' Monterrey'}`,
    description: `Pantalones y camisas de trabajo de mezclilla para empresas y trabajadores de ${corto}, N.L. Stock inmediato, mayoreo, bordado y entrega desde Monterrey.`,
    intro: `Atendemos a empresas y trabajadores de ${nombre} desde nuestra tienda en Monterrey: stock de todas las tallas, cotización por WhatsApp y entrega sin semanas de espera.`,
    products: () => true,
    body: `
      <h2>Uniformes de mezclilla para ${nombre}</h2>
      <p>${contexto}</p>
      <h2>Lo que fabricamos</h2>
      <p><a href="/pantalones-de-trabajo">Pantalones de trabajo</a> de mezclilla 100% algodón con cinco bolsas, costuras reforzadas y corte recto, en tallas 28 a 50; <a href="/camisas-de-trabajo">camisas de trabajo</a> con botones reforzados y bolsillo frontal, de XCH a 5XG; y ambos en versión con <a href="/ropa-de-trabajo-reflejante">cinta reflejante</a> verde o naranja para áreas con maquinaria o poca luz.</p>
      <h2>Cómo comprar desde ${nombre}</h2>
      <p>Compra en línea desde una pieza y recibe por paquetería con número de guía, o pasa a nuestra tienda en Calle Emiliano Zapata 3737, colonia Venustiano Carranza, Monterrey, de lunes a viernes de 9:00 a. m. a 6:00 p. m., a probarte la talla y llevarte el pedido el mismo día. Para pedidos de empresa, arma tu corrida de tallas en el <a href="/empresas">cotizador</a> y te respondemos con precio de distribuidor o de socio según el volumen.</p>
      <h2>Logotipo de tu empresa</h2>
      <p>Bordamos o estampamos en DTF el logotipo en camisas y pantalones para pedidos de mayoreo, y facturamos con CFDI.</p>
    `,
    faq: [
      faqLocal,
      ['¿Entregan en ' + nombre + '?', 'Sí, por paquetería con número de guía a cualquier domicilio de ' + nombre + '. También puedes recoger sin costo en nuestra tienda de Monterrey.'],
      ...faqComunes().slice(0, 2),
    ],
  };
}

const CIUDADES = {
  'ropa-de-trabajo-apodaca': ciudad('ropa-de-trabajo-apodaca', 'Apodaca',
    'Apodaca concentra parques industriales, empresas de manufactura y operaciones de logística alrededor del aeropuerto. Uniformamos cuadrillas de planta, almacén y mantenimiento con mezclilla que aguanta el turno completo, con o sin reflejante para las áreas de montacargas.',
    ['¿Tienen tienda en Apodaca?', 'No, nuestra tienda está en Monterrey, en la colonia Venustiano Carranza. Enviamos a Apodaca por paquetería o puedes recoger en tienda.']),
  'ropa-de-trabajo-guadalupe': ciudad('ropa-de-trabajo-guadalupe', 'Guadalupe',
    'Guadalupe es vecino inmediato de nuestra tienda: talleres, comercios, empresas de servicios y plantas de manufactura que necesitan uniformes resistentes sin comprar por contenedor. Aquí puedes pedir desde una pieza o la corrida completa para tu cuadrilla.',
    ['¿Qué tan lejos está la tienda de Guadalupe?', 'Estamos en Calle Emiliano Zapata 3737, colonia Venustiano Carranza, Monterrey, a unos minutos de Guadalupe. Abrimos de lunes a viernes de 9:00 a. m. a 6:00 p. m.']),
  'ropa-de-trabajo-san-nicolas': ciudad('ropa-de-trabajo-san-nicolas', 'San Nicolás de los Garza',
    'San Nicolás es una de las zonas industriales más antiguas del área metropolitana: metalmecánica, manufactura, talleres y empresas de mantenimiento. Para ese trabajo pesado hacemos pantalones y camisas de mezclilla 100% algodón con costuras dobles, en tallas completas.',
    ['¿Pueden surtir un pedido grande para una planta de San Nicolás?', 'Sí. Tenemos stock de todas las tallas en Monterrey; arma la corrida en el cotizador para empresas y te respondemos con precio por volumen y tiempo de entrega.']),
  'ropa-de-trabajo-santa-catarina': ciudad('ropa-de-trabajo-santa-catarina', 'Santa Catarina',
    'Santa Catarina reúne industria pesada, plantas de manufactura y empresas de transporte sobre la carretera a Saltillo. Uniformes de mezclilla para planta y patio, con cinta reflejante verde o naranja para el personal que trabaja cerca de camiones y maquinaria.',
    ['¿Manejan uniformes reflejantes para transporte en Santa Catarina?', 'Sí, camisa y pantalón con cintas reflejantes cosidas. No son prendas certificadas de alta visibilidad; si tu cliente exige certificación, consúltanos antes.']),
  'ropa-de-trabajo-escobedo': ciudad('ropa-de-trabajo-escobedo', 'General Escobedo',
    'Escobedo crece con parques industriales, centros de distribución y empresas de construcción. Uniformamos a personal de almacén, obra y manufactura con ropa de mezclilla hecha en Monterrey, con entrega por paquetería o recolección en tienda.',
    ['¿Cuánto tarda un pedido a Escobedo?', 'Preparamos el pedido en 1 a 2 días hábiles y la paquetería entrega en 3 a 7 días hábiles. Si tienes prisa, puedes recoger en nuestra tienda de Monterrey.']),
  'ropa-de-trabajo-garcia': ciudad('ropa-de-trabajo-garcia', 'García',
    'García es una de las zonas de mayor crecimiento industrial de Nuevo León, con parques nuevos y cuadrillas de construcción en obra todo el año. Pantalones y camisas de mezclilla para obra y planta, con cinta reflejante para quienes trabajan junto a maquinaria.',
    ['¿Atienden constructoras en García?', 'Sí. Cotizamos corridas completas de tallas con bordado del logotipo y factura CFDI; arma tu pedido en la página para empresas.']),
};

// --- Páginas por producto y tipo de cliente -------------------------------

const PRODUCTO_Y_CLIENTE = {
  'camisa-de-mezclilla-con-reflejante': {
    kicker: 'Camisa · Reflejante',
    h1: 'Camisa de mezclilla con reflejante',
    h1Html: 'Camisa de<br>mezclilla con<br>reflejante.',
    title: 'Camisa de Mezclilla con Reflejante | Works Jeans Monterrey',
    description: 'Camisa de trabajo de mezclilla con cinta reflejante en pecho, espalda y mangas, verde o naranja. Tallas XCH a 5XG. Desde una pieza o por mayoreo.',
    intro: 'La misma camisa de trabajo de mezclilla, con cintas reflejantes cosidas para que te vean en planta, patio o vialidad.',
    products: (p) => p.category === 'Camisas' && /reflejante/.test(p.id),
    body: `
      <h2>Dónde lleva la cinta</h2>
      <p>Una cinta horizontal en pecho y espalda y una en cada manga, cosidas sobre la mezclilla. Disponible en verde lima y en naranja. Las cintas son cosidas, no pegadas, y la camisa se lava como cualquier prenda de mezclilla: al revés, con agua fría y sin cloro.</p>
      <h2>Lo demás es la camisa de siempre</h2>
      <p>Mezclilla 100% algodón preencogida, botones reforzados que no se desprenden, bolsillo frontal y un corte que deja mover los brazos. Tallas de la XCH a la 5XG; consulta las medidas en la <a href="/guia-de-tallas">guía de tallas</a>.</p>
      <h2>No es prenda certificada de alta visibilidad</h2>
      <p>Lleva cinta reflejante, pero no cuenta con certificación ANSI/ISEA 107 ni ISO 20471. Si el reglamento de tu empresa exige prenda certificada, consúltanos antes de comprar. Para la mayoría de las áreas con poca luz o tránsito de montacargas, la cinta cosida cumple el objetivo: que te vean.</p>
      <h2>Combínala con el pantalón reflejante</h2>
      <p>El <a href="/pantalon-de-mezclilla-con-reflejante">pantalón de mezclilla con reflejante</a> lleva dos cintas en cada pierna; juntos forman un uniforme completo. Para cuadrillas, cotiza la corrida en la <a href="/empresas">página para empresas</a> con bordado de logotipo.</p>
    `,
    faq: [
      ['¿En qué colores viene la cinta?', 'Verde lima y naranja. Elige el que contraste mejor con el entorno donde trabaja tu gente o el que marque el reglamento de tu empresa.'],
      ['¿Puedo bordar el logotipo sin tapar la cinta?', 'Sí. El bordado va en el pecho o la manga, en una zona libre de cinta; lo revisamos contigo al cotizar.'],
      ...faqComunes(),
    ],
  },
  'pantalon-de-mezclilla-con-reflejante': {
    kicker: 'Pantalón · Reflejante',
    h1: 'Pantalón de mezclilla con reflejante',
    h1Html: 'Pantalón de<br>mezclilla con<br>reflejante.',
    title: 'Pantalón de Mezclilla con Reflejante | Works Jeans',
    description: 'Pantalón de trabajo de mezclilla con dos cintas reflejantes en cada pierna, verde o naranja. Cinco bolsas y tallas 28 a 50. Desde una pieza o mayoreo.',
    intro: 'El pantalón de trabajo de mezclilla con cintas reflejantes en las piernas: visible de noche y en patios, resistente como un jean.',
    products: (p) => p.category === 'Pantalones' && /reflejante/.test(p.id),
    body: `
      <h2>Dos cintas en cada pierna</h2>
      <p>Las cintas van cosidas a la altura de la rodilla y de la pantorrilla, en verde lima o naranja, sobre mezclilla 100% algodón preencogida. Son las zonas que quedan a la altura de los faros de un montacargas o de un camión.</p>
      <h2>El mismo pantalón de trabajo</h2>
      <p>Cinco bolsas, costuras dobles en tiro, entrepierna y bolsas, y corte recto que deja agacharse. Tallas del 28 al 50 con el mismo patrón; revisa cintura, cadera y largo en la <a href="/guia-de-tallas">guía de tallas</a>.</p>
      <h2>Aviso sobre certificación</h2>
      <p>Es un pantalón con cinta reflejante cosida, no una prenda certificada de alta visibilidad (ANSI/ISEA 107 o ISO 20471). Si tu operación exige certificación, consúltanos antes de comprar.</p>
      <h2>Uniforme completo</h2>
      <p>Combínalo con la <a href="/camisa-de-mezclilla-con-reflejante">camisa de mezclilla con reflejante</a>. Para cuadrillas de logística, construcción o transporte, cotiza la corrida completa en la <a href="/empresas">página para empresas</a>.</p>
    `,
    faq: [
      ['¿Puedo pedir el pantalón normal y el reflejante en la misma corrida?', 'Sí. En el cotizador agregas cada prenda con sus tallas y te cotizamos todo junto.'],
      ['¿El largo es el mismo en todas las tallas?', 'Sí, el largo es de 32" en todas las tallas. Si necesitas ajuste de bastilla, cualquier sastre lo hace sin afectar la cinta, que va más arriba.'],
      ...faqComunes(),
    ],
  },
  'ropa-de-trabajo-tallas-grandes': {
    kicker: 'Tallas grandes · Hasta 50 y 5XG',
    h1: 'Ropa de trabajo en tallas grandes',
    h1Html: 'Ropa de trabajo<br>en tallas<br>grandes.',
    title: 'Ropa de Trabajo en Tallas Grandes | Works Jeans Monterrey',
    description: 'Pantalones de trabajo de mezclilla hasta talla 50 y camisas hasta 5XG, con el mismo patrón y precio. Medidas en pulgadas y stock en Monterrey.',
    intro: 'Una cuadrilla no viene en un solo tamaño. Fabricamos la corrida completa: pantalón del 28 al 50 y camisa de la XCH a la 5XG, sin pedidos especiales.',
    products: () => true,
    body: `
      <h2>Tallas grandes en stock, no sobre pedido</h2>
      <p>La mayoría de las marcas de ropa no pasa de la talla 42 o de la XG. Nosotros fabricamos en Monterrey la corrida completa y la tenemos en tienda: <a href="/pantalones-de-trabajo">pantalón</a> en 44, 46, 48 y 50 y <a href="/camisas-de-trabajo">camisa</a> en 2XG, 3XG, 4XG y 5XG, con el mismo patrón y la misma mezclilla 100% algodón que el resto.</p>
      <h2>Medidas reales, en pulgadas</h2>
      <p>Para que no adivines, publicamos las medidas de cada talla: la camisa 5XG mide 59" de pecho y la 4XG 56"; el pantalón 50 mide 51" de cintura y 56" de cadera, con largo de 32" en todas las tallas. Consulta la tabla completa en la <a href="/guia-de-tallas">guía de tallas</a> y mide una prenda que te quede bien antes de pedir.</p>
      <h2>Precio por grupo de tallas</h2>
      <p>El precio de cada prenda se muestra por grupo de tallas en su ficha; las tallas más grandes usan más tela y tienen un precio ligeramente mayor. Todo con IVA incluido y sin mínimo de compra.</p>
      <h2>Para empresas</h2>
      <p>Al cotizar la corrida de tu cuadrilla incluye las tallas grandes desde el principio; así toda la plantilla estrena uniforme el mismo día. Arma el pedido en la <a href="/empresas">página para empresas</a>.</p>
    `,
    faq: [
      ['¿La talla 50 tiene el mismo corte que la 32?', 'Sí. Es el mismo patrón escalado: corte recto, cinco bolsas y costuras reforzadas.'],
      ['¿Cuánto mide de pecho la camisa 5XG?', '59 pulgadas de pecho, 36.1" de largo, 26.8" de hombros y 27.9" de manga, con tolerancia de ±1".'],
      ...faqComunes(),
    ],
  },
  'fabricantes-de-ropa-de-trabajo-en-monterrey': {
    kicker: 'Fabricante · Monterrey',
    h1: 'Fabricantes de ropa de trabajo en Monterrey',
    h1Html: 'Fabricantes de<br>ropa de trabajo<br>en Monterrey.',
    title: 'Fabricante de Ropa de Trabajo en Monterrey | Works Jeans',
    description: 'Works Jeans fabrica en Monterrey pantalones y camisas de trabajo de mezclilla 100% algodón. Venta directa de fábrica con stock, mayoreo y bordado.',
    intro: 'Fabricamos en Monterrey y vendemos directo, sin intermediarios: por eso tenemos stock, precio por volumen y reposiciones rápidas.',
    products: () => true,
    body: `
      <h2>Fabricar aquí cambia todo</h2>
      <p>Cuando la ropa se fabrica en la misma ciudad donde se vende, no hay contenedores que esperar ni tallas agotadas por meses. Diseñamos y confeccionamos en Monterrey nuestros <a href="/pantalones-de-trabajo">pantalones</a> y <a href="/camisas-de-trabajo">camisas</a> de trabajo, y mantenemos la corrida completa en nuestra tienda de la colonia Venustiano Carranza.</p>
      <h2>Qué fabricamos</h2>
      <ul>
        <li><strong>Pantalón de trabajo:</strong> mezclilla 100% algodón preencogida, cinco bolsas, costuras dobles, corte recto, tallas 28 a 50.</li>
        <li><strong>Camisa de trabajo:</strong> mezclilla 100% algodón, botones reforzados, bolsillo frontal, tallas XCH a 5XG.</li>
        <li><strong>Versiones reflejantes:</strong> las mismas prendas con cintas reflejantes cosidas en verde o naranja (no certificadas de alta visibilidad).</li>
        <li><strong>Personalización:</strong> bordado o estampado DTF con el logotipo de tu empresa.</li>
      </ul>
      <h2>Venta directa a empresas y distribuidores</h2>
      <p>Manejamos tres niveles de precio: cliente final (el que ves en la tienda en línea, con IVA), distribuidor y socio, según el volumen. Si revendes ropa de trabajo o uniformas a varias cuadrillas, pide la lista vigente en la <a href="/distribuidores-de-ropa-de-trabajo">página para distribuidores</a> o en el <a href="/empresas">cotizador</a>.</p>
      <h2>Visítanos</h2>
      <p>Calle Emiliano Zapata 3737, colonia Venustiano Carranza, Monterrey, N.L. Lunes a viernes de 9:00 a. m. a 6:00 p. m. También enviamos a todo México por paquetería con número de guía.</p>
    `,
    faq: [
      ['¿Fabrican bajo la marca de mi empresa?', 'Bordamos o estampamos tu logotipo en nuestras prendas. Consúltanos por WhatsApp si necesitas algo distinto y te decimos si podemos cumplirlo.'],
      ['¿Puedo ver las prendas antes de un pedido grande?', 'Sí. Pasa a la tienda a ver la tela, las costuras y probar tallas, o compra una pieza en línea como muestra.'],
      ...faqComunes().slice(1),
    ],
  },
  'distribuidores-de-ropa-de-trabajo': {
    kicker: 'Distribuidores · Revendedores',
    h1: 'Distribuidores de ropa de trabajo',
    h1Html: 'Distribuidores<br>de ropa<br>de trabajo.',
    title: 'Distribuidores de Ropa de Trabajo | Works Jeans',
    description: 'Precio de distribuidor en ropa de trabajo de mezclilla: stock inmediato en Monterrey, etiquetas por talla, factura y envío a todo México.',
    intro: 'Precio de distribuidor y de socio, corridas completas en stock y prendas etiquetadas por talla, listas para tu almacén o tu punto de venta.',
    products: () => true,
    body: `
      <h2>Tres niveles de precio</h2>
      <p>Cliente final, distribuidor y socio. El precio de la tienda en línea es de cliente final con IVA incluido. Los precios de distribuidor y de socio se dan por grupo de tallas y dependen del volumen; te mandamos la lista vigente por escrito al cotizar.</p>
      <h2>Listas para vender</h2>
      <p>Cada prenda llega con etiqueta individual por talla y empaque protector, para que entre directo a tu almacén o a tu piso de venta. Fabricamos en Monterrey y mantenemos la corrida completa en stock: pantalón 28 a 50, camisa XCH a 5XG, con y sin reflejante.</p>
      <h2>Para quién es</h2>
      <ul>
        <li>Tiendas de ropa de trabajo y ferreterías con área de uniformes.</li>
        <li>Empresas que uniforman a varias cuadrillas o a varios clientes.</li>
        <li>Proveedores de equipo de seguridad que quieren sumar mezclilla resistente a su catálogo.</li>
      </ul>
      <h2>Cómo empezar</h2>
      <p>Cuéntanos tu volumen aproximado y tu ciudad en el <a href="/empresas">cotizador para empresas</a> o por <a href="${WA}">WhatsApp</a>. Te respondemos en horario de tienda con la lista de precios y las condiciones de envío. Facturamos con CFDI.</p>
    `,
    faq: [
      ['¿Cuál es el mínimo para precio de distribuidor?', 'Depende del volumen y del grupo de tallas. Cuéntanos cuántas piezas manejas al mes y te decimos qué nivel de precio aplica.'],
      ['¿Puedo poner mi propia etiqueta?', 'Las prendas llevan la etiqueta Works Jeans con la talla. Si necesitas algo distinto, consúltanos y te decimos si es posible.'],
      ...faqComunes().slice(1),
    ],
  },
  'uniformes-de-mezclilla': {
    kicker: 'Uniformes · Mezclilla',
    h1: 'Uniformes de mezclilla para trabajo',
    h1Html: 'Uniformes<br>de mezclilla.',
    title: 'Uniformes de Mezclilla para Trabajo | Works Jeans',
    description: 'Uniformes de mezclilla 100% algodón para empresas: camisa y pantalón con costuras reforzadas, con o sin reflejante, tallas completas y bordado de logotipo.',
    intro: 'Camisa y pantalón de mezclilla que combinan, en todas las tallas, con o sin reflejante y con tu logotipo. Un uniforme que aguanta y se ve bien.',
    products: () => true,
    body: `
      <h2>Por qué mezclilla para uniformar</h2>
      <p>La mezclilla 100% algodón respira mejor que el poliéster, aguanta raspones y lavado frecuente, y se ve presentable aunque tenga meses de uso: el color se asienta en vez de mancharse. Es la tela con la que se ha trabajado toda la vida, hecha para el trabajo de hoy.</p>
      <h2>El uniforme completo</h2>
      <p>La <a href="/camisas-de-trabajo">camisa de trabajo</a> (XCH a 5XG) y el <a href="/pantalones-de-trabajo">pantalón de trabajo</a> (28 a 50) están hechos con la misma mezclilla, así que combinan. Para áreas con maquinaria o poca luz, las <a href="/ropa-de-trabajo-reflejante">versiones reflejantes</a> llevan cintas cosidas en verde o naranja.</p>
      <h2>Con el logotipo de tu empresa</h2>
      <p>Bordado o estampado DTF en el pecho, la manga o donde lo necesites. Lo cotizamos junto con la corrida de tallas; lee <a href="/articulos/bordado-o-dtf-como-poner-tu-logotipo-en-uniformes-de-trabajo">cuándo conviene bordado y cuándo DTF</a>.</p>
      <h2>Cómo cotizar</h2>
      <p>Arma el pedido por prenda y talla en la <a href="/empresas">página para empresas</a>. Respondemos por escrito con precio de distribuidor o de socio según el volumen, tiempo de entrega y factura CFDI. Compra desde una pieza si primero quieres una muestra.</p>
    `,
    faq: [
      ['¿Cuántos uniformes necesita cada trabajador?', 'Lo habitual son dos o tres juegos por persona para rotar mientras uno se lava. Lee nuestra guía sobre cuántos uniformes comprar y cada cuánto reponerlos.'],
      ['¿Camisa y pantalón son del mismo tono?', 'Ambos se fabrican con mezclilla índigo; entre lotes puede haber variación ligera de tono, normal en mezclilla. Si es importante, pide la corrida completa en un solo pedido.'],
      ...faqComunes(),
    ],
  },
};

// --- Páginas de apoyo (antes solo vivían dentro del inicio) ---------------

const APOYO = {
  'preguntas-frecuentes': {
    kicker: 'Ayuda',
    h1: 'Preguntas frecuentes',
    h1Html: 'Preguntas<br>frecuentes.',
    title: 'Preguntas Frecuentes de Ropa de Trabajo | Works Jeans',
    description: 'Respuestas sobre tallas, envíos, cambios, factura CFDI, formas de pago, bordado de logotipo y mayoreo de ropa de trabajo Works Jeans.',
    intro: 'Todo lo que nos preguntan antes de comprar, en un solo lugar. Si falta algo, escríbenos por WhatsApp y te contestamos en horario de tienda.',
    products: null,
    body: `
      <p>Somos fabricantes de ropa de trabajo de mezclilla en Monterrey. Vendemos en línea a todo México, en nuestra tienda de la colonia Venustiano Carranza y por mayoreo a empresas y distribuidores. Aquí están las dudas más comunes; también puedes revisar la <a href="/guia-de-tallas">guía de tallas</a>, las <a href="/envios-y-devoluciones">políticas de envío y cambios</a> y el estado de tu pedido en <a href="/rastrear">Rastrear mi pedido</a>.</p>
    `,
    faq: [
      ['¿Manejan mayoreo?', 'Sí. Surtimos uniformes de trabajo a empresas, contratistas y distribuidores con precios de distribuidor y de socio según el volumen, y stock en Monterrey. Cotiza en la página para empresas.'],
      ['¿Facturan?', 'Sí, emitimos CFDI. Al pagar marca "Necesito factura" en el carrito y captura RFC, razón social, código postal fiscal, régimen y uso de CFDI.'],
      ['¿Qué tallas tienen?', 'Pantalón en tallas 28, 29, 30, 32, 33, 34, 36, 38, 40, 42, 44, 46, 48 y 50, y camisa de XCH a 5XG. En cada producto se muestran las tallas con existencia.'],
      ['¿Cómo elijo mi talla?', 'Mide una prenda que te quede bien y compárala con la guía de tallas. Ante la duda, elige la talla mayor: la mezclilla es preencogida y en el trabajo conviene espacio para moverse.'],
      ['¿Hacen personalización?', 'Sí. Bordado o estampado DTF con tu logotipo, nombres o áreas, en pedidos de mayoreo.'],
      ['¿Cuánto tarda el envío?', 'Preparamos el pedido en 1 a 2 días hábiles y la paquetería entrega en 3 a 7 días hábiles según el destino. Escribe tu código postal en el carrito para ver costo y tiempo antes de pagar. También puedes recoger en Monterrey sin costo.'],
      ['¿Cómo rastreo mi pedido?', 'En la página Rastrear mi pedido, con tu número de pedido y el correo o teléfono con el que compraste. Ahí ves si está pagado, en preparación, enviado con su guía o entregado.'],
      ['¿Dónde están ubicados?', 'En Calle Emiliano Zapata 3737, colonia Venustiano Carranza, Monterrey, Nuevo León. Abrimos de lunes a viernes de 9:00 a. m. a 6:00 p. m.'],
      ['¿Puedo cambiar una talla?', 'Sí, dentro de 15 días con la prenda sin usar, sin lavar y con etiquetas. En tienda sin costo; por paquetería el cliente cubre el envío. Las prendas personalizadas no tienen cambio salvo defecto.'],
      ['¿Qué métodos de pago aceptan?', 'Tarjeta de crédito o débito en línea, transferencia SPEI y pago en tienda. Por WhatsApp también te confirmamos transferencia o pago al recoger.'],
      ['¿Tienen ropa de trabajo con reflejantes?', 'Sí. Pantalones y camisas con cintas reflejantes cosidas en verde o naranja para entornos de poca luz. No son prendas certificadas de alta visibilidad (ANSI/ISEA 107 o ISO 20471).'],
      ['¿La mezclilla encoge?', 'Es mezclilla preencogida: la talla que compras es la que se queda. Lava al revés, con agua fría y sin cloro para conservar color y costuras.'],
      ['¿Tienen garantía?', 'Sí. 30 días contra defectos de fabricación en costuras, botones o reflejantes. Si detectas un defecto, mándanos fotos por WhatsApp y reponemos la prenda o reembolsamos el importe.'],
    ],
  },
  'nosotros': {
    kicker: 'Nosotros',
    h1: 'Nosotros: Works Jeans, ropa de trabajo hecha en Monterrey',
    h1Html: 'Nuestra<br>historia.',
    title: 'Nosotros: Fabricante en Monterrey | Works Jeans',
    description: 'Works Jeans nació en Monterrey para hacer ropa de trabajo de mezclilla que aguante el día a día. Fabricamos y vendemos directo, con stock y mayoreo.',
    intro: 'Workwear industrial para los que trabajan duro. Fabricado en Monterrey, vendido directo, sin intermediarios.',
    products: () => true,
    body: `
      <h2>De dónde venimos</h2>
      <p>Works Jeans nació en Monterrey de una necesidad simple: pantalones de trabajo que realmente aguanten el ritmo del día a día. Vimos cuadrillas comprando jeans de moda que se rompían en semanas y uniformes de tela delgada que no protegían nada. Decidimos fabricar work jeans y camisas de mezclilla pensando en quienes trabajan con las manos, sin dejar de lado el estilo.</p>
      <h2>Cómo hacemos las cosas</h2>
      <p>Cada camisa y pantalón se confecciona en mezclilla 100% algodón preencogida, con costuras dobles y botones reforzados en las zonas de mayor desgaste. Fabricamos la corrida completa, del 28 al 50 en pantalón y de la XCH a la 5XG en camisa, porque una cuadrilla no viene en un solo tamaño. Y decimos solo lo que podemos cumplir: nuestras prendas reflejantes llevan cinta cosida, no una certificación que no tienen.</p>
      <h2>Dónde estamos</h2>
      <p>Nuestra tienda está en Calle Emiliano Zapata 3737, colonia Venustiano Carranza, Monterrey, Nuevo León. Abrimos de lunes a viernes de 9:00 a. m. a 6:00 p. m. Desde ahí atendemos al área metropolitana y enviamos a todo México por paquetería.</p>
      <h2>A quién atendemos</h2>
      <p>A la persona que compra un pantalón para trabajar y a la empresa que uniforma a doscientas. Vendemos desde una pieza en línea y por mayoreo a empresas y distribuidores, con precio por volumen, bordado de logotipo y factura CFDI. Conoce más en <a href="/empresas">Empresas</a> o escríbenos por <a href="${WA}">WhatsApp</a>.</p>
    `,
  },
  'contacto': {
    kicker: 'Contacto',
    h1: 'Contacto: WhatsApp, teléfono y tienda en Monterrey',
    h1Html: 'Hablemos.',
    title: 'Contacto: WhatsApp y Tienda en Monterrey | Works Jeans',
    description: 'Escríbenos por WhatsApp al 81 2861 3551 o visita la tienda en Emiliano Zapata 3737, Monterrey. Lunes a viernes de 9:00 a. m. a 6:00 p. m.',
    intro: 'Escríbenos para cotizaciones, tallas especiales o personalización con tu logotipo. Respondemos por WhatsApp en horario de tienda.',
    products: null,
    body: `
      <h2>WhatsApp y teléfono</h2>
      <p><a href="${WA}?text=Hola%2C%20me%20interesa%20la%20ropa%20de%20trabajo%20de%20Works%20Jeans.">WhatsApp 81 2861 3551</a> es la forma más rápida: cotizaciones, dudas de talla, seguimiento de pedidos. También puedes llamar al <a href="tel:+528128613551">81 2861 3551</a> en horario de tienda.</p>
      <h2>Tienda</h2>
      <p>Calle Emiliano Zapata 3737, colonia Venustiano Carranza, C.P. 64560, Monterrey, Nuevo León. Lunes a viernes de 9:00 a. m. a 6:00 p. m. Puedes probar tallas, recoger pedidos y ver las prendas antes de un pedido grande. <a href="https://maps.google.com/?cid=2378529028541799733" target="_blank" rel="noopener">Cómo llegar</a>.</p>
      <h2>Empresas y distribuidores</h2>
      <p>Para pedidos por volumen usa el <a href="/empresas">cotizador para empresas</a>: capturas prenda y cantidades por talla y te respondemos con la cotización formal por escrito, con precio de distribuidor o de socio y factura CFDI.</p>
      <h2>Pedidos en curso</h2>
      <p>Consulta el estado de tu pedido en <a href="/rastrear">Rastrear mi pedido</a> con tu número de pedido y tu correo o teléfono. Para cambios de talla revisa las <a href="/envios-y-devoluciones">políticas de envío y cambios</a>.</p>
      <h2>Qué necesitamos para cotizarte rápido</h2>
      <p>Si nos escribes con estos tres datos, te respondemos con precio en el mismo día hábil: qué prenda quieres (<a href="/pantalones-de-trabajo">pantalón</a>, <a href="/camisas-de-trabajo">camisa</a> o ambas, con o sin <a href="/ropa-de-trabajo-reflejante">reflejante</a>), cuántas piezas por talla, y si necesitas el logotipo de tu empresa bordado o en DTF. Si todavía no sabes las tallas, con el número de personas te armamos una corrida estimada y la ajustamos después.</p>
      <h2>Desde dónde atendemos</h2>
      <p>Fabricamos y despachamos desde Monterrey, y entregamos en persona en el área metropolitana: <a href="/ropa-de-trabajo-apodaca">Apodaca</a>, <a href="/ropa-de-trabajo-escobedo">Escobedo</a>, <a href="/ropa-de-trabajo-garcia">García</a>, <a href="/ropa-de-trabajo-guadalupe">Guadalupe</a>, <a href="/ropa-de-trabajo-san-nicolas">San Nicolás</a> y <a href="/ropa-de-trabajo-santa-catarina">Santa Catarina</a>. Al resto del país enviamos por paquetería con número de guía.</p>
      <h2>Tiempos de respuesta y de entrega</h2>
      <p>Contestamos por WhatsApp dentro del horario de tienda. Una vez confirmado el pago, el pedido se prepara en uno o dos días hábiles y la paquetería tarda entre tres y siete días hábiles según el destino. Los pedidos de empresa con bordado llevan más tiempo y te lo confirmamos por escrito en la cotización.</p>
    `,
    faq: [
      ['¿Responden en fin de semana?', 'Atendemos de lunes a viernes de 9:00 a. m. a 6:00 p. m. Los mensajes que llegan fuera de ese horario se contestan el siguiente día hábil.'],
      ['¿Puedo ir a la tienda sin cita?', 'Sí. Pasa en horario de tienda a ver las prendas, probar tallas o recoger tu pedido.'],
      ['¿Dónde están exactamente?', 'En Calle Emiliano Zapata 3737, colonia Venustiano Carranza, C.P. 64560, Monterrey, Nuevo León.'],
      ['¿Puedo recoger en tienda lo que compré en línea?', 'Sí. Haz tu pedido y pasa a recogerlo en horario de tienda; así no pagas envío.'],
      ['¿Atienden a empresas de fuera de Monterrey?', 'Sí. Enviamos a todo México por paquetería con número de guía y facturamos con CFDI.'],
    ],
  },
  'terminos-y-condiciones': {
    kicker: 'Legal',
    h1: 'Términos y condiciones de compra',
    h1Html: 'Términos y<br>condiciones.',
    title: 'Términos y Condiciones de Compra | Works Jeans',
    description: 'Condiciones de compra en workjeans.mx: precios con IVA, formas de pago, envíos, cambios de talla, garantía por defectos y facturación.',
    intro: 'Condiciones claras para comprar en workjeans.mx. Aplican a compras en línea, por WhatsApp y en tienda.',
    products: null,
    body: `
      <h2>1. Quién vende</h2>
      <p>Works Jeans, con tienda en Calle Emiliano Zapata 3737, colonia Venustiano Carranza, C.P. 64560, Monterrey, Nuevo León, México. Contacto: WhatsApp y teléfono 81 2861 3551, de lunes a viernes de 9:00 a. m. a 6:00 p. m.</p>
      <h2>2. Precios</h2>
      <p>Los precios publicados en la tienda en línea son de cliente final, en pesos mexicanos y con IVA incluido. Pueden variar por talla y se indican en cada ficha de producto. Los precios de distribuidor y de socio se cotizan por escrito y dependen del volumen. Nos reservamos el derecho de corregir errores evidentes de precio antes de confirmar un pedido.</p>
      <h2>3. Pedidos y pago</h2>
      <p>Un pedido queda confirmado cuando recibimos el pago: tarjeta de crédito o débito en línea, transferencia SPEI, pago en tienda de conveniencia con referencia o pago en nuestra tienda. Los pedidos por WhatsApp se confirman al acordar la forma de pago. El costo de envío se calcula con el código postal antes de pagar; cuando una zona no tiene tarifa publicada, se confirma por WhatsApp antes de enviar y no se cobra envío al pagar.</p>
      <h2>4. Envíos y entrega</h2>
      <p>Preparamos el pedido en 1 a 2 días hábiles y la paquetería entrega en 3 a 7 días hábiles según el destino, con número de guía. Puedes recoger sin costo en la tienda. El detalle está en <a href="/envios-y-devoluciones">Envíos y devoluciones</a>.</p>
      <h2>5. Cambios de talla y devoluciones</h2>
      <p>Aceptamos cambio de talla dentro de los 15 días naturales siguientes a la entrega, con la prenda sin usar, sin lavar y con etiquetas. En tienda no tiene costo; por paquetería el cliente cubre el envío de ida y vuelta. Las prendas personalizadas (bordado o DTF) no tienen cambio ni devolución salvo defecto de fabricación. Los reembolsos se hacen por el mismo medio de pago.</p>
      <h2>6. Garantía</h2>
      <p>Todas las prendas tienen garantía de 30 días contra defectos de fabricación en costuras, botones o cintas reflejantes. Si detectas un defecto, envía fotos por WhatsApp; reponemos la prenda o reembolsamos el importe, y en ese caso Works Jeans cubre los gastos de envío.</p>
      <h2>7. Prendas reflejantes</h2>
      <p>Nuestras prendas con cinta reflejante llevan cintas cosidas sobre mezclilla. No son prendas certificadas de alta visibilidad bajo ANSI/ISEA 107 ni ISO 20471, y así se indica en cada ficha. Es responsabilidad del comprador verificar los requisitos de su centro de trabajo.</p>
      <h2>8. Facturación</h2>
      <p>Emitimos CFDI con los datos fiscales que el cliente captura al comprar. Los datos deben coincidir con la constancia de situación fiscal; la factura se envía al correo indicado.</p>
      <h2>9. Datos personales</h2>
      <p>Tratamos tus datos conforme a nuestro <a href="/aviso-de-privacidad">aviso de privacidad</a>.</p>
      <h2>10. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos, incluida la Ley Federal de Protección al Consumidor. Para cualquier controversia, las partes se someten a la Procuraduría Federal del Consumidor y a los tribunales competentes de Monterrey, Nuevo León.</p>
      <p><em>Última actualización: 17 de septiembre de 2026.</em></p>
    `,
  },
};

const LANDINGS_EXTRA = { ...INDUSTRIAS, ...CIUDADES, ...PRODUCTO_Y_CLIENTE, ...APOYO };

// --- Artículos nuevos ------------------------------------------------------

const ARTICLES_EXTRA = {
  'verde-o-naranja-que-color-de-reflejante-conviene': {
    kicker: 'Artículo',
    h1: 'Verde o naranja: qué color de reflejante conviene según el trabajo',
    h1Html: 'Verde o naranja:<br>qué reflejante<br>conviene.',
    title: 'Reflejante Verde o Naranja: Cuál Elegir | Works Jeans',
    description: 'Cuándo elegir cinta reflejante verde y cuándo naranja: fondo, horario, tipo de operación y reglamento interno. Guía corta para decidir antes de uniformar.',
    intro: 'Los dos colores reflejan igual de noche. La diferencia está de día y en el fondo donde trabaja tu gente.',
    productsFilter: 'reflejante',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>Lo que hace la cinta y lo que hace el color</h2>
      <p>La cinta reflejante devuelve la luz de un faro hacia su origen: por eso de noche un conductor ve una franja brillante. Eso lo hace la cinta, sin importar el color. El color importa de día y al atardecer, cuando lo que se ve es el contraste del verde lima o el naranja contra el fondo.</p>
      <h2>Cuándo conviene verde</h2>
      <p>En fondos oscuros u opacos: interiores de nave, almacenes con poca luz, asfalto, maquinaria pintada de colores oscuros. El verde lima es el color que más contrasta con el gris y el negro, y de día se distingue a mayor distancia.</p>
      <h2>Cuándo conviene naranja</h2>
      <p>En construcción, vialidades y transporte el naranja es el color tradicional: conos, señales y chalecos ya son naranjas, y el ojo lo asocia con "zona de trabajo". También destaca bien sobre vegetación y sobre fondos claros de concreto o tierra.</p>
      <h2>Primero, el reglamento</h2>
      <p>Si tu empresa, tu cliente o el parque industrial ya definieron un color, ese manda. Muchas plantas piden naranja para contratistas externos y verde para personal propio, o al revés; pregúntalo antes de comprar la corrida.</p>
      <h2>Lo que la cinta no es</h2>
      <p>Nuestras prendas llevan cinta reflejante cosida sobre mezclilla, no una certificación de alta visibilidad (ANSI/ISEA 107 o ISO 20471). Si el centro de trabajo exige prenda certificada, consúltanos antes. Para la mayoría de las áreas con poca luz o tránsito de montacargas, la cinta cosida cumple el objetivo.</p>
      <p>Mira la <a href="/camisa-de-mezclilla-con-reflejante">camisa</a> y el <a href="/pantalon-de-mezclilla-con-reflejante">pantalón de mezclilla con reflejante</a>, disponibles en los dos colores.</p>
    `,
    faq: [
      ['¿Cuál se ve mejor de día?', 'El verde lima destaca más de día y contra fondos oscuros. El naranja se usa mucho en construcción y vialidades, y contrasta bien con vegetación y cielo.'],
      ['¿El color cambia lo que refleja de noche?', 'No. De noche las dos cintas devuelven la luz de los faros igual; la diferencia entre verde y naranja se nota de día.'],
      ['¿Puedo mezclar los dos colores en un mismo equipo?', 'Sí, aunque conviene un solo color por cuadrilla: así se identifica de lejos quién es de cada área.'],
    ],
  },
  'cuantos-uniformes-necesita-cada-trabajador': {
    kicker: 'Artículo',
    h1: 'Cuántos uniformes necesita cada trabajador y cada cuánto se reponen',
    h1Html: 'Cuántos uniformes<br>por trabajador.',
    title: 'Cuántos Uniformes Necesita Cada Trabajador | Works Jeans',
    description: 'Cómo calcular juegos de uniforme por persona según turnos y lavado, cuándo reponer y cómo dejar tallas extra para nuevos ingresos.',
    intro: 'Una regla sencilla: un juego puesto, uno en la lavadora y uno listo. A partir de ahí, ajusta por turno y por tipo de trabajo.',
    productsFilter: 'all',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>La regla de tres juegos</h2>
      <p>Para una jornada normal de lunes a viernes, tres juegos (camisa y pantalón) por persona permiten rotar sin que nadie llegue con el uniforme sucio: uno puesto, uno lavándose, uno limpio. Con dos juegos funciona si el lavado es diario; con uno solo, el uniforme se acaba en meses.</p>
      <h2>Ajusta por tipo de trabajo</h2>
      <ul>
        <li><strong>Obra, taller, mantenimiento:</strong> la ropa se ensucia cada día. Tres juegos como mínimo; cuatro si hay turnos largos o sábado.</li>
        <li><strong>Planta limpia, almacén, logística:</strong> dos o tres juegos suelen bastar.</li>
        <li><strong>Turnos rotativos o doble turno:</strong> suma un juego por cada turno adicional a la semana.</li>
      </ul>
      <h2>Cada cuánto reponer</h2>
      <p>Un uniforme de mezclilla 100% algodón bien cuidado aguanta muchos meses de uso diario; lo primero que se nota es el desgaste en rodillas y bolsas. Revisa la cuadrilla cada seis meses y repón por desgaste, no por calendario. Lavar al revés, con agua fría y sin cloro, alarga la vida de la tela y del color (lee <a href="/articulos/como-cuidar-la-ropa-de-trabajo-de-mezclilla-para-que-dure-mas">cómo cuidar la ropa de trabajo</a>).</p>
      <h2>Deja tallas extra para ingresos y cambios</h2>
      <p>En una cuadrilla siempre entra gente nueva y siempre hay alguien que pidió una talla menos. Al comprar la corrida, agrega entre un 5% y un 10% de piezas en las tallas más comunes (32 a 36 en pantalón, M a XG en camisa). Como fabricamos en Monterrey y tenemos stock, las reposiciones de una pieza no esperan semanas.</p>
      <h2>Ejemplo rápido</h2>
      <p>Cuadrilla de 20 personas en obra, jornada de lunes a viernes: 20 × 3 juegos = 60 camisas y 60 pantalones, más 4 o 5 piezas extra en tallas medias. Ese número es el que capturas en el <a href="/empresas">cotizador para empresas</a>.</p>
    `,
    faq: [
      ['¿Cuántos juegos necesita cada persona?', 'Depende del turno y de cada cuánto se lava. Con dos o tres juegos cada prenda descansa entre usos y el conjunto dura más que dos prendas puestas a diario.'],
      ['¿Cada cuándo se reponen?', 'Cuando aparecen desgarres en costuras o la tela se adelgaza en rodillas y asentaderas. Revisar la dotación cada semestre evita que alguien ande con la prenda rota.'],
      ['¿Conviene dejar tallas extra en almacén?', 'Sí. Un pequeño colchón en las tallas más comunes cubre ingresos nuevos y cambios sin abrir un pedido nuevo.'],
    ],
  },
  'que-debe-incluir-una-cotizacion-de-uniformes': {
    kicker: 'Artículo',
    h1: 'Qué debe incluir una cotización de uniformes (y qué preguntar antes de aceptarla)',
    h1Html: 'Qué debe incluir<br>una cotización<br>de uniformes.',
    title: 'Qué Debe Incluir una Cotización de Uniformes | Works Jeans',
    description: 'Lo que una cotización seria de uniformes debe traer: tela, tallas, precio, personalización, entrega, envío, factura y cambios. Úsala para comparar.',
    intro: 'Una cotización que solo dice "uniforme: $X" no sirve para comparar. Esto es lo que debe traer por escrito.',
    productsFilter: 'all',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>1. La prenda, con nombre y tela</h2>
      <p>Qué prenda es (camisa, pantalón), de qué tela (mezclilla 100% algodón, mezcla, poliéster) y qué acabado (preencogida o no). Si la cotización no dice la composición, pregúntala: es lo que decide cuánto dura.</p>
      <h2>2. Tallas y precio por talla</h2>
      <p>La corrida completa disponible y si el precio cambia por grupo de tallas. Las tallas grandes usan más tela; es normal que cuesten un poco más, pero debe estar escrito.</p>
      <h2>3. Personalización</h2>
      <p>Bordado o DTF, en qué posición, de qué tamaño y si el precio ya lo incluye. Si mandas tu logotipo, pide ver cómo quedará antes de producir.</p>
      <h2>4. Tiempo de entrega real</h2>
      <p>"Inmediato" solo es cierto si hay stock. Pregunta cuántas piezas hay hoy y cuánto tarda lo que no está. Un fabricante local con inventario puede entregar en días; un pedido a maquila tarda semanas.</p>
      <h2>5. Envío, factura y forma de pago</h2>
      <p>Quién paga el envío, con qué paquetería y con guía; si facturan con CFDI; y qué anticipo piden. Todo por escrito.</p>
      <h2>6. Cambios y garantía</h2>
      <p>Qué pasa si una talla no queda o si una prenda sale con defecto. Una política de cambio de talla y una garantía por defectos de fabricación son lo mínimo.</p>
      <h2>Cómo cotizamos nosotros</h2>
      <p>En el <a href="/empresas">cotizador para empresas</a> capturas prenda y piezas por talla; te respondemos por escrito con tela, precio por grupo de tallas (distribuidor o socio según el volumen), personalización, tiempo de entrega según stock, envío, factura CFDI y política de cambios. Lee también <a href="/articulos/que-preguntar-antes-de-comprar-ropa-de-trabajo-por-mayoreo">qué preguntar antes de comprar por mayoreo</a>.</p>
    `,
    faq: [
      ['¿Qué no debe faltar en una cotización de uniformes?', 'Prenda y tela, tallas y precio por talla, personalización, tiempo de entrega, costo de envío, facturación y política de cambios. Si falta alguno, pídelo antes de comparar.'],
      ['¿El precio debe venir con IVA?', 'Debe decirlo con claridad, porque cambia mucho la comparación. Nuestros precios de tienda ya incluyen IVA y facturamos con CFDI.'],
      ['¿Debe tener vigencia?', 'Sí. Una cotización seria dice hasta cuándo respeta el precio; sin eso no sabes si al autorizarla te van a cobrar lo mismo.'],
    ],
  },
  'como-cuidar-la-cinta-reflejante-para-que-no-pierda-brillo': {
    kicker: 'Artículo',
    h1: 'Cómo cuidar la cinta reflejante de la ropa de trabajo para que no pierda brillo',
    h1Html: 'Cómo cuidar<br>la cinta<br>reflejante.',
    title: 'Cómo Cuidar la Cinta Reflejante | Works Jeans',
    description: 'Lavado, secado y almacenamiento de camisas y pantalones con cinta reflejante: qué hacer y qué evitar para que la cinta siga reflejando y no se cuartee.',
    intro: 'La cinta reflejante se desgasta más por el lavado que por el trabajo. Con tres hábitos dura mucho más.',
    productsFilter: 'reflejante',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>1. Lava al revés y con agua fría</h2>
      <p>Voltea la prenda antes de meterla a la lavadora: así la cinta no roza contra el tambor ni contra otras prendas. Agua fría y ciclo normal; el agua caliente y los ciclos pesados envejecen la cinta y la tela.</p>
      <h2>2. Nada de cloro ni suavizante en exceso</h2>
      <p>El cloro opaca la cinta y destiñe la mezclilla. El suavizante deja una película que reduce el reflejo; si lo usas, que sea poco. Jabón normal es suficiente.</p>
      <h2>3. Seca a la sombra, no planches la cinta</h2>
      <p>Seca colgada a la sombra o en secadora a temperatura baja. Si planchas, hazlo por el revés y sin pasar la plancha caliente directamente sobre la cinta.</p>
      <h2>Qué es normal y qué no</h2>
      <p>Con el uso la cinta pierde algo de brillo de día; de noche sigue reflejando mientras la superficie esté íntegra. Si la cinta se cuartea, se despega o deja de reflejar con la luz de un celular en la oscuridad, es hora de reponer la prenda. En Works Jeans las cintas van cosidas, no pegadas, y tienen 30 días de garantía contra defectos de fabricación.</p>
      <p>Lee también <a href="/articulos/como-cuidar-la-ropa-de-trabajo-de-mezclilla-para-que-dure-mas">cómo cuidar la mezclilla</a> y conoce nuestra <a href="/ropa-de-trabajo-reflejante">ropa de trabajo reflejante</a>.</p>
    `,
    faq: [
      ['¿Se puede planchar encima de la cinta?', 'No. El calor directo de la plancha la daña y pierde brillo. Plancha alrededor y evita pasar por encima.'],
      ['¿La puedo meter a la secadora?', 'Mejor seca a la sombra. El calor fuerte y repetido acorta la vida de la cinta, aunque la prenda aguante bien.'],
      ['¿Cómo sé que la cinta ya no sirve?', 'Si se ve opaca, cuarteada o despegada en los bordes aunque esté limpia, ya no devuelve la luz igual y conviene reponer la prenda.'],
    ],
  },
  'camisa-de-trabajo-o-camisola-diferencias': {
    kicker: 'Artículo',
    h1: 'Camisa de trabajo o camisola: diferencias y cuándo usar cada una',
    h1Html: 'Camisa de trabajo<br>o camisola.',
    title: 'Camisa de Trabajo o Camisola: Diferencias | Works Jeans',
    description: 'Diferencias entre una camisa de trabajo de mezclilla y una camisola, en tela, cierre, bolsas y uso, y cuál conviene para obra, planta o taller.',
    intro: 'Se usan como sinónimos, pero no son lo mismo. La diferencia está en la tela, el cierre y para qué se pensó cada una.',
    productsFilter: 'camisas',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>Qué es cada una</h2>
      <p>La <strong>camisola</strong> suele ser una prenda ligera, de gabardina o mezcla de poliéster, de manga corta o larga, pensada para uniforme de servicio: se ve ordenada y es barata de reponer. La <strong>camisa de trabajo</strong> de mezclilla es una prenda más pesada, de algodón, con botones reforzados y bolsillo frontal, pensada para trabajar con las manos y protegerse de raspones.</p>
      <h2>Tela</h2>
      <p>La camisola de poliéster no se arruga y seca rápido, pero no respira y se derrite con chispa o calor. La mezclilla 100% algodón respira, aguanta raspones y lavado frecuente, y el color se asienta con el uso. Lee la comparación completa en <a href="/articulos/camisa-de-mezclilla-o-de-poliester-para-trabajar-en-planta">camisa de mezclilla o de poliéster para trabajar en planta</a>.</p>
      <h2>Cierre y bolsas</h2>
      <p>Muchas camisolas cierran con broches o botones sencillos. La camisa de trabajo lleva botones reforzados que no se desprenden al agacharse, y bolsillo frontal que sí aguanta un lápiz o un flexómetro.</p>
      <h2>Cuándo usar cada una</h2>
      <ul>
        <li><strong>Camisola:</strong> atención al público, oficinas de planta, servicios donde la prenda se ve más de lo que se usa.</li>
        <li><strong>Camisa de trabajo:</strong> obra, taller, mantenimiento, planta, logística; todo lo que raspa, ensucia y exige lavado seguido.</li>
      </ul>
      <p>Si tu gente trabaja con las manos, mira las <a href="/camisas-de-trabajo">camisas de trabajo de mezclilla</a>, de la XCH a la 5XG, con o sin cinta reflejante.</p>
    `,
    faq: [
      ['¿Cuál es la diferencia principal?', 'La camisa de trabajo se usa como prenda única, abrocha con botones y va fajada o por fuera. La camisola suele ser más holgada y se pone encima de la ropa, como una capa extra.'],
      ['¿Cuál conviene en planta?', 'La camisa de mezclilla, por el corte sin partes sueltas que puedan engancharse con maquinaria.'],
      ['¿Works Jeans fabrica camisola?', 'Fabricamos camisa de trabajo de mezclilla 100% algodón, de la XCH a la 5XG, con o sin cinta reflejante. Si necesitas otra prenda, escríbenos y te decimos si podemos ayudarte.'],
    ],
  },
  'tallas-grandes-de-ropa-de-trabajo-como-medir-y-pedir': {
    kicker: 'Artículo',
    h1: 'Tallas grandes de ropa de trabajo: cómo medir y pedir sin equivocarte',
    h1Html: 'Tallas grandes:<br>cómo medir<br>y pedir.',
    title: 'Tallas Grandes: Cómo Medir y Pedir | Works Jeans',
    description: 'Cómo tomar medidas para pantalón 44 a 50 y camisa 2XG a 5XG, qué talla elegir si estás entre dos y cómo pedirlas en una corrida de uniformes.',
    intro: 'En tallas grandes equivocarse cuesta más, porque hay menos dónde escoger. Mide con la tabla y pide con calma.',
    productsFilter: 'all',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>Mide una prenda, no el cuerpo</h2>
      <p>La forma más confiable es medir un pantalón y una camisa que ya te queden bien, extendidos sobre una mesa, y comparar con nuestra <a href="/guia-de-tallas">guía de tallas</a>. Pantalón: cintura abrochada de lado a lado (multiplica por dos), cadera en la parte más ancha y largo de la pretina al borde. Camisa: pecho bajo la axila de costura a costura, hombros por la espalda y largo del hombro al borde.</p>
      <h2>Las medidas en tallas grandes</h2>
      <p>Pantalón: 44 mide 45" de cintura y 50" de cadera; 46, 47" y 52"; 48, 49" y 54"; 50, 51" y 56". Largo de 32" en todas. Camisa: 2XG mide 51.8" de pecho; 3XG, 54.3"; 4XG, 56"; 5XG, 59". Tolerancia de ±1" en todas las medidas.</p>
      <h2>Si estás entre dos tallas</h2>
      <p>Elige la mayor. La mezclilla es preencogida (no va a dar de sí ni a encoger), y en el trabajo conviene espacio para agacharse y levantar los brazos. Un pantalón que aprieta en la cintura se rompe antes en el tiro.</p>
      <h2>Al pedir para una cuadrilla</h2>
      <p>Levanta las tallas midiendo prendas, no preguntando de memoria: mucha gente dice la talla que usaba hace años. Incluye las tallas grandes en la corrida desde el primer pedido y agrega una o dos piezas extra en 44 a 48 y en 2XG a 4XG, que son las que más se repiten. Conoce la <a href="/ropa-de-trabajo-tallas-grandes">ropa de trabajo en tallas grandes</a> que tenemos en stock.</p>
    `,
    faq: [
      ['¿Hasta qué talla manejan?', 'Pantalón hasta la 50 y camisa hasta la 5XG, con existencia igual que las tallas chicas.'],
      ['¿Cambia el patrón en las tallas grandes?', 'Es el mismo patrón, la misma mezclilla y el mismo acabado que en cualquier otra talla; solo cambia el tamaño.'],
      ['¿Cómo mido si no tengo cinta de sastre?', 'Mide una prenda que te quede bien, extendida sobre la mesa: de costura a costura y multiplica por dos. Así sacas cintura o pecho sin medirte encima.'],
    ],
  },
  'bordado-en-mezclilla-tamanos-posiciones-y-colores': {
    kicker: 'Artículo',
    h1: 'Bordado en mezclilla: tamaños, posiciones y colores que sí se ven',
    h1Html: 'Bordado en<br>mezclilla: tamaños<br>y posiciones.',
    title: 'Bordado en Mezclilla: Tamaños y Posiciones | Works Jeans',
    description: 'Dónde poner el logotipo bordado en mezclilla, qué tamaño funciona, qué colores contrastan con el índigo y qué archivo mandar al proveedor.',
    intro: 'Un logotipo bien bordado se ve a metros y dura lo que dura la prenda. Uno mal planeado se pierde en el azul.',
    productsFilter: 'all',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>Posiciones que funcionan</h2>
      <ul>
        <li><strong>Pecho izquierdo</strong> (sobre el bolsillo o al lado): la posición clásica para el logotipo de la empresa.</li>
        <li><strong>Manga:</strong> para el nombre del área, un segundo logotipo o la bandera.</li>
        <li><strong>Espalda alta:</strong> para el nombre de la empresa en grande, útil en obra y patio.</li>
        <li><strong>Pantalón:</strong> bolsa trasera o parte baja de la pierna; en prendas reflejantes, siempre en zonas libres de cinta.</li>
      </ul>
      <h2>Tamaños</h2>
      <p>Pecho: entre 7 y 10 cm de ancho es lo habitual; más grande se ve pesado sobre mezclilla. Espalda: 20 a 28 cm de ancho. Manga: 5 a 7 cm. Los detalles muy finos (líneas delgadas, letras menores a 5 mm) se pierden en el bordado; simplifica el logotipo si hace falta.</p>
      <h2>Colores sobre índigo</h2>
      <p>La mezclilla es azul oscuro, así que contrastan el blanco, el amarillo, el naranja, el gris claro y el rojo. El azul marino y el negro se pierden. Si tu logotipo es azul, pide una versión en blanco o amarillo para el uniforme.</p>
      <h2>Bordado o DTF</h2>
      <p>El bordado aguanta lavados sin fin y se ve premium; el DTF (estampado por transferencia) permite degradados y fotos, y cuesta menos en tirajes cortos. Lee la comparación en <a href="/articulos/bordado-o-dtf-como-poner-tu-logotipo-en-uniformes-de-trabajo">bordado o DTF: cómo poner tu logotipo</a>.</p>
      <h2>Qué mandar</h2>
      <p>El logotipo en archivo vectorial (AI, SVG o PDF) o en PNG de alta resolución, los colores que quieres y la posición. Con eso te decimos tamaño final y precio junto con la corrida de tallas en el <a href="/empresas">cotizador para empresas</a>.</p>
    `,
    faq: [
      ['¿Dónde queda mejor el logotipo?', 'En el pecho izquierdo o en la manga. Sobre la bolsa se deforma con el uso y cuesta más que quede parejo.'],
      ['¿Qué colores se ven bien sobre el índigo?', 'Los claros y los saturados. Los azules oscuros y los grises se pierden contra la tela y el logotipo deja de leerse a distancia.'],
      ['¿Qué archivo necesitan de mi logotipo?', 'El logotipo en vectorial o en imagen de alta resolución. Lo revisamos contigo antes de bordar y te decimos si conviene simplificar algún detalle.'],
    ],
  },
  'ropa-de-trabajo-para-clima-caliente': {
    kicker: 'Artículo',
    h1: 'Ropa de trabajo para clima caliente: por qué mezclilla 100% algodón',
    h1Html: 'Ropa de trabajo<br>para clima<br>caliente.',
    title: 'Ropa de Trabajo para Clima Caliente | Works Jeans',
    description: 'Cómo elegir ropa de trabajo para el calor del norte de México: por qué el algodón respira mejor que el poliéster y qué corte ayuda en verano.',
    intro: 'En el norte se trabaja a 40 grados. La tela que llevas puesta ocho horas decide qué tan pesado se hace el día.',
    productsFilter: 'all',
    publishedAt: PUBLISHED_2,
    body: `
      <h2>Algodón contra poliéster</h2>
      <p>El algodón absorbe el sudor y deja que se evapore; el poliéster lo retiene contra la piel y calienta. Por eso una camisa de mezclilla 100% algodón, aunque sea más pesada que una camisola sintética, se siente más fresca a media tarde. Además no se derrite con chispa ni calor, algo que importa en taller y soldadura.</p>
      <h2>El corte también ventila</h2>
      <p>Un pantalón de corte recto y una camisa que no aprieta dejan pasar aire y no se pegan al cuerpo. Los cortes entallados de moda son lo contrario de lo que se quiere en el calor. Si dudas entre dos tallas, la mayor ventila mejor.</p>
      <h2>Manga larga, aunque parezca contradictorio</h2>
      <p>En obra y campo la manga larga protege del sol directo y de raspones, y con algodón no da más calor que la corta. Muchas cuadrillas la suben cuando trabajan a la sombra y la bajan bajo el sol.</p>
      <h2>Cuida la prenda en verano</h2>
      <p>Se lava más seguido: agua fría, al revés y sin cloro para que el color aguante el sol. Ten al menos tres juegos por persona para rotar (lee <a href="/articulos/cuantos-uniformes-necesita-cada-trabajador">cuántos uniformes necesita cada trabajador</a>).</p>
      <p>Nuestros <a href="/pantalones-de-trabajo">pantalones</a> y <a href="/camisas-de-trabajo">camisas de trabajo</a> se fabrican en Monterrey con mezclilla 100% algodón preencogida, para el clima donde se usan.</p>
    `,
    faq: [
      ['¿No da más calor la mezclilla que una tela delgada?', 'El algodón absorbe el sudor y lo deja evaporar, así que enfría al secarse. El poliéster lo retiene contra la piel y por eso se siente más caliente aunque pese menos.'],
      ['¿Qué corte ayuda en verano?', 'El recto. Deja circular el aire entre la tela y la piel; el entallado pega la prenda al cuerpo y da más calor.'],
      ['¿Conviene manga larga con sol directo?', 'Sí. La manga larga de algodón protege la piel del sol y no se siente más caliente que la corta cuando trabajas expuesto.'],
    ],
  },
};

module.exports = { LANDINGS_EXTRA, ARTICLES_EXTRA, PUBLISHED_2 };

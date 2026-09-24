// Ejemplo de generación de video con Seedance 2.5 a través del SDK oficial de Higgsfield.
//
// Antes de correrlo hay que poner la llave en .env.local, en formato id:secreto:
//   HF_CREDENTIALS=tu-key-id:tu-key-secret
// Ese archivo está ignorado por Git y la llave nunca se imprime ni se guarda en el repositorio.
//
// Uso:  npm run higgsfield
//
// Ojo: cada corrida es una generación facturable en tu cuenta de Higgsfield.

require('dotenv').config({ path: '.env.local' });

const { higgsfield, config } = require('@higgsfield/client/v2');

const MODELO = 'bytedance/seedance-2.5/text-to-video';
const ENTRADA = {
  prompt: 'A cinematic scene at sunset',
  duration: 5,
  resolution: '720p',
  aspect_ratio: '16:9',
};

function urlDelVideo(jobSet) {
  for (const job of jobSet.jobs || []) {
    const url = job.results?.raw?.url;
    if (url) return url;
  }
  return null;
}

async function main() {
  const credenciales = process.env.HF_CREDENTIALS;
  if (!credenciales || !credenciales.includes(':')) {
    console.error('Falta HF_CREDENTIALS en .env.local, en formato key-id:key-secret.');
    process.exitCode = 1;
    return;
  }
  config({ credentials: credenciales });

  console.log(`Generando con ${MODELO}…`);
  console.log(`Prompt: "${ENTRADA.prompt}" · ${ENTRADA.duration}s · ${ENTRADA.resolution} · ${ENTRADA.aspect_ratio}`);

  let jobSet;
  try {
    jobSet = await higgsfield.subscribe(MODELO, { input: ENTRADA, withPolling: true });
  } catch (err) {
    // El mensaje del SDK puede traer el motivo (créditos, permisos, modelo inválido).
    console.error('La petición no se pudo completar:', err?.message || err);
    process.exitCode = 1;
    return;
  }

  // Un resultado que no sea "completado" no es un éxito, aunque la petición haya respondido.
  if (jobSet.isNsfw) {
    console.error('La generación fue rechazada por moderación. No se cobró.');
    process.exitCode = 1;
    return;
  }
  if (jobSet.isFailed) {
    console.error('La generación falló del lado de Higgsfield. No se cobró.');
    process.exitCode = 1;
    return;
  }
  if (!jobSet.isCompleted) {
    console.error(`La generación terminó en un estado inesperado (id ${jobSet.id}). No hay video.`);
    process.exitCode = 1;
    return;
  }

  const url = urlDelVideo(jobSet);
  if (!url) {
    console.error('La generación se completó pero no vino ninguna URL de video.');
    process.exitCode = 1;
    return;
  }

  console.log('Video listo:');
  console.log(url);
}

main();

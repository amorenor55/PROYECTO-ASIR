const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const {
  onDocumentDeleted,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");

// Inicializa el SDK de administración para que las funciones puedan
// consultar Firestore y borrar archivos de Storage.
initializeApp();

// Si falla la limpieza, Firebase puede volver a ejecutar la función.
const opciones = { retry: true };

function ids(datos) {
  // Solo se tienen en cuenta los documentos con un identificador de Storage
  // que siga el formato esperado para construir la ruta del PDF.
  return (datos?.documentos ?? [])
    .map((documento) => documento.archivoId)
    .filter((id) => typeof id === "string" && /^[a-f0-9-]{36}$/.test(id));
}

async function borrar(ordenId, archivos) {
  if (!archivos.length) return;

  const base = getFirestore();

  // Antes de borrar un PDF se comprueba si sigue vinculado a la orden
  // activa o a su copia en la papelera.
  const [orden, papelera] = await base.getAll(
    base.doc(`ordenes/${ordenId}`),
    base.doc(`papeleraOrdenes/${ordenId}`),
  );

  const vinculados = new Set([
    ...ids(orden.data()),
    ...ids(papelera.data()?.orden),
  ]);

  const bucket = getStorage().bucket();

  // Se borran en paralelo los PDF que ya no están vinculados.
  // Si un intento anterior ya los borró, su ausencia se ignora.
  await Promise.all(
    archivos
      .filter((id) => !vinculados.has(id))
      .map((id) =>
        bucket
          .file(`adjuntos/${ordenId}/${id}.pdf`)
          .delete({ ignoreNotFound: true }),
      ),
  );
}

// Cuando se actualiza una orden, se comparan sus adjuntos antes y después
// del cambio para detectar los PDF que se han retirado.
exports.limpiarAdjuntosRetirados = onDocumentUpdated(
  { ...opciones, document: "ordenes/{ordenId}" },
  async (evento) => {
    const antes = ids(evento.data?.before.data());
    const quedan = ids(evento.data?.after.data());

    await borrar(
      evento.params.ordenId,
      antes.filter((id) => !quedan.includes(id)),
    );
  },
);

// Esta función se ejecuta cuando desaparece un documento de la papelera.
// La política TTL de Firestore puede provocar ese borrado al caducar el plazo.
exports.limpiarAdjuntosCaducados = onDocumentDeleted(
  { ...opciones, document: "papeleraOrdenes/{ordenId}" },
  async (evento) => {
    const copia = evento.data?.data();

    // Recuperar una orden también elimina su copia de la papelera.
    // Si aún no han pasado los 15 días, se conservan los archivos.
    // La comparación usa la hora del evento, incluso si se reintenta más tarde.
    if (
      !copia?.eliminadaEn ||
      Date.parse(evento.time) < copia.eliminadaEn.toMillis() + 15 * 86400000
    ) {
      return;
    }

    const ordenId = evento.params.ordenId;

    // Al vencer el plazo, se limpian los PDF y las fotos de esa orden.
    await borrar(ordenId, ids(copia.orden));
    await getStorage().bucket().deleteFiles({ prefix: `fotos/${ordenId}/` });
  },
);
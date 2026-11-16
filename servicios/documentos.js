"use client";

import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";
import { obtenerFirebase } from "./firebase";
import { guardarDocumentos } from "./ordenes";

function referencia(ordenId, archivoId) {
  return ref(obtenerFirebase().archivos, `adjuntos/${ordenId}/${archivoId}.pdf`);
}

export async function adjuntarPDF(usuario, orden, archivo, nombre, tipo) {
  const archivoId = crypto.randomUUID();
  const objeto = referencia(orden.identificador, archivoId);
  await uploadBytes(objeto, archivo, { contentType: "application/pdf" });
  try {
    return await guardarDocumentos(usuario, orden, [
      ...(orden.documentos ?? []), { archivoId, nombre, tipo },
    ]);
  } catch (error) {
    // Storage solo permite borrar si el archivo no está vinculado.
    await deleteObject(objeto).catch(() => {});
    throw error;
  }
}

export function obtenerPDF(ordenId, documento) {
  if (documento.archivoId)
    return getBlob(referencia(ordenId, documento.archivoId), 20 * 1024 * 1024);
  return new Blob([documento.contenido.toUint8Array()], { type: "application/pdf" });
}

export async function retirarPDF(usuario, orden, indice) {
  return guardarDocumentos(usuario, orden, orden.documentos.filter((_, i) => i !== indice));
}

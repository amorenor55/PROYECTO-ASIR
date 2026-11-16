"use client";

import { deleteObject, getBlob, listAll, ref, uploadBytes } from "firebase/storage";
import { obtenerFirebase } from "./firebase";

export const categoriasFotos = {
  entrada: "Entrada",
  salida: "Salida",
  danos: "Daños",
  recambios: "Recambios",
  otros: "Otros",
};

const maximoBytes = 10 * 1024 * 1024;
const extensiones = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function carpetaFotos(ordenId) {
  return ref(obtenerFirebase().archivos, `fotos/${ordenId}`);
}

export async function listarFotos(ordenId) {
  const { items } = await listAll(carpetaFotos(ordenId));
  return items.map((objeto) => ({
    id: objeto.name,
    categoria: categoriasFotos[objeto.name.split("_")[0]],
    objeto,
  })).filter((foto) => foto.categoria);
}

export function subirFoto(ordenId, categoria, archivo) {
  const extension = extensiones[archivo?.type];
  if (!extension) throw new Error("Selecciona una imagen JPG, PNG o WebP.");
  if (!archivo.size || archivo.size > maximoBytes)
    throw new Error("La imagen debe pesar entre 1 byte y 10 MB.");
  const nombre = `${categoria}_${crypto.randomUUID()}.${extension}`;
  return uploadBytes(ref(carpetaFotos(ordenId), nombre), archivo, {
    contentType: archivo.type,
  });
}

export function descargarFoto(foto) {
  return getBlob(foto.objeto, maximoBytes);
}

export function retirarFoto(foto) {
  return deleteObject(foto.objeto);
}

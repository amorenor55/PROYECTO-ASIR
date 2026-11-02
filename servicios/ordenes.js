"use client";
/**
 * Único módulo que consulta y modifica las órdenes de Firestore.
 * Las pantallas llaman a estas funciones y no construyen escrituras por su cuenta.
 */
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { obtenerFirebase } from "./firebase";
import {
  comprobarPerfil,
  validarRecepcion,
  validarDiagnostico,
  puedeConsultar,
} from "@/modelo/validaciones.mjs";

// Añade el identificador y transforma las fechas para que las pantallas reciban datos uniformes.
function convertirDocumento(documento) {
  const datos = documento.data();
  // Timestamp es un tipo de Firebase: se convierte para mostrar la fecha.
  return {
    ...datos,
    identificador: documento.id,
    creadaEn: datos.creadaEn?.toDate?.().toISOString() || "",
    actualizadaEn: datos.actualizadaEn?.toDate?.().toISOString() || "",
  };
}

/** Escucha las últimas 100 órdenes autorizadas y devuelve cómo cancelar la escucha.
 * El límite reduce las lecturas; el panel y los filtros usan este mismo conjunto.
 */
export function escucharOrdenes(usuario, recibirOrdenes, recibirError) {
  const { baseDatos } = obtenerFirebase();
  const condiciones =
    usuario.perfil === "MECANICO"
      ? [where("mecanicoId", "==", usuario.identificador)]
      : [];
  // La consulta debe coincidir con las reglas: un mecánico no solicita órdenes ajenas.
  const consulta = query(
    collection(baseDatos, "ordenes"),
    ...condiciones,
    orderBy("actualizadaEn", "desc"),
    limit(100),
  );
  return onSnapshot(
    consulta,
    (resultado) => recibirOrdenes(resultado.docs.map(convertirDocumento)),
    recibirError,
  );
}

// Lee una ficha por su identificador; si no existe o no es accesible, detiene la operación.
export async function obtenerOrden(usuario, identificador) {
  const { baseDatos } = obtenerFirebase();
  const documento = await getDoc(doc(baseDatos, "ordenes", identificador));
  if (!documento.exists() || !puedeConsultar(usuario, documento.data()))
    throw new Error("Orden no encontrada o sin permiso de acceso.");
  return convertirDocumento(documento);
}

/** Valida la recepción y guarda una orden nueva.
 * Devuelve su identificador para abrir la ficha después de guardar.
 */
export async function crearOrden(usuario, datos, equipo) {
  comprobarPerfil(usuario, ["ADMINISTRACION", "RECEPCION"]);
  const recepcion = validarRecepcion(datos, equipo);
  const { baseDatos } = obtenerFirebase();
  const referencia = doc(collection(baseDatos, "ordenes"));
  const contador = doc(baseDatos, "contadores", "ordenes");
  // Una transacción reserva el número y crea la orden como una sola operación.
  // Si dos personas crean una orden a la vez, Firestore vuelve a intentarlo.
  await runTransaction(baseDatos, async (transaccion) => {
    const documentoContador = await transaccion.get(contador);
    const numero =
      (documentoContador.exists() ? documentoContador.data().ultimoNumero : 0) +
      1;
    transaccion.set(contador, {
      ultimoNumero: numero,
      ultimaOrdenId: referencia.id,
    });
    transaccion.set(referencia, {
      ...recepcion,
      numero,
      diagnostico: "",
      estado: "Pendiente",
      // La hora la asigna Firestore para no depender del reloj de cada ordenador.
      creadaEn: serverTimestamp(),
      actualizadaEn: serverTimestamp(),
      revision: 1,
    });
  });
  return referencia.id;
}

/** Guarda el seguimiento sin modificar los datos de recepción.
 * La transacción comprueba la revisión y el estado sobre los datos actuales.
 */
export async function guardarDiagnostico(usuario, orden, datos) {
  comprobarPerfil(usuario, ["ADMINISTRACION", "MECANICO"]);
  const cambios = validarDiagnostico(datos);
  const { baseDatos } = obtenerFirebase();
  const referencia = doc(baseDatos, "ordenes", orden.identificador);
  await runTransaction(baseDatos, async (transaccion) => {
    const documento = await transaccion.get(referencia);
    if (!documento.exists() || !puedeConsultar(usuario, documento.data()))
      throw new Error("No tienes acceso a esta orden.");
    const actual = documento.data();
    // Evita sobrescribir el diagnóstico de otra persona con una ficha antigua.
    if (actual.revision !== orden.revision)
      throw new Error(
        "La orden ha cambiado. Recarga la ficha antes de guardar.",
      );
    if (actual.estado === "Finalizado")
      throw new Error("La orden está finalizada y es de solo consulta.");
    transaccion.update(referencia, {
      ...cambios,
      revision: actual.revision + 1,
      actualizadaEn: serverTimestamp(),
    });
  });
  return obtenerOrden(usuario, orden.identificador);
}

// Traduce los fallos habituales de Firebase a mensajes comprensibles para el usuario.
export function explicarError(error) {
  if (error?.code === "permission-denied")
    return "No tienes permiso. Revisa el perfil del usuario y las reglas de Firestore.";
  if (error?.code === "unavailable")
    return "No se pudo conectar con la base de datos. Comprueba tu conexión.";
  if (error?.code === "failed-precondition")
    return "Falta habilitar el índice de Firestore indicado en las instrucciones.";
  return error?.message || "No se pudo completar la operación.";
}

// El formato visible no cambia el número guardado: 1 se presenta como OR-0001.
export function mostrarNumero(numero) {
  return "OR-" + String(numero).padStart(4, "0");
}

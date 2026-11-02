"use client";
/** Comparte la escucha de órdenes entre el panel y el listado. */
import { useEffect, useState } from "react";
import { escucharOrdenes, explicarError } from "./ordenes";
export function usarOrdenes(usuario) {
  const [ordenes, establecerOrdenes] = useState(null);
  const [error, establecerError] = useState("");
  useEffect(() => {
    establecerOrdenes(null);
    establecerError("");
    if (!usuario) return;
    // onSnapshot devuelve una función que cancela la escucha al salir de la página.
    return escucharOrdenes(usuario, establecerOrdenes, (fallo) =>
      establecerError(explicarError(fallo)),
    );
  }, [usuario?.identificador, usuario?.perfil]);
  return { ordenes, error };
}

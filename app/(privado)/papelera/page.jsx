"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import {
  escucharPapelera,
  recuperarOrden,
  explicarError,
  mostrarNumero,
} from "@/servicios/ordenes";

export default function Papelera() {
  const { usuario } = usarSesion();

  // null indica que la lista todavía está cargando. Una lista vacía indica
  // que ya se recibieron los datos y no hay órdenes en la papelera.
  const [ordenes, establecerOrdenes] = useState(null);
  const [error, establecerError] = useState("");
  const [mensaje, establecerMensaje] = useState("");
  const [recuperando, establecerRecuperando] = useState(false);
  const [ahora, establecerAhora] = useState(() => Date.now());

  useEffect(() => {
    // Solo se inicia la consulta si la sesión tiene perfil de administración.
    if (usuario?.perfil !== "ADMINISTRACION") return;

    // La suscripción actualiza la lista cuando cambia el contenido de la papelera.
    const detener = escucharPapelera(usuario, establecerOrdenes, (fallo) =>
      establecerError(explicarError(fallo)),
    );

    // El reloj permite ocultar las órdenes que caducan con la página abierta.
    const reloj = setInterval(() => establecerAhora(Date.now()), 1000);

    // Al salir de la página o cambiar de sesión, se cierran la consulta y el reloj.
    return () => {
      detener();
      clearInterval(reloj);
    };
  }, [usuario]);

  async function recuperar(identificador) {
    // Se desactivan los botones mientras se tramita la recuperación.
    establecerRecuperando(true);
    establecerError("");
    establecerMensaje("");

    try {
      await recuperarOrden(usuario, identificador);

      // Se guarda el identificador para enlazar con la ficha recuperada.
      establecerMensaje(identificador);
    } catch (fallo) {
      establecerError(explicarError(fallo));
    } finally {
      // Los botones se vuelven a habilitar aunque falle la operación.
      establecerRecuperando(false);
    }
  }

  if (usuario?.perfil !== "ADMINISTRACION") {
    return (
      <p className="aviso error">
        La papelera es de uso exclusivo de administración.
      </p>
    );
  }

  // Este filtro solo afecta a la lista visible. Firestore comprueba el plazo
  // al restaurar la orden y su política TTL se encarga del borrado definitivo.
  const recuperables = ordenes?.filter((orden) => orden.vence > ahora);

  return (
    <section className="tarjeta">
      <h1>Papelera de órdenes</h1>
      <p>Dispones de 15 días para recuperar una orden eliminada.</p>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      {mensaje && (
        <p className="aviso correcto" role="status">
          Orden recuperada.{" "}
          <Link className="enlace" href={`/ordenes/${mensaje}`}>
            Abrir ficha
          </Link>
        </p>
      )}

      {!ordenes && !error && <p role="status">Cargando papelera…</p>}
      {recuperables?.length === 0 && <p>No hay órdenes recuperables.</p>}

      {Boolean(recuperables?.length) && (
        <div className="tabla-desplazable">
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Matrícula</th>
                <th>Recuperable hasta</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {recuperables.map((orden) => (
                <tr key={orden.identificador}>
                  <td>{mostrarNumero(orden.numero)}</td>
                  <td>{orden.matricula}</td>
                  <td>{new Date(orden.vence).toLocaleString("es-ES")}</td>
                  <td>
                    <button
                      className="boton secundario"
                      disabled={recuperando}
                      onClick={() => recuperar(orden.identificador)}
                    >
                      Recuperar orden
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
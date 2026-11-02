"use client";
/** Consulta la recepción y permite al mecánico asignado registrar el diagnóstico. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import {
  obtenerOrden,
  guardarDiagnostico,
  explicarError,
  mostrarNumero,
} from "@/servicios/ordenes";
import { ESTADOS } from "@/modelo/validaciones.mjs";
import EtiquetaEstado from "./EtiquetaEstado";
export default function FichaOrden({ identificador }) {
  const { usuario, equipo } = usarSesion();
  const [orden, establecerOrden] = useState(null);
  const [error, establecerError] = useState("");
  const [mensaje, establecerMensaje] = useState("");
  const [guardando, establecerGuardando] = useState(false);
  useEffect(() => {
    // Ignora una respuesta tardía si se ha cambiado de ficha o abandonado la página.
    let vigente = true;
    establecerOrden(null);
    establecerError("");
    if (usuario)
      obtenerOrden(usuario, identificador)
        .then((resultado) => {
          if (vigente) establecerOrden(resultado);
        })
        .catch((fallo) => {
          if (vigente) establecerError(explicarError(fallo));
        });
    return () => {
      vigente = false;
    };
  }, [identificador, usuario?.identificador, usuario?.perfil]);
  // Actualiza la ficha con la respuesta guardada para conservar su nueva revisión.
  async function guardar(evento) {
    evento.preventDefault();
    establecerGuardando(true);
    establecerError("");
    establecerMensaje("");
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      establecerOrden(await guardarDiagnostico(usuario, orden, datos));
      establecerMensaje("Diagnóstico guardado.");
    } catch (fallo) {
      establecerError(explicarError(fallo));
    } finally {
      establecerGuardando(false);
    }
  }
  if (!orden)
    return error ? (
      <p className="aviso error" role="alert">
        {error}
      </p>
    ) : (
      <p role="status">Cargando ficha…</p>
    );
  // Este control adapta la interfaz; las reglas de Firestore vuelven a exigir el permiso.
  const puedeEditar =
    ["ADMINISTRACION", "MECANICO"].includes(usuario.perfil) &&
    orden.estado !== "Finalizado";
  return (
    <>
      <Link className="enlace" href="/ordenes">
        ← Volver a las órdenes
      </Link>
      <div className="titulo-pagina">
        <div>
          <p className="rotulo">{mostrarNumero(orden.numero)}</p>
          <h1>{orden.matricula}</h1>
          <p className="texto-suave">{orden.vehiculo}</p>
        </div>
        <EtiquetaEstado estado={orden.estado} />
      </div>
      {error ? (
        <p className="aviso error" role="alert">
          {error}{" "}
          <button className="enlace" onClick={() => window.location.reload()}>
            Recargar ficha
          </button>
        </p>
      ) : null}
      {mensaje ? (
        <p className="aviso correcto" role="status">
          {mensaje}
        </p>
      ) : null}
      <div className="rejilla-ficha">
        <section className="tarjeta">
          <h2>Recepción del vehículo</h2>
          <dl>
            <dt>Cliente</dt>
            <dd>{orden.cliente}</dd>
            <dt>Mecánico</dt>
            <dd>
              {equipo.find(
                (persona) => persona.identificador === orden.mecanicoId,
              )?.nombre || "Sin asignar"}
            </dd>
            <dt>Fecha de entrada</dt>
            <dd>{new Date(orden.creadaEn).toLocaleString("es-ES")}</dd>
          </dl>
          <h3>Motivo de la visita</h3>
          <p className="texto-largo">{orden.motivo}</p>
        </section>
        {/* Al cambiar la revisión se reconstruye el formulario con los valores guardados. */}
        <form className="tarjeta" key={orden.revision} onSubmit={guardar}>
          <h2>Diagnóstico y seguimiento</h2>
          <fieldset disabled={!puedeEditar || guardando}>
            <label>
              Diagnóstico
              <textarea
                name="diagnostico"
                defaultValue={orden.diagnostico}
                maxLength={4000}
                rows={7}
              />
            </label>
            <label>
              Estado
              <select name="estado" defaultValue={orden.estado}>
                {ESTADOS.map((estado) => (
                  <option key={estado}>{estado}</option>
                ))}
              </select>
            </label>
            {puedeEditar ? (
              <div className="acciones-formulario">
                <button className="boton principal" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar diagnóstico"}
                </button>
              </div>
            ) : null}
          </fieldset>
          {orden.estado === "Finalizado" ? (
            <p className="texto-suave">
              Orden finalizada. Disponible para consulta.
            </p>
          ) : null}
        </form>
      </div>
    </>
  );
}

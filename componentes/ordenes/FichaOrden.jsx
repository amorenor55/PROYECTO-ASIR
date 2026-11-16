"use client";
/** Consulta la recepción y permite al mecánico asignado registrar el diagnóstico. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DocumentosOrden from "./DocumentosOrden";
import GaleriaOrden from "./GaleriaOrden";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import {
  obtenerOrden,
  asignarMecanico,
  reabrirOrden,
  enviarAPapelera,
  guardarDiagnostico,
  explicarError,
  mostrarNumero,
} from "@/servicios/ordenes";
import { ESTADOS, validarDiagnostico } from "@/modelo/validaciones.mjs";
import EtiquetaEstado from "./EtiquetaEstado";
export default function FichaOrden({ identificador }) {
  const { usuario, equipo } = usarSesion();
  const navegador = useRouter();
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
  // Todas las operaciones actualizan la revisión de la ficha al terminar.
  async function ejecutar(operacion, confirmacion) {
    establecerGuardando(true);
    establecerError("");
    establecerMensaje("");
    try {
      const resultado = await operacion();
      if (!resultado) return;
      establecerOrden(resultado);
      establecerMensaje(confirmacion);
    } catch (fallo) {
      establecerError(explicarError(fallo));
    } finally {
      establecerGuardando(false);
    }
  }

  function guardar(evento) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    ejecutar(() => {
      validarDiagnostico(datos);
      if (datos.estado === "Finalizado" &&
          !window.confirm("¿Quieres finalizar esta orden?")) return;
      return guardarDiagnostico(usuario, orden, datos);
    }, datos.estado === "Finalizado" ? "Orden finalizada." : "Diagnóstico guardado.");
  }

  function guardarAsignacion(evento) {
    evento.preventDefault();
    const mecanicoId = new FormData(evento.currentTarget).get("mecanicoId");
    if (mecanicoId === orden.mecanicoId) return;
    ejecutar(() => asignarMecanico(usuario, orden, mecanicoId, equipo), "Asignación actualizada.");
  }
  function eliminar() {
    const confirmacion = window.prompt("Escribe CONFIRMAR para enviar la orden a la papelera durante 15 días.");
    if (confirmacion === null) return;
    ejecutar(async () => {
      await enviarAPapelera(usuario, orden, confirmacion);
      navegador.push("/papelera");
    });
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
  const puedeAsignar =
    ["ADMINISTRACION", "RECEPCION"].includes(usuario.perfil) &&
    orden.estado !== "Finalizado";
  const mecanicos = equipo.filter((persona) => persona.perfil === "MECANICO" && persona.activo);
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
              )?.nombre || (orden.mecanicoId ? "Mecánico no disponible" : "Sin asignar")}
            </dd>
            <dt>Fecha de entrada</dt>
            <dd>{new Date(orden.creadaEn).toLocaleString("es-ES")}</dd>
          </dl>
          {puedeAsignar ? (
            <form key={orden.mecanicoId} onSubmit={guardarAsignacion}>
              <fieldset disabled={guardando}>
                <label>
                  Cambiar mecánico
                  <select name="mecanicoId" defaultValue={orden.mecanicoId}>
                    <option value="">Sin asignar</option>
                    {orden.mecanicoId && !mecanicos.some((persona) => persona.identificador === orden.mecanicoId) ? (
                      <option value={orden.mecanicoId} disabled>Mecánico no disponible</option>
                    ) : null}
                    {mecanicos.map((persona) => (
                      <option key={persona.identificador} value={persona.identificador}>{persona.nombre}</option>
                    ))}
                  </select>
                </label>
                <button className="boton principal">Guardar asignación</button>
              </fieldset>
            </form>
          ) : null}
          <h3>Motivo de la visita</h3>
          <p className="texto-largo">{orden.motivo}</p>
        </section>
        {/* Una reasignación no borra el diagnóstico que se está escribiendo. */}
        <form className="tarjeta" key={JSON.stringify([orden.identificador, orden.diagnostico, orden.estado])} onSubmit={guardar}>
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
          {orden.estado === "Finalizado" && usuario.perfil === "ADMINISTRACION" ? (
            <button
              className="boton principal"
              type="button"
              disabled={guardando}
              onClick={() => ejecutar(() => reabrirOrden(usuario, orden), "Orden reabierta.")}
            >
              Reabrir orden
            </button>
          ) : null}
        </form>
      </div>
      <GaleriaOrden key={`galeria-${orden.identificador}`} usuario={usuario} orden={orden}
        guardando={guardando} ejecutar={ejecutar} />
      <DocumentosOrden key={`documentos-${orden.identificador}`} usuario={usuario} orden={orden}
        guardando={guardando} ejecutar={ejecutar} />
      {usuario.perfil === "ADMINISTRACION" && (
        <div className="acciones-formulario">
          <button className="boton secundario" type="button" disabled={guardando} onClick={eliminar}>
            Enviar a la papelera
          </button>
        </div>
      )}
    </>
  );
}

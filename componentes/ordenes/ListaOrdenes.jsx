"use client";

/** Muestra y filtra las órdenes que el usuario tiene permiso para consultar. */
import { useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import { usarOrdenes } from "@/servicios/usarOrdenes";
import { mostrarNumero } from "@/servicios/ordenes";
import { ESTADOS } from "@/modelo/validaciones.mjs";
import EtiquetaEstado from "./EtiquetaEstado";

export default function ListaOrdenes() {
  // La sesión aporta el usuario para la consulta y el equipo para mostrar
  // el nombre del mecánico asignado a cada orden.
  const { usuario, equipo } = usarSesion();
  const { ordenes, error } = usarOrdenes(usuario);

  const [busqueda, establecerBusqueda] = useState("");
  const [estado, establecerEstado] = useState("");

  if (error) {
    return (
      <p className="aviso error" role="alert">
        {error}
      </p>
    );
  }

  // Mientras no se haya recibido la lista, se muestra el aviso de carga.
  if (!ordenes) return <p role="status">Cargando órdenes…</p>;

  // Se quitan los espacios de los extremos y se pasa el texto a minúsculas
  // para que la búsqueda funcione igual con mayúsculas y minúsculas.
  const textoBuscado = busqueda.trim().toLocaleLowerCase("es");

  // Los filtros se aplican a las órdenes ya cargadas. Si se elige un estado,
  // la orden debe coincidir con ese estado y con el texto de búsqueda.
  const visibles = ordenes.filter(
    (orden) =>
      (!estado || orden.estado === estado) &&
      [
        mostrarNumero(orden.numero),
        orden.matricula,
        orden.cliente,
        orden.vehiculo,
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(textoBuscado),
  );

  return (
    <section className="tarjeta">
      <div className="filtros">
        <label>
          Buscar
          <input
            type="search"
            placeholder="Matrícula, orden o cliente"
            value={busqueda}
            onChange={(evento) => establecerBusqueda(evento.target.value)}
          />
        </label>

        <label>
          Estado
          <select
            value={estado}
            onChange={(evento) => establecerEstado(evento.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((opcion) => (
              <option key={opcion}>{opcion}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tabla-desplazable">
        <table>
          <thead>
            <tr>
              <th>Orden / Vehículo</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Mecánico</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((orden) => (
              <tr key={orden.identificador}>
                <td>
                  <strong>{orden.matricula}</strong>
                  <small>
                    {mostrarNumero(orden.numero)} · {orden.vehiculo}
                  </small>
                </td>
                <td>{orden.cliente}</td>
                <td>
                  <EtiquetaEstado estado={orden.estado} />
                </td>
                <td>
                  {/* Se busca el nombre del mecánico a partir del ID guardado en la orden. */}
                  {equipo.find(
                    (persona) => persona.identificador === orden.mecanicoId,
                  )?.nombre || "Sin asignar"}
                </td>
                <td>
                  {/* La ficha se abre usando el identificador interno de la orden. */}
                  <Link
                    className="enlace"
                    href={"/ordenes/" + orden.identificador}
                  >
                    Abrir ficha →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visibles.length ? (
        <div className="vacio">
          <h2>No hay órdenes que coincidan</h2>
          <p>Revisa la búsqueda o registra una nueva recepción.</p>
        </div>
      ) : null}
    </section>
  );
}
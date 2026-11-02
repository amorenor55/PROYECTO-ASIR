"use client";
/** Búsqueda y filtros sobre las órdenes que Firebase autoriza a consultar. */
import { useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import { usarOrdenes } from "@/servicios/usarOrdenes";
import { mostrarNumero } from "@/servicios/ordenes";
import { ESTADOS } from "@/modelo/validaciones.mjs";
import EtiquetaEstado from "./EtiquetaEstado";
export default function ListaOrdenes() {
  const { usuario, equipo } = usarSesion();
  const { ordenes, error } = usarOrdenes(usuario);
  const [busqueda, establecerBusqueda] = useState("");
  const [estado, establecerEstado] = useState("");
  if (error)
    return (
      <p className="aviso error" role="alert">
        {error}
      </p>
    );
  if (!ordenes) return <p role="status">Cargando órdenes…</p>;
  const textoBuscado = busqueda.trim().toLocaleLowerCase("es");
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
      {ordenes.length === 100 ? (
        <p className="texto-suave">
          Se muestran las 100 órdenes más recientes de tu perfil.
        </p>
      ) : null}
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
                  {equipo.find(
                    (persona) => persona.identificador === orden.mecanicoId,
                  )?.nombre || "Sin asignar"}
                </td>
                <td>
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

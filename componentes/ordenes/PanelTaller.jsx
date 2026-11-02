"use client";
/** Los contadores se calculan con datos reales, sin valores de ejemplo. */
import Link from "next/link";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import { usarOrdenes } from "@/servicios/usarOrdenes";
import { ESTADOS } from "@/modelo/validaciones.mjs";
export default function PanelTaller() {
  const { usuario } = usarSesion();
  const { ordenes, error } = usarOrdenes(usuario);
  if (error)
    return (
      <p className="aviso error" role="alert">
        {error}
      </p>
    );
  if (!ordenes) return <p role="status">Cargando panel…</p>;
  return (
    <>
      <div className="estadisticas">
        {ESTADOS.map((estado) => (
          <div className="estadistica" key={estado}>
            <span>{estado}</span>
            <strong>
              {ordenes.filter((orden) => orden.estado === estado).length}
            </strong>
          </div>
        ))}
      </div>
      {ordenes.length === 100 ? (
        <p className="texto-suave">
          Resumen de las 100 órdenes más recientes de tu perfil.
        </p>
      ) : null}
      <section className="tarjeta">
        <h2>Gestión del taller</h2>
        <p className="texto-suave">
          Consulta las órdenes y el seguimiento de cada reparación.
        </p>
        <div className="accesos">
          <Link className="acceso-modulo" href="/ordenes">
            <strong>Órdenes de reparación</strong>
            <span>Buscar y consultar los trabajos</span>
          </Link>
          {["ADMINISTRACION", "RECEPCION"].includes(usuario.perfil) ? (
            <Link className="acceso-modulo" href="/ordenes/nueva">
              <strong>Nueva recepción</strong>
              <span>Registrar la entrada de un vehículo</span>
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}

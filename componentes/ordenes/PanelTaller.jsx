"use client";

import Link from "next/link";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import { usarOrdenes } from "@/servicios/usarOrdenes";
import { ESTADOS } from "@/modelo/validaciones.mjs";

export default function PanelTaller() {
  // El usuario de la sesión determina qué órdenes se consultan
  // y qué accesos se muestran en el panel.
  const { usuario } = usarSesion();
  const { ordenes, error } = usarOrdenes(usuario);

  // Si falla la consulta, se muestra el error en el lugar del panel.
  if (error)
    return (
      <p className="aviso error" role="alert">
        {error}
      </p>
    );

  // Se mantiene el aviso de carga hasta recibir la lista de órdenes.
  if (!ordenes) return <p role="status">Cargando panel…</p>;

  return (
    <>
      <div className="estadisticas">
        {/* Cada contador se calcula con las órdenes cargadas para este usuario.
            Se muestran todos los estados, aunque alguno tenga cero órdenes. */}
        {ESTADOS.map((estado) => (
          <div className="estadistica" key={estado}>
            <span>{estado}</span>
            <strong>
              {ordenes.filter((orden) => orden.estado === estado).length}
            </strong>
          </div>
        ))}
      </div>

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

          {/* El acceso al formulario de alta se muestra a administración
              y recepción, que son los perfiles encargados de registrar entradas. */}
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
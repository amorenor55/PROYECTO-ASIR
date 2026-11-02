"use client";
/** Cabecera y menú compartidos para no repetirlos en cada pantalla. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
const etiquetasPerfil = {
  ADMINISTRACION: "Administración",
  RECEPCION: "Recepción",
  MECANICO: "Mecánico",
};
export default function MarcoAplicacion({ usuario, children }) {
  const rutaActual = usePathname();
  const navegador = useRouter();
  const { cerrarSesion } = usarSesion();
  const [saliendo, establecerSaliendo] = useState(false);
  const [error, establecerError] = useState("");
  const enlaces = [
    ["/panel", "Panel principal"],
    ["/ordenes", "Órdenes de reparación"],
  ];
  if (["ADMINISTRACION", "RECEPCION"].includes(usuario.perfil))
    enlaces.push(["/ordenes/nueva", "Nueva recepción"]);
  async function salir() {
    establecerSaliendo(true);
    try {
      await cerrarSesion();
      navegador.replace("/acceso");
    } catch {
      establecerError("No se pudo cerrar la sesión.");
      establecerSaliendo(false);
    }
  }
  return (
    <div className="aplicacion">
      <aside className="barra-lateral">
        <Link href="/panel" className="marca">
          <span>DMT</span>Gestión de taller
        </Link>
        <p className="rotulo-menu">OPERACIONES</p>
        <nav aria-label="Navegación principal">
          {enlaces.map(([ruta, etiqueta]) => (
            <Link
              key={ruta}
              href={ruta}
              aria-current={rutaActual === ruta ? "page" : undefined}
              className={
                rutaActual === ruta ? "enlace-menu seleccionado" : "enlace-menu"
              }
            >
              {etiqueta}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="columna-principal">
        <header className="cabecera">
          <div className="empresa">
            <div>
              <strong>DMT</strong>
              <small>Gestión interna de taller</small>
            </div>
          </div>
          <div className="cuenta">
            <div>
              <strong>{usuario.nombre}</strong>
              <small>{etiquetasPerfil[usuario.perfil]}</small>
            </div>
            <button
              className="boton secundario"
              disabled={saliendo}
              onClick={salir}
            >
              {saliendo ? "Saliendo…" : "Salir"}
            </button>
          </div>
        </header>
        <main className="contenido">
          {error ? (
            <p className="aviso error" role="alert">
              {error}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

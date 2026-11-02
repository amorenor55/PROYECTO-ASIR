"use client";
/** Recoge únicamente los datos imprescindibles para abrir una orden. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import { crearOrden, explicarError } from "@/servicios/ordenes";
export default function FormularioOrden() {
  const { usuario, equipo } = usarSesion();
  const navegador = useRouter();
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState("");
  if (!["ADMINISTRACION", "RECEPCION"].includes(usuario?.perfil))
    return (
      <p className="aviso error">Tu perfil no permite registrar recepciones.</p>
    );
  // Evita el envío tradicional: el servicio valida, guarda y devuelve la ficha que se abrirá.
  async function guardar(evento) {
    evento.preventDefault();
    establecerGuardando(true);
    establecerError("");
    const datos = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      const identificador = await crearOrden(usuario, datos, equipo);
      navegador.push("/ordenes/" + identificador);
    } catch (fallo) {
      establecerError(explicarError(fallo));
      establecerGuardando(false);
    }
  }
  return (
    <form className="tarjeta" onSubmit={guardar}>
      <h2>Datos de recepción</h2>
      <p className="texto-suave">El número de orden se asigna al guardar.</p>
      <fieldset disabled={guardando}>
        <div className="rejilla-formulario">
          <label>
            Matrícula *<input name="matricula" maxLength={12} required />
          </label>
          <label>
            Marca y modelo *<input name="vehiculo" maxLength={100} required />
          </label>
          <label>
            Cliente *<input name="cliente" maxLength={100} required />
          </label>
          <label>
            Mecánico asignado
            <select name="mecanicoId" defaultValue="">
              <option value="">Sin asignar</option>
              {equipo
                .filter((persona) => persona.perfil === "MECANICO")
                .map((persona) => (
                  <option
                    key={persona.identificador}
                    value={persona.identificador}
                  >
                    {persona.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          Motivo de la visita *
          <textarea name="motivo" rows={5} maxLength={2000} required />
        </label>
        {error ? (
          <p className="aviso error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="acciones-formulario">
          <button className="boton principal" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear orden"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

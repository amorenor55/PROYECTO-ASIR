"use client";
/** Formulario de acceso: Firebase comprueba la contraseña y el proveedor carga el perfil. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { obtenerFirebase } from "@/servicios/firebase";
import { usarSesion } from "@/componentes/sesion/ProveedorSesion";
import { PERFILES } from "@/modelo/validaciones.mjs";
export default function PaginaAcceso() {
  const { usuario, error: errorPerfil } = usarSesion();
  const navegador = useRouter();
  const [error, establecerError] = useState("");
  const [entrando, establecerEntrando] = useState(false);
  useEffect(() => {
    if (usuario) navegador.replace("/panel");
  }, [usuario, navegador]);
  async function entrar(evento) {
    evento.preventDefault();
    establecerEntrando(true);
    establecerError("");
    const formulario = new FormData(evento.currentTarget);
    try {
      const { autenticacion, baseDatos } = obtenerFirebase();
      const resultado = await signInWithEmailAndPassword(
        autenticacion,
        String(formulario.get("correo")).trim(),
        String(formulario.get("contrasena")),
      );
      const perfil = (
        await getDoc(doc(baseDatos, "usuarios", resultado.user.uid))
      ).data();
      if (
        !perfil ||
        perfil.activo !== true ||
        !PERFILES.includes(perfil.perfil)
      ) {
        await signOut(autenticacion);
        throw new Error("La cuenta no tiene un perfil autorizado.");
      }
      navegador.replace("/panel");
    } catch (fallo) {
      const mensajes = {
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
        "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
        "auth/network-request-failed": "Comprueba tu conexión a Internet.",
      };
      establecerError(
        mensajes[fallo.code] ||
          (fallo.code
            ? "No se pudo iniciar sesión. Comprueba la cuenta y la configuración de Firebase."
            : fallo.message),
      );
    } finally {
      establecerEntrando(false);
    }
  }
  return (
    <main className="pagina-acceso">
      <div className="presentacion">
        <span className="marca-grande">DMT</span>
        <p className="rotulo">GESTIÓN INTERNA DE TALLER</p>
        <h1>
          Gestión de taller
        </h1>
        <p>
          Recepción de vehículos y seguimiento de las órdenes de reparación.
        </p>
      </div>
      <section className="tarjeta tarjeta-acceso">
        <h2>Iniciar sesión</h2>
        <p className="texto-suave">Acceso del personal del taller.</p>
        {error || errorPerfil ? (
          <p className="aviso error" role="alert">
            {error || errorPerfil}
          </p>
        ) : null}
        <form onSubmit={entrar}>
          <label>
            Correo electrónico
            <input
              type="email"
              name="correo"
              autoComplete="username"
              maxLength={150}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="contrasena"
              autoComplete="current-password"
              maxLength={200}
              required
            />
          </label>
          <button className="boton principal" disabled={entrando}>
            {entrando ? "Accediendo…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

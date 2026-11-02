"use client";
/** Controla la navegación privada; las reglas de Firestore protegen los datos. */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usarSesion } from "./ProveedorSesion";
import MarcoAplicacion from "@/componentes/estructura/MarcoAplicacion";
export default function AccesoProtegido({ children }) {
  const { usuario, cargando, error } = usarSesion();
  const navegador = useRouter();
  useEffect(() => {
    if (!cargando && !usuario && !error) navegador.replace("/acceso");
  }, [usuario, cargando, error, navegador]);
  if (cargando)
    return (
      <main className="contenido" role="status">
        Comprobando acceso…
      </main>
    );
  if (error)
    return (
      <main className="contenido">
        <section className="tarjeta">
          <h1>No se pudo acceder</h1>
          <p role="alert">{error}</p>
          <Link href="/acceso">Volver al acceso</Link>
        </section>
      </main>
    );
  if (!usuario) return null;
  return <MarcoAplicacion usuario={usuario}>{children}</MarcoAplicacion>;
}

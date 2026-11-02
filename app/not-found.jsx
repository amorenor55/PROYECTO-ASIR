// Respuesta común para direcciones que no existen.
import Link from "next/link";
export default function PaginaNoEncontrada() {
  return (
    <main className="contenido">
      <section className="tarjeta">
        <h1>Página no encontrada</h1>
        <Link className="enlace" href="/panel">
          Volver al panel
        </Link>
      </section>
    </main>
  );
}

"use client";
// reset es una propiedad de Next.js que permite volver a cargar la página.
export default function ErrorPagina({ reset }) {
  return (
    <section className="tarjeta">
      <h1>No se pudo cargar la página</h1>
      <button className="boton principal" onClick={reset}>
        Reintentar
      </button>
    </section>
  );
}

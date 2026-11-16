"use client";

import { adjuntarPDF, obtenerPDF, retirarPDF } from "@/servicios/documentos";

const tipos = ["Presupuesto", "Factura", "Parte de trabajo", "Autorización", "Otros"];
const maximo = 2;
const limiteBytes = 20 * 1024 * 1024;

export default function DocumentosOrden({ usuario, orden, guardando, ejecutar }) {
  // Las órdenes antiguas pueden no tener todavía el campo documentos.
  const documentos = orden.documentos ?? [];

  // La interfaz permite añadir y quitar adjuntos a administración y recepción
  // mientras la orden esté abierta. Firebase comprueba los permisos de cada operación.
  const puedeEditar =
    orden.estado !== "Finalizado" &&
    ["ADMINISTRACION", "RECEPCION"].includes(usuario.perfil);

  function adjuntar(evento) {
    // Se leen los campos del formulario sin recargar la página.
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);

    ejecutar(async () => {
      const archivo = datos.get("documento");

      // Se comprueban el tamaño y la extensión antes de intentar subir el archivo.
      if (
        !archivo?.size ||
        archivo.size > limiteBytes ||
        !archivo.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Selecciona un PDF de hasta 20 MB.");
      }

      // La cabecera permite detectar archivos de otro tipo renombrados como .pdf.
      if ((await archivo.slice(0, 5).text()) !== "%PDF-") {
        throw new Error("El archivo no tiene una cabecera PDF válida.");
      }

      // Se sustituyen los separadores de ruta y los caracteres de control.
      const nombre = archivo.name.replace(/[\\/\x00-\x1f]/g, "_").trim();
      if (!nombre || nombre.length > 120) {
        throw new Error("Usa un nombre de archivo de hasta 120 caracteres.");
      }

      const actualizada = await adjuntarPDF(
        usuario,
        orden,
        archivo,
        nombre,
        datos.get("tipo"),
      );

      // El formulario se limpia después de guardar. Se devuelve la orden
      // actualizada para que la ficha pueda mostrar el nuevo adjunto.
      formulario.reset();
      return actualizada;
    }, "Documento adjuntado.");
  }

  function descargar(documento) {
    ejecutar(async () => {
      const archivo = await obtenerPDF(orden.identificador, documento);

      // Se crea un enlace temporal para descargar el PDF con su nombre original.
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = documento.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      // Se libera la URL temporal después de iniciar la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  return (
    <section className="tarjeta" style={{ marginTop: "1rem" }}>
      <h2>Documentos adjuntos</h2>

      {documentos.length === 0 && (
        <p className="texto-suave">Todavía no hay documentos.</p>
      )}

      {documentos.map((documento, indice) => (
        <div key={indice} className="acciones-formulario">
          <span>{documento.tipo} · {documento.nombre}</span>
          <button
            type="button"
            className="boton secundario"
            disabled={guardando}
            onClick={() => descargar(documento)}
          >
            Descargar
          </button>

          {puedeEditar && (
            <button
              type="button"
              className="boton secundario"
              disabled={guardando}
              onClick={() => {
                // Se pide confirmación antes de retirar el adjunto de la orden.
                if (window.confirm("¿Quitar este documento de la orden?")) {
                  ejecutar(
                    () => retirarPDF(usuario, orden, indice),
                    "Documento retirado.",
                  );
                }
              }}
            >
              Quitar
            </button>
          )}
        </div>
      ))}

      {/* El formulario se muestra si el perfil puede editar y queda hueco. */}
      {puedeEditar && documentos.length < maximo && (
        <form onSubmit={adjuntar}>
          <fieldset disabled={guardando}>
            <label>
              Tipo de documento
              <select name="tipo">
                {tipos.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </select>
            </label>

            <label>
              PDF de hasta 20 MB
              <input
                type="file"
                name="documento"
                accept=".pdf,application/pdf"
                required
              />
            </label>

            <button className="boton principal">Adjuntar PDF</button>
          </fieldset>
        </form>
      )}

      <p className="texto-suave">
        {documentos.length} de {maximo} documentos.
      </p>
    </section>
  );
}
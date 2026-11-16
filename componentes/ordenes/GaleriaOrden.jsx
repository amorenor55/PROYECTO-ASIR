"use client";

import { useEffect, useRef, useState } from "react";
import { guardarFotos } from "@/servicios/ordenes";
import {
  categoriasFotos,
  descargarFoto,
  listarFotos,
  retirarFoto,
  subirFoto,
} from "@/servicios/fotos";

function VistaFoto({ foto, ampliar }) {
  const boton = useRef(null);
  const [urlFoto, establecerUrlFoto] = useState(null);
  const [error, establecerError] = useState(false);

  // Las fotos antiguas ya traen la imagen en la orden. Las de Storage
  // usan una URL temporal que se crea al descargar el archivo.
  const imagen = foto.imagen ?? urlFoto;

  useEffect(() => {
    if (!foto.objeto) return;

    let vigente = true;
    let url;

    // Se descarga la foto cuando su botón está a menos de 200 px de la
    // zona visible. Así se evita descargar toda la galería al abrir la orden.
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;

        observador.disconnect();
        descargarFoto(foto)
          .then((archivo) => {
            // Si el componente ya se ha cerrado, se descarta el resultado.
            if (!vigente) return;

            url = URL.createObjectURL(archivo);
            establecerUrlFoto(url);
          })
          .catch(() => {
            if (vigente) establecerError(true);
          });
      },
      { rootMargin: "200px" },
    );

    observador.observe(boton.current);

    // Al retirar la vista se desconecta el observador y se libera la URL.
    return () => {
      vigente = false;
      observador.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [foto.objeto]);

  return (
    <button
      ref={boton}
      type="button"
      className="enlace"
      disabled={!imagen}
      onClick={() => ampliar(imagen)}
    >
      {imagen ? (
        <img src={imagen} alt={`Foto de ${foto.categoria.toLowerCase()}`} />
      ) : error ? (
        "No se pudo cargar la foto"
      ) : (
        "Cargando foto…"
      )}
    </button>
  );
}

export default function GaleriaOrden({ usuario, orden, guardando, ejecutar }) {
  const [ampliada, establecerAmpliada] = useState(null);
  const [fotosGuardadas, establecerFotosGuardadas] = useState(null);
  const [error, establecerError] = useState("");
  const fotosAntiguas = orden.fotos ?? [];
  const ordenId = orden.identificador;

  // Una orden finalizada permite consultar las fotos y oculta los controles de edición.
  const abierta = orden.estado !== "Finalizado";

  useEffect(() => {
    let vigente = true;

    // Se vuelve a consultar Storage si cambia la orden, la cuenta o el mecánico asignado.
    listarFotos(ordenId)
      .then((fotos) => {
        if (vigente) establecerFotosGuardadas(fotos);
      })
      .catch(() => {
        if (vigente) establecerError("No se pudo consultar la galería de Storage.");
      });

    // Se ignoran las respuestas de una consulta anterior si cambia la ficha.
    return () => {
      vigente = false;
    };
  }, [ordenId, usuario.identificador, orden.mecanicoId]);

  // La galería reúne las fotos de Firestore y las de Storage. El índice
  // identifica la posición de cada foto antigua si hay que quitarla de la orden.
  const fotos = [
    ...fotosAntiguas.map((foto, indice) => ({
      ...foto,
      indice,
      id: `antigua-${indice}`,
    })),
    ...(fotosGuardadas ?? []),
  ];

  function agregar(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);

    ejecutar(async () => {
      await subirFoto(ordenId, datos.get("categoria"), datos.get("foto"));
      formulario.reset();
      establecerError("");

      // Tras subir el archivo se actualiza el listado. Se reutilizan las
      // referencias de las fotos conocidas para evitar volver a descargarlas.
      const actualizadas = await listarFotos(ordenId);
      establecerFotosGuardadas((anteriores) => {
        const porId = new Map((anteriores ?? []).map((foto) => [foto.id, foto]));
        return actualizadas.map((foto) => porId.get(foto.id) ?? foto);
      });
    });
  }

  function quitar(foto) {
    // Se cierra la ampliación antes de retirar la foto.
    establecerAmpliada(null);

    ejecutar(async () => {
      // Las fotos antiguas se quitan de la lista de la orden en Firestore.
      if (!foto.objeto) {
        return guardarFotos(
          usuario,
          orden,
          fotosAntiguas.filter((_, indice) => indice !== foto.indice),
        );
      }

      // Para las fotos nuevas se borra el archivo de Storage y luego
      // se retira de la galería que está viendo el usuario.
      await retirarFoto(foto);
      establecerFotosGuardadas((actuales) =>
        actuales.filter(({ id }) => id !== foto.id),
      );
    }, "Foto retirada.");
  }

  return (
    <section className="tarjeta" style={{ marginTop: "1rem" }}>
      <h2>Fotografías de la orden</h2>

      {error && <p role="alert">{error}</p>}

      {fotosGuardadas && !fotos.length && (
        <p className="texto-suave">Todavía no hay fotos.</p>
      )}

      {/* Cada categoría se muestra cuando contiene al menos una foto. */}
      {Object.values(categoriasFotos).map((categoria) => {
        const grupo = fotos.filter((foto) => foto.categoria === categoria);
        if (!grupo.length) return null;

        return (
          <div key={categoria}>
            <h3>{categoria}</h3>
            <div className="rejilla-fotos">
              {grupo.map((foto) => (
                <div key={foto.id}>
                  <VistaFoto foto={foto} ampliar={establecerAmpliada} />

                  {abierta && (
                    <button
                      type="button"
                      className="enlace"
                      disabled={guardando}
                      onClick={() => quitar(foto)}
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {ampliada && (
        <div>
          <button
            type="button"
            className="enlace"
            onClick={() => establecerAmpliada(null)}
          >
            Cerrar vista ampliada
          </button>
          <img
            className="foto-ampliada"
            src={ampliada}
            alt="Fotografía ampliada de la orden"
          />
        </div>
      )}

      {/* Se puede añadir otra foto mientras la orden esté abierta,
          independientemente del número de fotos que ya tenga. */}
      {abierta && (
        <form onSubmit={agregar}>
          <fieldset disabled={guardando}>
            <label>
              Tipo de foto
              <select name="categoria">
                {Object.entries(categoriasFotos).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Imagen de hasta 10 MB
              <input
                name="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>

            <button className="boton principal">Añadir foto</button>
          </fieldset>
        </form>
      )}

      {fotosGuardadas && (
        <p className="texto-suave">
          {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}.
        </p>
      )}
    </section>
  );
}
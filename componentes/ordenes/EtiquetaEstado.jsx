/** Mantiene los mismos colores para los estados en listado y ficha. */
export default function EtiquetaEstado({ estado }) {
  const color = {
    Pendiente: "amarillo",
    "En curso": "azul",
    Finalizado: "verde",
  }[estado];
  return <span className={"etiqueta " + color}>{estado}</span>;
}

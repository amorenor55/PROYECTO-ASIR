// Next.js entrega params como una promesa: se resuelve antes de leer la ruta.
import FichaOrden from "@/componentes/ordenes/FichaOrden";
export default async function PaginaFicha({ params }) {
  const { identificador } = await params;
  return <FichaOrden key={identificador} identificador={identificador} />;
}

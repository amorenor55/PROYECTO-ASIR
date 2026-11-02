// La búsqueda y la escucha de datos se encuentran en ListaOrdenes.
import ListaOrdenes from "@/componentes/ordenes/ListaOrdenes";
export default function PaginaOrdenes() {
  return (
    <>
      <div className="titulo-pagina">
        <div>
          <p className="rotulo">TRABAJOS DEL TALLER</p>
          <h1>Órdenes de reparación</h1>
        </div>
      </div>
      <ListaOrdenes />
    </>
  );
}

// La validación y el guardado están separados del enrutamiento.
import FormularioOrden from "@/componentes/ordenes/FormularioOrden";
export default function NuevaRecepcion() {
  return (
    <>
      <div className="titulo-pagina">
        <div>
          <p className="rotulo">RECEPCIÓN</p>
          <h1>Nueva orden</h1>
        </div>
      </div>
      <FormularioOrden />
    </>
  );
}

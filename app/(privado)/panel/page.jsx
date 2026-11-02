// La página compone el título y el panel reutilizable.
import PanelTaller from "@/componentes/ordenes/PanelTaller";
export default function PaginaPanel() {
  return (
    <>
      <div className="titulo-pagina">
        <div>
          <p className="rotulo">GESTIÓN DE TALLER</p>
          <h1>Panel principal</h1>
          <p className="texto-suave">
            Recepción y seguimiento de reparaciones.
          </p>
        </div>
      </div>
      <PanelTaller />
    </>
  );
}

// page y layout son nombres de archivo obligatorios de Next.js.
import "./estilos.css";
import ProveedorSesion from "@/componentes/sesion/ProveedorSesion";
export const metadata = {
  title: "DMT · Gestión de taller",
  description: "Recepción y seguimiento de órdenes de reparación.",
};
export default function DistribucionPrincipal({ children }) {
  return (
    <html lang="es">
      <body>
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}

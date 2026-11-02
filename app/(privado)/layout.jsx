// Agrupa las páginas privadas sin añadir el nombre de la carpeta a la URL.
import AccesoProtegido from "@/componentes/sesion/AccesoProtegido";
export default function DistribucionPrivada({ children }) {
  return <AccesoProtegido>{children}</AccesoProtegido>;
}

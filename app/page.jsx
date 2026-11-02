// La dirección raíz conduce al panel. El acceso privado comprueba la sesión.
import { redirect } from "next/navigation";
export default function Inicio() {
  redirect("/panel");
}

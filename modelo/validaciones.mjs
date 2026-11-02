/**
 * Reglas del negocio reutilizadas por los formularios y las pruebas.
 * Estas comprobaciones mejoran los mensajes al usuario. La protección real de
 * los datos se aplica también en firestore.reglas, fuera del navegador.
 */
export const PERFILES = ["ADMINISTRACION", "RECEPCION", "MECANICO"];
export const ESTADOS = ["Pendiente", "En curso", "Finalizado"];

// Centraliza la comprobación del perfil para no repetirla en cada operación.
export function comprobarPerfil(usuario, permitidos) {
  if (!usuario || !permitidos.includes(usuario.perfil))
    throw new Error("Tu perfil no permite realizar esta operación.");
}

// Quita espacios exteriores y limita la longitud antes de enviar datos a Firestore.
function comprobarTexto(valor, maximo) {
  if (typeof valor !== "string")
    throw new Error("El dato introducido no es un texto.");
  const texto = valor.trim();
  if (texto.length > maximo)
    throw new Error(`El texto supera los ${maximo} caracteres.`);
  return texto;
}

/** Devuelve únicamente los campos admitidos en una recepción.
 * Un mecánico es opcional; si se elige, debe pertenecer al equipo y estar activo.
 */
export function validarRecepcion(datos, equipo) {
  const matricula = comprobarTexto(datos.matricula || "", 12).toUpperCase();
  const cliente = comprobarTexto(datos.cliente || "", 100);
  const vehiculo = comprobarTexto(datos.vehiculo || "", 100);
  const motivo = comprobarTexto(datos.motivo || "", 2000);
  const mecanicoId = comprobarTexto(datos.mecanicoId || "", 128);
  if (!/^[A-Z0-9 -]{4,12}$/.test(matricula))
    throw new Error("Revisa la matrícula del vehículo.");
  if (!cliente || !vehiculo || !motivo)
    throw new Error("Completa cliente, vehículo y motivo de la visita.");
  if (
    mecanicoId &&
    !equipo.some(
      (persona) =>
        persona.identificador === mecanicoId &&
        persona.perfil === "MECANICO" &&
        persona.activo === true,
    )
  )
    throw new Error("Selecciona un mecánico activo del equipo.");
  return { matricula, cliente, vehiculo, motivo, mecanicoId };
}

// Acepta un estado conocido y limita el diagnóstico; no permite añadir otros campos.
export function validarDiagnostico(datos) {
  if (!ESTADOS.includes(datos.estado))
    throw new Error("Selecciona un estado válido.");
  return {
    diagnostico: comprobarTexto(datos.diagnostico || "", 4000),
    estado: datos.estado,
  };
}

// Administración y recepción consultan todas las órdenes; el mecánico, solo las suyas.
export function puedeConsultar(usuario, orden) {
  return (
    PERFILES.includes(usuario.perfil) &&
    (usuario.perfil !== "MECANICO" ||
      orden.mecanicoId === usuario.identificador)
  );
}

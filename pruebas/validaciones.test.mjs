// Pruebas del negocio que no necesitan Firebase ni conexión a Internet.
import test from "node:test";
import assert from "node:assert/strict";
import {
  validarRecepcion,
  validarDiagnostico,
  comprobarPerfil,
  puedeConsultar,
} from "../modelo/validaciones.mjs";
const equipo = [
  { identificador: "mecanico1", perfil: "MECANICO", activo: true },
];
const recepcion = {
  matricula: "1234abc",
  cliente: "Cliente ficticio",
  vehiculo: "Vehículo ficticio",
  motivo: "Revisión",
  mecanicoId: "mecanico1",
};

test("la matrícula se normaliza y el mecánico debe estar activo", () => {
  assert.equal(validarRecepcion(recepcion, equipo).matricula, "1234ABC");
  assert.throws(() =>
    validarRecepcion({ ...recepcion, mecanicoId: "inexistente" }, equipo),
  );
  assert.throws(() =>
    validarRecepcion(recepcion, [{ ...equipo[0], activo: false }]),
  );
});
test("se rechazan datos obligatorios vacíos y textos demasiado largos", () => {
  assert.throws(() => validarRecepcion({ ...recepcion, motivo: " " }, equipo));
  assert.throws(() =>
    validarRecepcion({ ...recepcion, cliente: "a".repeat(101) }, equipo),
  );
});
test("solo se admiten los tres estados definidos", () => {
  assert.equal(
    validarDiagnostico({ diagnostico: " Revisado ", estado: "En curso" })
      .diagnostico,
    "Revisado",
  );
  assert.throws(() =>
    validarDiagnostico({ diagnostico: "", estado: "Inventado" }),
  );
});
test("el mecánico consulta sus órdenes y no las de otros", () => {
  const mecanico = { identificador: "mecanico1", perfil: "MECANICO" };
  assert.equal(puedeConsultar(mecanico, { mecanicoId: "mecanico1" }), true);
  assert.equal(puedeConsultar(mecanico, { mecanicoId: "mecanico2" }), false);
  assert.equal(
    puedeConsultar({ perfil: "DESCONOCIDO" }, { mecanicoId: "" }),
    false,
  );
});
test("un perfil no puede asumir funciones de recepción", () => {
  assert.throws(() =>
    comprobarPerfil({ perfil: "MECANICO" }, ["ADMINISTRACION", "RECEPCION"]),
  );
});

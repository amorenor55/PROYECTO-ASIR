// Solo se ejecuta contra un emulador: nunca escribe en el proyecto real del usuario.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
const direccion = process.env.FIRESTORE_EMULATOR_HOST;
test(
  "reglas: numeración, perfiles, asignación y cierre",
  { skip: !direccion },
  async () => {
    const [servidor, puerto] = direccion.split(":");
    const entorno = await initializeTestEnvironment({
      projectId: "demo-dmt-asir",
      firestore: {
        host: servidor,
        port: Number(puerto),
        rules: await readFile(
          new URL("../firestore.reglas", import.meta.url),
          "utf8",
        ),
      },
    });
    try {
      await entorno.clearFirestore();
      // El alta de perfiles se simula con permisos administrativos exclusivamente dentro del emulador.
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        for (const [identificador, perfil] of [
          ["administracion", "ADMINISTRACION"],
          ["recepcion", "RECEPCION"],
          ["mecanico1", "MECANICO"],
          ["mecanico2", "MECANICO"],
        ])
          await setDoc(doc(contexto.firestore(), "usuarios", identificador), {
            nombre: identificador,
            correo: identificador + "@example.test",
            perfil,
            activo: true,
          });
      });
      const recepcion = entorno.authenticatedContext("recepcion").firestore();
      const mecanico = entorno.authenticatedContext("mecanico1").firestore();
      const otroMecanico = entorno
        .authenticatedContext("mecanico2")
        .firestore();
      const administracion = entorno
        .authenticatedContext("administracion")
        .firestore();
      const orden = doc(recepcion, "ordenes", "orden1"),
        contador = doc(recepcion, "contadores", "ordenes");
      await assertFails(
        getDocs(
          collection(entorno.unauthenticatedContext().firestore(), "ordenes"),
        ),
      );
      await assertSucceeds(
        runTransaction(recepcion, async (transaccion) => {
          await transaccion.get(contador);
          transaccion.set(contador, {
            ultimoNumero: 1,
            ultimaOrdenId: "orden1",
          });
          transaccion.set(orden, {
            numero: 1,
            matricula: "1234BCD",
            cliente: "Cliente",
            vehiculo: "Vehículo",
            motivo: "Revisión",
            mecanicoId: "mecanico1",
            diagnostico: "",
            estado: "Pendiente",
            creadaEn: serverTimestamp(),
            actualizadaEn: serverTimestamp(),
            revision: 1,
          });
        }),
      );
      await assertSucceeds(getDoc(doc(mecanico, "ordenes", "orden1")));
      await assertFails(getDoc(doc(otroMecanico, "ordenes", "orden1")));
      await assertFails(getDocs(collection(mecanico, "ordenes")));
      await assertSucceeds(
        getDocs(
          query(
            collection(mecanico, "ordenes"),
            where("mecanicoId", "==", "mecanico1"),
          ),
        ),
      );
      await assertFails(
        setDoc(
          doc(mecanico, "usuarios", "mecanico1"),
          { perfil: "ADMINISTRACION" },
          { merge: true },
        ),
      );
      await assertFails(
        updateDoc(orden, {
          diagnostico: "No permitido",
          estado: "En curso",
          revision: 2,
          actualizadaEn: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(doc(mecanico, "ordenes", "orden1"), {
          cliente: "No permitido",
          revision: 2,
          actualizadaEn: serverTimestamp(),
        }),
      );
      await assertSucceeds(
        updateDoc(doc(mecanico, "ordenes", "orden1"), {
          diagnostico: "Comprobación realizada",
          estado: "En curso",
          revision: 2,
          actualizadaEn: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(doc(mecanico, "ordenes", "orden1"), {
          diagnostico: "Revisión antigua",
          revision: 2,
          actualizadaEn: serverTimestamp(),
        }),
      );
      await assertSucceeds(
        updateDoc(doc(mecanico, "ordenes", "orden1"), {
          estado: "Finalizado",
          revision: 3,
          actualizadaEn: serverTimestamp(),
        }),
      );
      assert.equal((await getDoc(orden)).data().estado, "Finalizado");
      await assertFails(
        updateDoc(doc(administracion, "ordenes", "orden1"), {
          estado: "En curso",
          revision: 4,
          actualizadaEn: serverTimestamp(),
        }),
      );
      // No se puede adelantar la numeración sin crear una orden asociada.
      await assertFails(
        updateDoc(contador, { ultimoNumero: 2, ultimaOrdenId: "inexistente" }),
      );
    } finally {
      await entorno.cleanup();
    }
  },
);

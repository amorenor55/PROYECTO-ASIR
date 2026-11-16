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
  Timestamp,
  Bytes,
  writeBatch,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  runTransaction,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getBytes, listAll, ref, uploadBytes } from "firebase/storage";

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
      ...(process.env.FIREBASE_STORAGE_EMULATOR_HOST
        ? { storage: { rules: await readFile(new URL("../storage.reglas", import.meta.url), "utf8") } }
        : {}),
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
      const ordenAdmin = doc(administracion, "ordenes", "orden1");
      const ordenMecanico = doc(mecanico, "ordenes", "orden1");
      const ordenOtroMecanico = doc(otroMecanico, "ordenes", "orden1");
      const actualizar = (referencia, revision, cambios) =>
        updateDoc(referencia, { ...cambios, revision, actualizadaEn: serverTimestamp() });

      await assertFails(actualizar(orden, 4, { estado: "En curso" }));
      await assertFails(actualizar(ordenMecanico, 4, { estado: "En curso" }));
      await assertFails(actualizar(ordenAdmin, 4, { estado: "En curso", diagnostico: "Alterado" }));
      await assertSucceeds(actualizar(ordenAdmin, 4, { estado: "En curso" }));
      assert.equal((await getDoc(orden)).data().diagnostico, "Comprobación realizada");

      await assertFails(actualizar(ordenMecanico, 5, { estado: "Finalizado", diagnostico: "  \n " }));
      await assertFails(actualizar(ordenMecanico, 5, { mecanicoId: "mecanico2" }));
      await assertFails(actualizar(orden, 5, { mecanicoId: "recepcion" }));
      await assertSucceeds(actualizar(orden, 5, { mecanicoId: "" }));
      await assertFails(getDoc(ordenMecanico));
      await assertSucceeds(actualizar(orden, 6, { mecanicoId: "mecanico2" }));
      await assertFails(getDoc(ordenMecanico));
      await assertSucceeds(getDoc(ordenOtroMecanico));
      const fotos = [{ categoria: "Entrada", imagen: "data:image/jpeg;base64," + "A".repeat(140000) }];
      await assertFails(actualizar(ordenMecanico, 7, { fotos }));
      await assertFails(actualizar(ordenOtroMecanico, 7, { fotos: [{ categoria: "Otra", imagen: "mal" }] }));
      await assertSucceeds(actualizar(ordenOtroMecanico, 7, { fotos }));
      const pdf = {
        nombre: "presupuesto.pdf",
        tipo: "Presupuesto",
        contenido: Bytes.fromUint8Array(new TextEncoder().encode("%PDF-1.7")),
      };
      await assertFails(actualizar(ordenOtroMecanico, 8, { documentos: [pdf] }));
      await assertFails(actualizar(orden, 8, { documentos: [pdf, pdf, pdf] }));
      await assertFails(actualizar(orden, 8, { documentos: [{
        ...pdf, contenido: Bytes.fromUint8Array(new Uint8Array(122881)),
      }] }));
      const referenciaPDF = {
        nombre: "parte.pdf", tipo: "Parte de trabajo",
        archivoId: "014d63a5-33e2-4979-8a08-12d48389a612",
      };
      await assertFails(actualizar(orden, 8, { documentos: [{ ...referenciaPDF, archivoId: "../archivo" }] }));
      const tieneStorage = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
      const rutaPDF = "adjuntos/orden1/" + referenciaPDF.archivoId + ".pdf";
      const archivoPara = (uid) => ref(entorno.authenticatedContext(uid)
        .storage("gs://demo-dmt-asir.appspot.com"), rutaPDF);
      const contenidoGrande = new Uint8Array(200 * 1024);
      contenidoGrande.set(new TextEncoder().encode("%PDF-1.7"));
      if (tieneStorage) {
        await assertFails(uploadBytes(archivoPara("mecanico2"), contenidoGrande, { contentType: "application/pdf" }));
        await assertSucceeds(uploadBytes(archivoPara("recepcion"), contenidoGrande, { contentType: "application/pdf" }));
        await assertFails(getBytes(archivoPara("recepcion")));
      }
      await assertSucceeds(actualizar(orden, 8, { documentos: [pdf, referenciaPDF] }));
      assert.equal((await getDoc(ordenOtroMecanico)).data().documentos[0].nombre, pdf.nombre);
      if (tieneStorage) {
        await assertFails(getBytes(archivoPara("mecanico1")));
        assert.equal((await assertSucceeds(getBytes(archivoPara("mecanico2")))).byteLength, contenidoGrande.length);
      }
      const fotosPara = (uid) => ref(entorno.authenticatedContext(uid)
        .storage("gs://demo-dmt-asir.appspot.com"), "fotos/orden1");
      if (tieneStorage) {
        const imagen = new Uint8Array([255, 216, 255, 217]);
        const subir = (uid, numero) => uploadBytes(
          ref(fotosPara(uid), `entrada_014d63a5-33e2-4979-8a08-12d48389a61${numero}.jpg`),
          imagen, { contentType: "image/jpeg" },
        );
        await assertFails(subir("mecanico1", 0));
        for (let numero = 0; numero < 6; numero++)
          await assertSucceeds(subir("mecanico2", numero));
        await assertFails(listAll(fotosPara("mecanico1")));
        const { items } = await assertSucceeds(listAll(fotosPara("mecanico2")));
        assert.equal(items.length, 6);
        await assertSucceeds(getBytes(items[0]));
      }
      const original = (await getDoc(ordenAdmin)).data();
      const papelera = doc(administracion, "papeleraOrdenes", "orden1");
      function eliminar(base, confirmacion) {
        const lote = writeBatch(base);
        lote.set(doc(base, "papeleraOrdenes", "orden1"), {
          orden: original, confirmacion, eliminadaEn: serverTimestamp(),
          caducaEn: Timestamp.fromMillis(Date.now() + 15 * 86400000 + 30000),
        });
        lote.delete(doc(base, "ordenes", "orden1"));
        return lote.commit();
      }
      await assertFails(deleteDoc(ordenAdmin));
      await assertFails(eliminar(recepcion, "CONFIRMAR"));
      await assertFails(eliminar(administracion, "confirmar"));
      await assertSucceeds(eliminar(administracion, "CONFIRMAR"));
      await assertFails(getDoc(doc(otroMecanico, "papeleraOrdenes", "orden1")));
      assert.equal((await getDoc(papelera)).exists(), true);
      if (tieneStorage) {
        await assertFails(getBytes(archivoPara("administracion")));
        await assertFails(listAll(fotosPara("administracion")));
      }
      const restaurar = () => {
        const lote = writeBatch(administracion);
        lote.set(ordenAdmin, original);
        lote.delete(papelera);
        return lote.commit();
      };
      await assertSucceeds(restaurar());
      assert.deepEqual((await getDoc(ordenAdmin)).data(), original);
      if (tieneStorage)
        assert.equal((await assertSucceeds(getBytes(archivoPara("mecanico2")))).byteLength, contenidoGrande.length);
      if (tieneStorage)
        assert.equal((await assertSucceeds(listAll(fotosPara("mecanico2")))).items.length, 6);
      assert.equal((await getDoc(papelera)).exists(), false);
      await assertSucceeds(eliminar(administracion, "CONFIRMAR"));
      await entorno.withSecurityRulesDisabled(async (contexto) =>
        updateDoc(doc(contexto.firestore(), "papeleraOrdenes", "orden1"), {
          eliminadaEn: Timestamp.fromMillis(Date.now() - 16 * 86400000),
        }));
      await assertFails(restaurar());
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        const base = contexto.firestore();
        const lote = writeBatch(base);
        for (let i = 1; i <= 105; i++) {
          lote.set(doc(base, "ordenes", "historial-" + i), {
            numero: i + 1000,
            matricula: i === 1 ? "9999ZZZ" : "9999XXX",
            mecanicoId: "mecanico2",
            actualizadaEn: Timestamp.fromMillis(i * 1000),
          });
        }
        await lote.commit();
      });
      const historial = await getDocs(query(collection(otroMecanico, "ordenes"),
        where("mecanicoId", "==", "mecanico2"), orderBy("actualizadaEn", "desc")));
      assert.equal(historial.size, 105);
      assert.equal(historial.docs.at(-1).data().matricula, "9999ZZZ");
      // No se puede adelantar la numeración sin crear una orden asociada.
      await assertFails(
        updateDoc(contador, { ultimoNumero: 2, ultimaOrdenId: "inexistente" }),
      );
    } finally {
      await entorno.cleanup();
    }
  },
);

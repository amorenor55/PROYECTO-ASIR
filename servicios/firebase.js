"use client";
/** Inicializa una sola conexión de Firebase para toda la aplicación. */
import { getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import configuracion from "@/configuracion/firebase.json";

export function obtenerFirebase() {
  // Las opciones apiKey, authDomain, projectId y appId las define Firebase.
  // Son configuración web pública, no una contraseña de administrador.
  const opciones = { ...configuracion };
  if (process.env.NEXT_PUBLIC_USAR_EMULADORES === "true") {
    // Un proyecto local distinto impide enviar las pruebas al proyecto real.
    opciones.projectId = "demo-dmt-asir";
    opciones.authDomain = "demo-dmt-asir.firebaseapp.com";
    opciones.apiKey = "clave-local";
  }
  const aplicacion =
    getApps().find((elemento) => elemento.name === "dmt") ||
    initializeApp(opciones, "dmt");
  const autenticacion = getAuth(aplicacion);
  const baseDatos = getFirestore(aplicacion);
  if (
    process.env.NEXT_PUBLIC_USAR_EMULADORES === "true" &&
    typeof window !== "undefined" &&
    !window.__emuladoresDmtConectados
  ) {
    connectAuthEmulator(autenticacion, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(baseDatos, "127.0.0.1", 8080);
    window.__emuladoresDmtConectados = true;
  }
  return { autenticacion, baseDatos };
}

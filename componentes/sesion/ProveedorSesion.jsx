"use client";
/** Mantiene la cuenta autenticada, su perfil y el equipo disponibles para las páginas. */
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { obtenerFirebase } from "@/servicios/firebase";
import { PERFILES } from "@/modelo/validaciones.mjs";
const ContextoSesion = createContext(null);
export function usarSesion() {
  return useContext(ContextoSesion);
}

export default function ProveedorSesion({ children }) {
  const [sesion, establecerSesion] = useState({
    usuario: null,
    equipo: [],
    cargando: true,
    error: "",
  });
  // La sesión se comparte entre páginas para evitar cargar un perfil independiente en cada una.
  useEffect(() => {
    let vigente = true;
    let detenerPerfil = () => {},
      detenerEquipo = () => {};
    const { autenticacion, baseDatos } = obtenerFirebase();
    const detenerCuenta = onAuthStateChanged(autenticacion, (cuenta) => {
      detenerPerfil();
      detenerEquipo();
      if (!cuenta) {
        if (vigente)
          establecerSesion({
            usuario: null,
            equipo: [],
            cargando: false,
            error: "",
          });
        return;
      }
      establecerSesion({
        usuario: null,
        equipo: [],
        cargando: true,
        error: "",
      });
      // Authentication acredita la identidad; el documento usuarios/{uid} define el permiso.
      detenerPerfil = onSnapshot(
        doc(baseDatos, "usuarios", cuenta.uid),
        (documento) => {
          const perfil = documento.data();
          if (
            !perfil ||
            perfil.activo !== true ||
            !PERFILES.includes(perfil.perfil)
          ) {
            detenerEquipo();
            if (vigente)
              establecerSesion({
                usuario: null,
                equipo: [],
                cargando: false,
                error: "La cuenta no tiene un perfil activo autorizado.",
              });
            return;
          }
          const usuario = {
            identificador: cuenta.uid,
            nombre: perfil.nombre,
            correo: cuenta.email,
            perfil: perfil.perfil,
          };
          if (vigente)
            establecerSesion((anterior) => ({
              ...anterior,
              usuario,
              cargando: false,
              error: "",
            }));
          // Sustituye la escucha anterior para que un cambio de perfil no duplique suscripciones.
          detenerEquipo();
          detenerEquipo = onSnapshot(
            collection(baseDatos, "usuarios"),
            (resultado) => {
              const equipo = resultado.docs
                .map((elemento) => ({
                  ...elemento.data(),
                  identificador: elemento.id,
                }))
                .filter((persona) => persona.activo === true);
              if (vigente)
                establecerSesion((anterior) => ({ ...anterior, equipo }));
            },
            () => {
              if (vigente)
                establecerSesion((anterior) => ({
                  ...anterior,
                  error: "No se pudo consultar el equipo.",
                }));
            },
          );
        },
        () => {
          if (vigente)
            establecerSesion({
              usuario: null,
              equipo: [],
              cargando: false,
              error: "No se pudo verificar el perfil de acceso.",
            });
        },
      );
    });
    // Evita acumular escuchas al cerrar sesión o cambiar de página.
    return () => {
      vigente = false;
      detenerCuenta();
      detenerPerfil();
      detenerEquipo();
    };
  }, []);
  return (
    <ContextoSesion.Provider
      value={{
        ...sesion,
        cerrarSesion: () => signOut(obtenerFirebase().autenticacion),
      }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

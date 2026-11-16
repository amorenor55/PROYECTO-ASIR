# DMT Gestión de taller

Proyecto de Administración de Sistemas Informáticos en Red de Álvaro Moreno, del IES Suárez de Figueroa de Zafra.

DMT es una aplicación web para centralizar la recepción de vehículos y el seguimiento de sus órdenes de reparación. Reúne los datos de entrada, la asignación de mecánico y el diagnóstico en una misma ficha, con acceso según el perfil de cada trabajador.

## Finalidad

La información de una reparación puede quedar repartida entre notas y conversaciones, lo que dificulta conocer la situación del vehículo. La aplicación utiliza la orden de reparación como elemento central para consultar el trabajo solicitado, su responsable y su estado.

El proyecto utiliza un entorno independiente del sistema del taller que sirve como referencia funcional.

## Funcionalidades

### Acceso y perfiles

El inicio de sesión utiliza correo y contraseña mediante Firebase Authentication. La identidad de la cuenta se relaciona con un documento de usuario en Firestore, donde se encuentran el nombre, el perfil y la habilitación de acceso.

La aplicación distingue tres perfiles: Administración, Recepción y Mecánico. No dispone de registro público ni permite cambiar el perfil desde la interfaz.

### Panel principal

Muestra el número de órdenes pendientes, en curso y finalizadas dentro del conjunto que el usuario puede consultar. Los valores se calculan a partir de las órdenes recibidas de Firestore.

### Recepción de vehículos

Administración y recepción pueden abrir una orden con estos datos:

- Matrícula.
- Marca y modelo del vehículo.
- Cliente.
- Motivo de la visita.
- Mecánico asignado, de forma opcional.

Cada orden recibe una numeración correlativa, presentada como `OR-0001`, `OR-0002`, etc. El identificador del documento en Firestore es independiente de ese número visible.

### Consulta y búsqueda

El listado permite buscar por número de orden, matrícula, cliente o vehículo, además de filtrar por estado. Los mecánicos consultan únicamente los trabajos que tienen asignados.

La consulta escucha todas las órdenes activas que el perfil puede leer, ordenadas por su última actualización. La búsqueda, los filtros y los contadores del panel usan ese historial completo. Esta solución está pensada para un taller pequeño. Si aumenta el volumen, las lecturas y el tráfico crecen con el historial.

### Diagnóstico y seguimiento

La ficha conserva los datos de recepción y permite registrar un diagnóstico y actualizar el estado según los permisos del usuario.

| Estado | Significado |
|---|---|
| Pendiente | Orden registrada y pendiente de atención |
| En curso | Trabajo en desarrollo |
| Finalizado | Orden cerrada y disponible para consulta |

Recepción y administración pueden asignar, cambiar o retirar el mecánico desde la ficha de una orden abierta. Para finalizar una orden hace falta un diagnóstico y confirmar la acción. Administración puede reabrirla y devolverla a «En curso», conservando el diagnóstico y la asignación.

## Permisos

| Operación | Administración | Recepción | Mecánico |
|---|---|---|---|
| Consultar órdenes | Todas | Todas | Solo asignadas |
| Crear órdenes | Sí | Sí | No |
| Cambiar la asignación de una orden abierta | Sí | Sí | No |
| Actualizar diagnóstico y estado | Sí | No | Solo asignadas |
| Modificar los datos de recepción tras el alta | No | No | No |
| Reabrir órdenes finalizadas | Sí | No | No |
| Cambiar perfiles desde la aplicación | No | No | No |

Las restricciones se aplican en las reglas de Firestore, además de reflejarse en las opciones de la interfaz.

## Tecnologías

| Tecnología | Función en el proyecto |
|---|---|
| Next.js | Organización de rutas, páginas y estructura común |
| React | Componentes, formularios y estado de la interfaz |
| JavaScript y JSX | Lógica y composición de las pantallas |
| CSS | Presentación y adaptación a distintos tamaños de pantalla |
| Firebase Authentication | Identificación de usuarios mediante correo y contraseña |
| Cloud Firestore | Persistencia, consultas y transacciones |
| Reglas de Firestore | Autorización y validación de operaciones sobre los datos |
| Vercel | Alojamiento de la aplicación web |

## Organización del código

| Ruta | Responsabilidad |
|---|---|
| `app/` | Páginas, rutas y distribución de la aplicación |
| `componentes/estructura/` | Cabecera y navegación compartidas |
| `componentes/sesion/` | Sesión, perfil y acceso a las pantallas privadas |
| `componentes/ordenes/` | Panel, listado, recepción y ficha de trabajo |
| `servicios/firebase.js` | Inicialización de los servicios de Firebase |
| `servicios/ordenes.js` | Consultas, creación y actualización de órdenes |
| `servicios/usarOrdenes.js` | Suscripción a cambios para el panel y el listado |
| `modelo/validaciones.mjs` | Perfiles, estados y validación de datos |
| `configuracion/` | Configuración web de Firebase |
| `pruebas/` | Comprobaciones automatizadas de validaciones y permisos |
| `firestore.reglas` | Reglas de acceso y validación de la base de datos |
| `firestore.indices.json` | Índice compuesto de las consultas por mecánico y fecha |
| `vercel.json` | Configuración del alojamiento |

Las páginas componen los elementos de la interfaz; los servicios concentran las operaciones de datos y el modelo reúne las validaciones. Esta separación evita repetir la lógica de guardado y facilita localizar cada responsabilidad.

Los nombres propios y los comentarios se mantienen en español. Las palabras reservadas y los nombres exigidos por las herramientas conservan su sintaxis original.

## Modelo de datos

| Colección | Información almacenada |
|---|---|
| `usuarios` | Nombre, correo, perfil y acceso activo; cada documento se identifica por el UID de Authentication |
| `ordenes` | Número, matrícula, cliente, vehículo, motivo, mecánico, diagnóstico, estado, fechas y revisión |
| `contadores` | Último número de orden y referencia a la orden asociada a esa reserva |

La asignación utiliza `mecanicoId`, que referencia el UID del mecánico. Las contraseñas se gestionan en Authentication y no se almacenan en estas colecciones.

## Decisiones de funcionamiento

**Numeración mediante transacciones.** La reserva del número y la creación de la orden se confirman juntas. Así se evita que dos altas simultáneas utilicen la misma numeración o que se confirme solo una parte de la operación.

**Control de revisión.** Antes de actualizar una orden, se compara la revisión de la ficha con la guardada. Si otra persona ha modificado la orden, se solicita recargar para evitar sobrescribir sus cambios. Este contador no constituye un historial de auditoría.

**Fechas del servicio.** Las marcas de creación y actualización se asignan mediante Firestore para no depender del reloj de cada equipo.

**Consultas según el perfil.** La restricción del mecánico forma parte de la consulta a Firestore. No se descargan todas las órdenes para ocultar después las ajenas en pantalla.

**Seguridad en el servicio de datos.** El navegador utiliza el SDK web de Firebase y las reglas comprueban las operaciones. La protección no depende únicamente de ocultar botones ni de las validaciones de los formularios.


## Documentos adjuntos

Administración y recepción pueden adjuntar y retirar hasta dos PDF por orden abierta, de hasta 20 MB cada uno. Se pueden clasificar como Presupuesto, Factura, Parte de trabajo, Autorización u Otros. La aplicación permite descargar los archivos a los usuarios autorizados para ver la orden.

Los PDF nuevos se guardan en Cloud Storage. Firestore conserva el nombre, el tipo y el identificador. Los adjuntos anteriores guardados dentro de Firestore se pueden seguir descargando. Los archivos vinculados quedan inaccesibles al enviar la orden a la papelera y vuelven a estar disponibles cuando se recupera.

Para probar en local, incluye Storage en el comando de emuladores (`--only auth,firestore,storage`). Para publicar:

1. Habilita Cloud Storage en Firebase (plan Blaze) y comprueba el bucket de `configuracion/firebase.json`.
2. Despliega Firestore, Storage y las funciones de limpieza con `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions --project ID_DEL_PROYECTO`. Autoriza la consulta de Firestore desde las reglas de Storage si se solicita.
3. Configura CORS en el bucket con `gcloud storage buckets update gs://NOMBRE_DEL_BUCKET --cors-file=storage.cors.json`. Ajusta los orígenes si cambia el dominio.
4. Comprueba la política TTL de la papelera. Las funciones eliminan de Storage los PDF retirados de una orden y los PDF y las fotos de las órdenes caducadas cuando Firestore elimina su documento de papelera. El borrado real depende de su despliegue y de la política de retención del bucket.

## Fotografías y papelera

La galería admite fotografías JPG, PNG y WebP de hasta 10 MB por imagen, agrupadas en Entrada, Salida, Daños, Recambios y Otros. Las fotos nuevas se guardan en Cloud Storage sin un máximo por orden o categoría. Las fotografías guardadas anteriormente en Firestore siguen apareciendo en la galería. Una orden finalizada permite consultar la galería y debe reabrirse para modificarla.

Administración puede enviar una orden a la papelera escribiendo `CONFIRMAR`. El traslado conserva el identificador, la numeración y las fotos. La orden desaparece del listado y del panel. Durante quince días se puede recuperar desde **Papelera**. El plazo se comprueba en Firestore con la hora del servidor. Al vencer se bloquea la restauración. El borrado definitivo lo realiza la política TTL sobre `papeleraOrdenes.caducaEn` y puede demorarse después del vencimiento. Las copias externas tienen su propio plazo de conservación.
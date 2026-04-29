# CHANGELOG — EL JURISTA (Sistema)

Registra cambios al **sistema**: código de la Web App, endpoints GAS, system prompts de agentes, estructura de carpetas, y cualquier modificación técnica.

> ⚠️ **Regla:** Nunca sobreescribir. Siempre agregar la entrada más reciente al inicio del archivo. El registro más reciente es el primero. Cada cambio incrementa la versión del badge en la Web App.

---

## v1.5.0 — 2026-04-28 *(versión en pantalla: v1.5.0)*

### Cambiado — Drawer rediseñado con campos contextuales por tipo de documento

- **Pestaña "📋 Información" ahora muestra campos específicos según el tipo de documento.**
  - *Motivo*: Los metadatos relevantes difieren radicalmente entre una ley, una sentencia y un libro. Mostrar todos siempre genera confusión.
  - `legislacion`/`convenio`: Tipo normativa · Año publicación · Gaceta Oficial N° · Fecha en Gaceta · Materia · Vigencia
  - `sentencia`: Sala · Expediente · Ponente · Fecha de sentencia · Partes · Materia
  - `doctrina`/`articulo`: Autor(es) · Editorial · ISBN · Año · Materia
  - Todos los tipos: Tags prominentes al final + botón **"📖 Leer documento completo"** en la parte superior.

- **Pestaña "✏️ Editar" también muestra formulario contextual por tipo.**
  - `legislacion`/`convenio`: campos Gaceta Oficial y Fecha en Gaceta añadidos; se eliminan campos irrelevantes (sala, isbn, etc.)
  - `sentencia`: Sala, Expediente, Ponente, Fecha, Partes
  - `doctrina`/`articulo`: Autor principal, Coautores, Editorial, ISBN
  - Se eliminaron los campos Resumen y Cita formal del formulario de edición (información redundante).

- **`saveDoc()` actualizado** para enviar al GAS sólo los campos del formulario activo (no intentar leer inputs que no existen en pantalla).

- **Eliminada la pestaña "📖 Contenido"** del drawer — la lectura ahora se activa desde el botón directo en la pestaña Información.

---

## v1.4.1 — 2026-04-28 *(versión en pantalla: v1.4.1)*

### Añadido / Corregido / Cambiado

- **Pestaña "📖 Contenido" en el drawer.**
  - *Motivo*: El sistema funciona como biblioteca virtual; el usuario necesita leer el documento.
  - *Comportamiento*: Si el doc tiene `drive_id`, muestra un iframe embebido de Google Drive (PDF/Doc). Si no (caso actual con los 2,979 docs de LEXIUS), muestra el texto extraído (campo `resumen`) con formato legible y los fragmentos clave con resaltado lateral dorado. Incluye aviso de cómo cargar el PDF a Drive para tener el texto completo.

- **Fix: error "Load failed" al guardar ediciones (CORS en Safari).**
  - *Detección*: El usuario reportó "Error al guardar: Load failed" en Safari al intentar guardar desde el drawer.
  - *Causa*: `Content-Type: application/json` dispara un preflight OPTIONS que GAS no responde, Safari bloquea el POST.
  - *Fix*: Cambiado a `Content-Type: text/plain;charset=utf-8` en los dos endpoints POST (`indice/update` y `clasificar`). GAS recibe el body JSON correctamente vía `e.postData.contents`. No se requiere redeploy.

- **Purga de "Lexius Venezuela" en `cita_formal` (copyright).**
  - *Motivo*: Los 2,979 registros importados incluían `. Lexius Venezuela.` en la cita formal, referencia a la fuente de scraping que no debe aparecer por derechos de autor.
  - *Fix*: Script Python sobre `jurista_index.json` — regex `\. Lexius Venezuela\.?$` → `.`. 0 referencias restantes. Índice actualizado en Drive y GitHub.

---

## v1.4.0 — 2026-04-28 *(versión en pantalla: v1.4.0)*

### Añadido — Drawer visor + editor de documentos

- **Panel lateral deslizante (drawer)** al hacer clic en "Ver / Editar" en cualquier documento.
  - *Motivo*: El usuario necesita ver el contenido completo y editar los metadatos desde la Web App.
  - *Vista*: Muestra todos los campos (resumen, cita formal, tags, campos de sentencia, enlace a Drive si existe). Carga datos completos desde GAS `GET /indice/doc`.
  - *Edición*: Formulario con todos los campos editables (título, materia, tipo, autor, año, vigencia, sub-materia, cita formal, tags, resumen + campos específicos de sentencias). Guarda vía GAS `POST /indice/update` → actualiza jurista_index.json en Drive + replica a GitHub.
  - *UX*: Cierra con ✕, clic en overlay, o tecla Escape. Responsive (100% ancho en móvil).
- **Nuevos endpoints GAS** (requiere re-despliegue manual):
  - `GET ?path=indice/doc&id=UUID` → retorna doc completo del índice
  - `POST ?path=indice/update` → actualiza campos editables + sync GitHub

---

## v1.3.1 — 2026-04-28 *(versión en pantalla: v1.3.1)*

### Corregido — Fetches del GAS (parámetro `path` vs `action`)

- **El GAS usa `?path=` pero el HTML enviaba `?action=`.**
  - *Detección*: Biblioteca aparecía vacía al entrar. El `init()` llamaba `?action=indice/resumen` y el GAS no encontraba ningún path → retornaba error 404 silencioso.
  - *Fix*: Cambiados los 3 GET y 1 POST en `index.html` para usar `?path=` en lugar de `?action=`. POST de clasificar ahora incluye `?path=clasificar` en la URL en vez de en el body JSON.

---

## v1.3.0 — 2026-04-28 *(versión en pantalla: v1.3.0)*

### Añadido — Infraestructura de Sub-Agentes (Fase 2 continuación)

- **Subcarpetas `Jurisprudencia/` y `Doctrina/` creadas en las 9 materias de Drive.**
  - *Motivo*: Establecer los drop zones para alimentar cada sub-agente vía Cowork o Web App.
  - *Contenido*: 17 carpetas nuevas (Jurisprudencia en 9 materias + Doctrina en 8 — Probatorio ya tiene sus subcarpetas de doctrina). Todas vacías, listas para recibir documentos.

- **Stubs de system prompts para los 9 sub-agentes creados.**
  - *Ubicación*: `prompts/sub_agentes/[materia].md`
  - *Contenido*: Rol, fuentes a consultar (índice + carpetas Drive), reglas de citación, integración con skills existentes, protocolo de alimentación y documentos prioritarios sugeridos.
  - *Estado*: Estructurados y listos. Sin contenido real hasta cargar jurisprudencia/doctrina.

- **Protocolo de alimentación documentado en CLAUDE.md.**
  - *Vía Cowork*: Drop en carpeta Drive → Claude procesa → actualiza jurista_index.json → push GitHub.
  - *Vía Web App*: Endpoint `/subir` del GAS (futuro).

- **IDs de Drive de todas las nuevas subcarpetas registrados en CLAUDE.md.**

### Nota operativa

- GAS backup trigger activado (`configurarTriggerBackup()` ejecutado por el usuario).
- 3 carpetas duplicadas a eliminar manualmente: ver sección de IDs en CLAUDE.md.

---

## v1.2.0 — 2026-04-28 *(versión en pantalla: v1.2.0)*

### Añadido — FASE 2: Carga masiva LEXIUS Venezuela

- **`jurista_index.json` poblado con 2,979 documentos de LEXIUS Venezuela.**
  - *Motivo*: Completar el paso crítico de Fase 2 — dotar al sistema de su base de conocimiento legal venezolana.
  - *Fuente*: Carpeta `LEXIUS_DB/` en Drive (cuenta irvinleandro@gmail.com), generada por el scraper del usuario desde `appvenezuela.lexius.io`.
  - *Contenido*: Constitución (1,109 docs), Administrativo (558), Mercantil (428), Penal (232), Laboral (216), Procesal (166), Civil (157), Probatorio (67), Electoral (46).
  - *Proceso*: Script Python de clasificación por materia (keyword scoring), generación de `resumen` (80 palabras) y `fragmentos_clave` (3 párrafos) por documento.
  - *Formato*: `jurista_index_v1.1.json` (5.8 MB completo en Drive · 1.6 MB resumen en GitHub).

- **Réplica GitHub actualizada** (`data/jurista_index.json`, SHA: `519744d72c51729ccf15f6e280b28faaa3b80647`).
  - *Motivo*: Capa 2 de backup y acceso multi-dispositivo.

---

## v1.1.0 — 2026-04-28 *(versión en pantalla: v1.1.0)*

### Añadido — FASE 1: Infraestructura base

- **Estructura completa de carpetas en Google Drive creada.**
  - *Motivo*: Implementar Fase 1 — dar existencia física a la arquitectura diseñada.
  - *Contenido*: `EL_JURISTA_DB/` con 9 carpetas de materias, subcarpetas de Derecho_Probatorio (Medios_de_Prueba con 14 medios, Control_Contradiccion, Carga_Valoracion), `_Por_Clasificar/`, `_BACKUPS/`. Todos los IDs de Drive registrados en CLAUDE.md.

- **`jurista_index.json` inicializado en Drive (`EL_JURISTA_DB/`).**
  - *Motivo*: Crear la fuente de verdad del sistema desde el inicio, aunque esté vacía.
  - *Contenido*: Estructura completa con `version: "1.0"`, `total_documentos: 0`, array `documentos: []`.
  - *Drive ID*: `1P4MAvfb0_YKlNsxwOeK_oza-gMxH4zIq`

- **`gas/Code.gs` — Código GAS completo generado.**
  - *Motivo*: Implementar el backend API que sirve el índice en tiempo real a todos los dispositivos.
  - *Contenido*: 8 endpoints (GET: /indice/resumen, /indice/buscar, /documento, /listar, /descargar · POST: /subir, /clasificar, /eliminar, /scrape), sistema de backup semanal con trigger, replicación del índice a GitHub, actualización automática de DB_CHANGELOG.md.
  - *Estado*: Listo para pegar en Google Apps Script — pendiente despliegue manual por el usuario.

- **`prompts/orquestador.md` — System prompt del Orquestador creado.**
  - *Motivo*: Definir el comportamiento completo de El Jurista como agente orquestador.
  - *Contenido*: Instrucción de arranque (GET /indice/resumen al inicio), reglas de citación absolutas (REGLA 1-4), lógica de enrutamiento por materia (9 sub-agentes), protocolo de 3 niveles de profundidad, protocolo de producción documental (escrito de pruebas), protocolo de ingesta, convenciones de nombres, formato de respuestas, limitaciones.
  - *Drive ID*: `1HQkxkERnaNSqJH3lSA4suci5EQe92XAy`

- **CLAUDE.md actualizado con todos los IDs de Drive y estado de Fase 1.**
  - *Motivo*: Registrar los IDs reales de todas las carpetas y archivos creados, y actualizar el estado de la fase con el checklist de acciones manuales pendientes.

### Acciones adicionales completadas en esta sesión

- **GAS desplegado manualmente por el usuario.**
  - `GAS_URL_BASE` registrado en CLAUDE.md y en `gas/Code.gs` (CONFIG actualizado).
  - URL: `https://script.google.com/macros/s/AKfycbwMPuY32Y84n3kQM6mAXR6xJgBaybHAW6MYtOPsS0oyVYoCwkXZ689zvbVNN269jZBU/exec`

- **Repositorio GitHub privado creado: `ItoVzla/EL-JURISTA`.**
  - Carpeta `data/` con `jurista_index.json` inicial (réplica Capa 2).
  - Archivos subidos: `CHANGELOG.md`, `DB_CHANGELOG.md`, `CLAUDE.md`, `gas/Code.gs`, `prompts/orquestador.md`.

### Pendiente de acción manual del usuario

- Ejecutar `configurarTriggerBackup()` en el editor GAS (una sola vez) para activar el backup dominical.

---

## v1.0.0 — 2026-04-28 *(versión en pantalla: v1.0.0)*

### Creado

- **Documento de Especificaciones Técnicas (DET) v1.0.0 generado.**
  - *Motivo*: Completar el diseño arquitectónico antes de iniciar la ejecución.
  - *Contenido*: Arquitectura completa del sistema en 4 capas, estructura de Drive con 9 materias (incluyendo Derecho_Probatorio con 14 medios de prueba), esquema del jurista_index.json, 8 endpoints GAS, especificaciones de la Web App, jerarquía de 4 niveles de agentes IA, sistema de backup en 2 capas, sistema de versionado dual (CHANGELOG + DB_CHANGELOG), convenciones de nombres de archivo, roadmap de 4 fases, y prioridad de carga de 50 documentos iniciales.

- **CHANGELOG.md creado** (este archivo).
  - *Motivo*: Establecer el registro permanente de cambios al sistema desde el primer día.

- **DB_CHANGELOG.md creado.**
  - *Motivo*: Registro separado para cambios a la base de datos (documentos).

- **CLAUDE.md creado.**
  - *Motivo*: Instrucciones del proyecto para Claude en este contexto.

### Decisiones de arquitectura registradas

- Backend: Google Apps Script (sin servidor externo, costo cero).
- Sincronización multi-dispositivo: GAS endpoint `/indice/resumen` en tiempo real.
- Backup: Capa 1 (Drive semanal, domingos 2am, últimos 4 backups) + Capa 2 (GitHub réplica del índice en cada actualización).
- Chat IA: Opción C — Cowork/Claude.ai (suscripción existente, costo cero adicional).
- Hosting Web App: GitHub Pages (repo privado).
- Acceso: Clave única `ElJurista#2026`.
- Índice IA: 3 niveles (resumen liviano / búsqueda / documento completo).

---

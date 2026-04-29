# CHANGELOG — EL JURISTA (Sistema)

Registra cambios al **sistema**: código de la Web App, endpoints GAS, system prompts de agentes, estructura de carpetas, y cualquier modificación técnica.

> ⚠️ **Regla:** Nunca sobreescribir. Siempre agregar la entrada más reciente al inicio del archivo. El registro más reciente es el primero. Cada cambio incrementa la versión del badge en la Web App.

---

## v2.0.3 — 2026-04-29 *(versión en pantalla: v2.0.3)*

### Corregido — Nuevo redespliegue GAS + URL actualizada

- **Nueva implementación GAS desplegada con todos los fixes de v2.0.2.**
  - *URL anterior*: `AKfycbyOqjK7__KX5jFaDjkPWfniXZmmynhEZldWy3-7JSeJOSj7s7WYpWAn0dAp4iy-6hD0`
  - *URL nueva*: `AKfycbyshdDbG8QbxLbXoSrX8Dw0Ege5u1nb7bcVOF5WfRPCsGJKFGmkWk91SwC5CpuDU-7g`
  - *Fixes activos en producción*: mimetype map, `total_documentos` filter, `estado` filter para LEXIUS, `corregirClasificacionTipos()` fix.

- **URL actualizada en 15 archivos**: `CLAUDE.md`, `index.html`, `CHANGELOG.md`, `buscador/gas_uploader.py`, `prompts/orquestador.md`, 9 prompts de sub-agentes, plan de implementación.

- **Descubierto: GitHub Pages sirve desde rama `pages`, no `main`.**
  - *Fix*: `index.html` subido a la rama `pages` (commit `e9bcc53`) para que el sitio refleje los cambios.
  - *Regla nueva*: Cambios a `index.html` deben pushearse a **ambas** ramas: `main` (fuente de verdad) y `pages` (sitio live).
  - *Verificado*: `https://itovzla.github.io/EL-JURISTA/` muestra v2.0.3 y URL GAS correcta.

---

## v2.0.2 — 2026-04-29 *(versión en pantalla: v2.0.2)*

### Corregido — MarkItDown + mimetype + total_documentos

- **MarkItDown integrado** en el pipeline de ingesta (`buscador/base.py`).
  - `extraer_texto()` usa MarkItDown para PDF/DOCX; decode directo para TXT/MD.
  - `DocumentoDescargado.__post_init__` auto-extrae texto si no fue provisto.
  - *Motivo*: Eliminar dependencia de NotebookLM (sin API pública). MarkItDown convierte localmente sin costo de tokens.

- **Script `ingestar_pdf.py`** — ingesta masiva de PDFs/DOCX/TXT a EL JURISTA.
  - Infiere metadatos del nombre de archivo (convención `MATERIA_TIPO_AUTOR_AÑO_SLUG`).
  - Soporta `--dry-run`, `--materia`, `--tipo`, `--autor`, `--año`, `--sub-materia`, `--delay`.
  - Usa MarkItDown para extracción + `GASUploader.subir_lote()`.

- **`gas/Code.gs` — mimetype corregido** en `subirDocumento()`.
  - *Fix*: `application/pdf` hardcodeado → `mimeMap` con pdf/txt/md/html/docx/doc.
  - *Motivo*: Archivos `.txt` y `.md` se guardaban en Drive con tipo PDF incorrecto.

- **`gas/Code.gs` — `total_documentos` corregido** en `subirDocumento()` y `eliminarDocumento()`.
  - *Fix*: `filter(d => d.estado === 'activo')` → `filter(d => !d.estado || d.estado === 'activo')`.
  - *Motivo*: El contador excluía los 3,104 docs LEXIUS (sin campo `estado`), mostrando 0 docs activos.

- **`buscador/base.py` — fixes menores en `DocumentoDescargado`**:
  - `if val:` → `if val is not None:` en `to_gas_payload()` (campos vacíos ahora se incluyen correctamente).
  - Off-by-one en `_generar_resumen()`: `len(palabras) == 80` ya no agrega `"..."` innecesario.
  - `except ValueError: raise` antes del except general en `GASUploader` (errores GAS no se reintentan).

> ⚠️ **Acción requerida**: Redeplegar el GAS en Apps Script para activar los fixes de mimetype y `total_documentos` en producción.

---

## v2.0.1 — 2026-04-29 *(versión en pantalla: v2.0.0)*

### Corregido — Redespliegue GAS + URL actualizada en todo el sistema

- **Nueva implementación GAS desplegada.**
  - *URL anterior*: `AKfycbwqBKBEBPXLLt1HN8kf3l7HPr_pp0rdI8MNogAWjqDfLeUGwV2q99kEUbNNnYUkjuL_`
  - *URL nueva*: `AKfycbyshdDbG8QbxLbXoSrX8Dw0Ege5u1nb7bcVOF5WfRPCsGJKFGmkWk91SwC5CpuDU-7g`
  - *Motivo*: Redespliegue necesario para activar los fixes de v2.0.0 en producción (filtro `estado`, bug `pushToGitHub`, URL real en prompts).

- **URL actualizada en 14 archivos** (bulk replace automático): `CLAUDE.md`, `prompts/orquestador.md`, 9 prompts de sub-agentes, `buscador/gas_uploader.py`, `index.html`, plan de implementación.

- **`orquestador.md`**: URL del GAS inline en instrucción de arranque y protocolos de profundidad corregida. Línea duplicada eliminada.

---

## v2.0.0 — 2026-04-29 *(versión en pantalla: v2.0.0)*

### Añadido — Sub-Agente Buscador multi-fuente

- **Módulo `buscador/`** con clase base `BaseScraper` y 3 scrapers: TSJ, Asamblea Nacional, LEXIUS.
  - *Motivo*: Cerrar el loop de alimentación de la BD — el sistema puede buscar y descargar documentos directamente desde fuentes oficiales sin depender solo de carga manual.
  - *Fuentes*: `historico.tsj.gob.ve` (sentencias), `asambleanacional.gob.ve` (leyes), `appvenezuela.lexius.io` (legislación completa con autenticación Chrome).
  - *Integración*: `GASUploader` llama a `POST /subir` del GAS — los documentos quedan en Drive + jurista_index.json + GitHub automáticamente.

- **CLI `buscador_cli.py`** — interfaz de línea de comandos unificada.
  - `python buscador_cli.py tsj --sala social --año 2025 --q "accidente laboral" --max 10`
  - `python buscador_cli.py an --q "trabajo" --max 5`
  - `--dry-run` para previsualizar sin subir al GAS.

- **System prompt `prompts/sub_agentes/buscador.md`** — agente transversal que el Orquestador invoca cuando el índice no tiene suficientes fuentes para una consulta.

---

## v1.9.0 — 2026-04-29 *(versión en pantalla: v1.9.0)*

### Añadido — 125 sentencias reales SCS/TSJ 2026 ingresadas al índice

- **Ingestión completa de la jurisprudencia SCS 2026 desde LEXIUS_DB.**
  - *Fuente*: 125 archivos HTML en `LEXIUS_DB/Jurisprudencia/Sala Social/2026/`, descargados de LEXIUS Venezuela.
  - *Contenido*: Sentencias reales del Tribunal Supremo de Justicia, Sala de Casación Social, año 2026. Expedientes de 2019-2026. Magistrados ponentes: Edgar Gavidia Rodríguez, Carlos Alexis Castillo Ascanio, Elías Rubén Bittar Escalona.
  - *Procedimientos cubiertos*: Recurso de Casación, Recurso de Control de la Legalidad, Apelación, Nulidad, entre otros.
  - *Total nuevo en índice*: **3,104 documentos** (era 2,979).
  - *Commit GitHub*: `8eadaf221667` — "feat: +125 sentencias SCS/TSJ 2026 (total: 3104 docs) v1.9.0".

- **125 archivos .txt exportados a `EL_JURISTA_DB/Laboral_Venezuela/Jurisprudencia/`.**
  - *Formato*: Header con metadatos (expediente, fecha, ponente, partes, dispositivo) + texto completo del fallo en párrafos limpios.
  - *Convención de nombres*: `LABORAL_SENT_SCS_{AÑO}_exp{EXP}_nro{NRO}.txt`.
  - *Corrección de encoding*: Extracción por `<p>` tags para preservar párrafos y caracteres especiales (tildes, Ñ) sin fragmentación.

- **Campos nuevos en cada entrada de sentencia SCS:**
  - `sala`: `"Sala de Casación Social"`
  - `nro_sentencia`: número de la sentencia TSJ
  - `expediente`: código del expediente (e.g. `25-352`)
  - `ponente`: magistrado ponente
  - `procedimiento`: tipo de recurso
  - `partes`: descripción de las partes procesales
  - `resultado`: `con_lugar` / `sin_lugar` / `inadmisible` / `nulidad` / `sustanciacion_concluida` / `ver_texto`

---

## v1.8.2 — 2026-04-29 *(versión en pantalla: v1.8.2)*

### Corregido — 181 documentos mal clasificados como tipo="sentencia"

- **Reclasificación masiva de 181 docs en el índice GitHub Pages.**
  - *Causa*: El scraper LEXIUS procesó la carpeta `Jurisprudencia/` y etiquetó todos los documentos como `tipo: "sentencia"`. Dicha carpeta contenía documentos mixtos (actas constitutivas, actos legislativos, resoluciones ministeriales, contratos, autos decisorios, carteles de emplazamiento, etc.) que no son sentencias judiciales reales.
  - *Detección*: Test integral del Sub-Agente Constitucional — al revisar las 111 "sentencias constitucionales" se encontraron actas de constitución de salas, actos legislativos de la AN y balances del BCV.
  - *Fix*: Script Python de reclasificación por patrones de título aplicado sobre el índice GitHub. 181 docs corregidos. Sentencias reales: 115 (de 296 originales).
  - *Distribución de tipos nuevos*: `legislacion` +120 · `auto_procesal` +19 · `resolucion` +14 · `acta` +13 · `contrato` +11 · `acto_legislativo` +4.
  - *Commit GitHub*: `61e844451853...` — "v1.8.2: Corrección de 181 documentos mal clasificados como sentencia".

- **Función `corregirClasificacionTipos()` añadida a `gas/Code.gs`.**
  - *Propósito*: Aplicar las mismas 181 correcciones sobre la versión canónica en Drive (que tiene `resumen` y `fragmentos_clave`). Ejecutar UNA VEZ desde el editor GAS.

- **Nuevos valores de `tipo` en el esquema del índice:**
  - `resolucion` — resoluciones ministeriales y autos decisorios administrativos
  - `acta` — actas constitutivas, estatutos sociales
  - `contrato` — contratos, addenda de encomienda
  - `auto_procesal` — carteles de citación/emplazamiento, exhortos
  - `acto_legislativo` — actos legislativos de la AN, convocatorias

---

## v1.8.1 — 2026-04-29 *(versión en pantalla: v1.8.1)*

### Corregido — Base de datos vacía al cargar desde CDN

- **`fetchIndex()` filtraba todos los documentos LEXIUS por ausencia del campo `estado`.**
  - *Causa*: El filtro `.filter(d => d.estado === 'activo')` requería el campo explícito. El `jurista_index.json` generado por el scraper LEXIUS no incluye ese campo en ninguno de los 2,979 documentos. Al cargar desde GitHub Pages CDN, el resultado era un array vacío → biblioteca en blanco.
  - *Fix*: Filtro cambiado a `.filter(d => !d.estado || d.estado === 'activo')`. Incluye docs sin campo `estado` (todos los LEXIUS) y excluye solo los marcados explícitamente como inactivos.
  - *Detección*: Reportado por el usuario al ver la biblioteca vacía tras el deploy de v1.8.0.
- **Caché `localStorage` corrupto (array vacío) ya no bloquea recarga.**
  - *Fix*: `init()` detecta caché con longitud 0 y lo elimina antes de intentar un fetch fresco.

---

## v1.8.0 — 2026-04-29 *(versión en pantalla: v1.8.0)*

### Añadido — Optimización de rendimiento: caché multi-capa + CDN

- **Caché del índice en `localStorage` (stale-while-revalidate, TTL 30 min).**
  - *Motivo*: La carga inicial requería una llamada GAS que tarda 2-5s por cold start + lectura de 5.8MB desde Drive. En cada visita se recargaba completamente.
  - *Fix*: Al abrir la app, si el caché es válido (<30 min), los 2,979 docs se renderizan **instantáneamente** desde `localStorage`. Luego se refresca silenciosamente en background.
- **Índice servido desde GitHub Pages CDN (Fastly) en lugar de GAS.**
  - *Motivo*: GAS tiene cold start inherente de 1-3s. El mismo `jurista_index.json` ya está replicado en GitHub Pages donde es servido por CDN sin cold start.
  - *Fix*: `fetchIndex()` usa `https://itovzla.github.io/EL-JURISTA/data/jurista_index.json` como fuente primaria, con GAS como fallback automático si falla.
- **Textos de documentos persistidos en `sessionStorage`.**
  - *Motivo*: `textCache` era un `Map` en memoria que se perdía al recargar la página. Cualquier refresh obligaba a re-fetch del texto desde GAS.
  - *Fix*: `saveTextCache(id, text)` guarda en memoria **y** en `sessionStorage`. `loadTextCache(id)` consulta ambas capas. Documentos ya leídos en la sesión se abren instantáneamente incluso después de un refresh.
- **Skeleton animado para el visor de PDFs.**
  - *Motivo*: Al abrir un PDF con iframe de Drive, la pantalla aparecía en blanco sin indicador de carga.
  - *Fix*: Se muestra un skeleton pulsante mientras carga el iframe. Al dispararse `onload`, el skeleton desaparece con transición y el PDF aparece con fade-in.

---

## v1.7.5 — 2026-04-29 *(versión en pantalla: v1.7.5)*

### Corregido — Regresión en openDocView() al abrir documentos

- **Docs con `drive_id` se mostraban como iframe en lugar de texto formateado.**
  - *Causa*: La nueva lógica usaba `ext !== 'txt'` para decidir si mostrar iframe. Con el GAS anterior (sin redespliegue de v1.7.4), `nombre_archivo` no estaba en `allDocs`, por lo que `ext` era siempre `''`. `'' !== 'txt'` → `true` → iframe para todos los docs con drive_id. Resultado: la Constitución y otros docs de texto se mostraban como una hoja en blanco en lugar del visor formateado.
  - *Fix*: Cambiado a `isBinary = ext === 'pdf' || ext === 'docx' || ext === 'doc'`. El iframe solo se activa si el formato binario está explícitamente confirmado. Si `nombre_archivo` falta del caché (GAS no redeployado), la carga de texto funciona igual que antes.
- **Docs LEXIUS sin `drive_id` mostraban "Sin archivo asociado".**
  - *Causa*: `hasFile = d.drive_id || d.nombre_archivo || d.lexius_file` era falsy cuando esos campos no estaban en allDocs.
  - *Fix*: Eliminada la validación `hasFile`. Ahora siempre se intenta el fetch de texto al GAS. Si no existe el archivo, el GAS devuelve el error correspondiente.
- **El visor formateado (colores, artículos, epígrafes), el botón Editar y el buscador interno vuelven a funcionar para todos los docs de texto.**

---

## v1.7.4 — 2026-04-29 *(versión en pantalla: v1.7.4)*

### Optimizado — Apertura de documentos notablemente más rápida

- **Eliminada la llamada GAS a `/indice/doc`** al abrir un documento.
  - *Motivo*: La apertura requería 2 llamadas GAS seriales: primero `/indice/doc` (lee 5.8MB + devuelve metadata), luego `/documento/texto` (lee 5.8MB de nuevo + lee el archivo). Con el índice en Drive, cada llamada tarda 2-5s. En serie sumaban 4-10s de espera.
  - *Fix*: La metadata (título, materia, tipo, badges, tags, cita_formal, drive_id) ahora se toma directamente de `allDocs` que ya está en memoria desde el init. El visor muestra la cabecera del documento **instantáneamente** sin ninguna llamada de red, y solo hace 1 llamada GAS para el texto.
  - *Cambio en GAS*: `getIndiceResumen()` ahora incluye `nombre_archivo` y `lexius_file` para que el frontend pueda determinar el tipo de archivo sin el segundo fetch.

- **Caché cliente de texto** (`textCache: Map<id, string>`).
  - Documentos ya abiertos se muestran instantáneamente al volver a abrirlos en la misma sesión. Sin llamada GAS.

- **Prefetch al hacer hover** sobre el título de un documento.
  - Si el cursor se detiene 400ms sobre un título, el texto empieza a descargarse silenciosamente en segundo plano. Cuando el usuario hace click, el texto ya puede estar listo.

- **Caché GAS de texto** (`CacheService`, TTL 6h, máx 100 KB/entrada).
  - `getDocumento()` y `buscarYLeerArchivo()` ahora cachean el texto en `CacheService.getScriptCache()`. La segunda vez que cualquier usuario abra un doc en las siguientes 6h, el GAS no necesita leer el archivo de Drive — responde desde caché en ~200ms.

---

## v1.7.3 — 2026-04-29 *(versión en pantalla: v1.7.3)*

### Corregido — URL GAS + bug text/plain en getDocumento()

- **Nueva URL de despliegue GAS** tras redeploy con el fix de `getDocumento()`.
  - *Fix*: URL actualizada en `index.html` (constante `GAS`) y en `CLAUDE.md`.
- **`getDocumento(driveId)` ahora lee archivos `text/plain` correctamente.**
  - *Motivo*: Documentos LEXIUS que tienen `drive_id` asignado en el índice (e.g. Constitución de Venezuela 1999) entraban por `getDocumento()` en lugar de `buscarYLeerArchivo()`. La primera función solo manejaba PDF y Google Docs, devolviendo el string `[Formato no soportado para extracción de texto: text/plain]` en lugar del texto real.
  - *Fix*: Se añadió el caso `text/plain | application/octet-stream` como primera rama del `if` en `getDocumento()`, con `getBlob().getDataAsString('UTF-8')` + `limpiarTextoLexius()`. Se añadió también el caso DOCX para consistencia.
  - *Detección*: Captura de pantalla del visor mostrando el mensaje de error literal en lugar del texto legal.

---

## v1.7.2 — 2026-04-29 *(versión en pantalla: v1.7.2)*

### Añadido — Editor de bloques estructurados en el visor

- **Editor de bloques** reemplaza al `<textarea>` plano del modo edición.
  - *Motivo*: Al editar texto legal en un textarea raw, se perdían los colores y la jerarquía visual (títulos dorados, artículos con borde, epígrafes en itálica). El usuario necesitaba poder controlar el tipo de cada línea para mantener la estructura.
  - *Comportamiento*: Al pulsar `✏️ Editar`, el texto se parsea automáticamente en bloques tipados usando la misma lógica que `formatLegalText()`. Cada bloque muestra un selector de tipo (`TÍTULO / CAPÍTULO`, `SECCIÓN`, `ARTÍCULO`, `EPÍGRAFE`, `PÁRRAFO`) y un `contenteditable` con los colores reales del visor en tiempo real. El usuario puede cambiar el tipo con el desplegable, reordenar bloques con ↑↓, insertar bloques con `+` o Enter, y eliminar con `✕`. Al guardar, los bloques se serializan a texto plano y se envían al GAS como antes.
  - *CSS añadido*: `.edit-block`, `.edit-block-ctrl`, `.edit-block-content`, `.block-type-sel`, `.block-mini-btn`, `.block-add-row`.
  - *Funciones JS nuevas*: `textToBlocks()`, `blocksToText()`, `renderBlockEditor()`, `createBlockEl()` (inline), `updateBlockType()`, `moveBlock()`, `insertBlock()`, `deleteBlock()`, `placeCaretAtStart()`, `placeCaretAtEnd()`.

---

## v1.7.1 — 2026-04-28 *(versión en pantalla: v1.7.1)*

### Corregido — URL del GAS actualizada

- **Nueva URL de despliegue GAS** tras redeploy con el nuevo endpoint `POST /documento/texto/update`.
  - *Fix*: URL actualizada en `index.html` (constante `GAS`) y en `CLAUDE.md`.

---

## v1.7.0 — 2026-04-28 *(versión en pantalla: v1.7.0)*

### Añadido — Editor de texto en el visor + Ingesta funcional + Sub-agentes completos

- **Editor de texto en el visor de documento completo.**
  - *Motivo*: Los textos scrapeados de LEXIUS pueden tener errores de estructura (epígrafes mal ubicados, líneas desordenadas, capítulos sin sentido). El usuario necesita corregirlos directamente sin ir a Drive.
  - *Comportamiento*: Botón `✏️ Editar` aparece en la barra del visor cuando el contenido es texto (.txt / LEXIUS). Abre un modo de edición con `<textarea>` en fuente monoespaciada. Botón `💾 Guardar en Drive` envía el texto editado al nuevo endpoint GAS `POST /documento/texto/update`, que sobreescribe el archivo .txt en Drive y actualiza resumen y fragmentos_clave en el índice. Botón `👁 Vista` regresa sin guardar.

- **Nuevo endpoint GAS `POST /documento/texto/update`** — función `actualizarTextoDocumento()`.
  - Busca el archivo .txt en Drive por UUID del índice (usando drive_id o lexius_file como fallback).
  - Solo permite editar archivos `.txt` (no PDFs — estos deben reemplazarse en Drive).
  - Actualiza resumen y fragmentos_clave en el índice tras guardar.
  - Registra la acción en DB_CHANGELOG con tipo `TEXTO_EDITADO`.

- **Subida de archivos realmente funcional** (`submitUpload()`).
  - *Motivo*: La función anterior solo mostraba un toast informativo sin enviar el archivo.
  - *Fix*: Lee el archivo con `FileReader` → convierte a base64 → POST al GAS `/subir` con todos los metadatos del formulario. Refresca la tabla automáticamente al terminar.

- **Importación por URL funcional** (`submitScrape()`).
  - *Motivo*: La función enviaba un GET pero el GAS procesa el scrape en `doPost`.
  - *Fix*: Cambiado a POST. Muestra extracto del texto, materia detectada y nombre de archivo guardado en Drive si aplica.

- **System prompts completos para los 9 sub-agentes.**
  - *Motivo*: Los stubs anteriores (~70 líneas) no eran operativos como system prompts de Claude.
  - *Ahora*: Cada sub-agente tiene ~200-300 líneas con: rol detallado, instrucción de arranque con llamada al GAS, tabla de fuentes por jerarquía, reglas absolutas de citación, lógica de enrutamiento con tabla de temas, formato de respuesta con plantilla, tabla de normas/plazos/instituciones clave, protocolo de alimentación con lista de docs prioritarios, y limitaciones.
  - *Sub-agentes completados*: Laboral · Probatorio · Constitucional · Civil · Mercantil · Penal · Procesal · Administrativo · Electoral

- **Dashboard actualizado** con desglose por tipo de documento (legislación, sentencias, doctrina, convenios) y estado real del sistema v1.7.0.

---

## v1.6.3 — 2026-04-28 *(versión en pantalla: v1.6.3)*

### Corregido — URL del GAS actualizada

- **Nueva URL de despliegue GAS.**
  - *Motivo*: El usuario realizó un nuevo redeploy del GAS en Apps Script, generando una nueva URL.
  - *Fix*: URL actualizada en `index.html` (constante `GAS`) y en `CLAUDE.md` (campo `GAS_URL_BASE`).

---

## v1.6.2 — 2026-04-28 *(versión en pantalla: v1.6.2)*

### Corregido — Epígrafes en el visor de texto completo

- **`formatLegalText` reescrito con mecanismo `pendingEpi` para reconocer epígrafes existentes en el texto.**
  - *Motivo*: Los textos legales venezolanos (scrapeados de LEXIUS) contienen epígrafes (títulos cortos que preceden cada artículo, p. ej. "Objeto", "Finalidad", "Principios") que no estaban siendo reconocidos como tales, sino absorbidos como parte del cuerpo del artículo anterior.
  - *Comportamiento*: La función detecta líneas cortas (≤100 chars, ≤12 palabras, Title Case, sin punto/coma final) que preceden a un artículo y las guarda como `pendingEpi`, aplicándolas al artículo siguiente con la clase CSS `lv-epigrafe` (itálica dorada).
  - *Regla fundamental respetada*: Solo se reconocen y muestran epígrafes que YA existen en el texto de la norma. No se añade ni inventa nada.
  - *Fix del bucle de absorción*: El bucle que construye el cuerpo del artículo ahora detecta cuándo la siguiente línea es un epígrafe del artículo siguiente y detiene la absorción a tiempo.
  - *CSS añadido*: `.legal-viewer .lv-epigrafe` — bloque itálico en `--gold-dim`, 12.5px, separado 6px del artículo.

---

## v1.6.1 — 2026-04-28 *(versión en pantalla: v1.6.1)*

### Añadido — Búsqueda interna en el visor de texto (🔍)

- **Botón 🔍 en la barra superior del visor abre un campo de búsqueda interna.**
  - *Motivo*: Los documentos legales son largos; el usuario necesita localizar artículos o términos específicos sin leer todo el texto.
  - *Comportamiento*: Usa `TreeWalker` para recorrer solo nodos de texto sin romper el HTML estructurado. Envuelve coincidencias en `<mark class="hl-search">` (dorado semitransparente) y la coincidencia activa en `hl-current` (dorado sólido, texto negro). Botones ← → para navegar entre resultados. Muestra contador "X de N".
  - *Atajos*: Ctrl+F / Cmd+F activa la búsqueda; Escape la cierra y limpia highlights.

---

## v1.6.0 — 2026-04-28 *(versión en pantalla: v1.6.0)*

### Añadido / Corregido — Limpieza LEXIUS + búsqueda interna + mejoras de parser

- **Eliminación de fragmentos de UI de LEXIUS** en todos los textos del visor.
  - *Motivo*: Los .txt scrapeados de `appvenezuela.lexius.io` incluían botones y textos de la interfaz ("Sintetizar texto legal con el Asistente Virtual", "Generar Video Podcast Legal", etc.) que aparecían en el visor como contenido legal.
  - *Fix GAS*: `limpiarTextoLexius(texto)` en `buscarYLeerArchivo()` — limpia el texto antes de retornarlo.
  - *Fix cliente*: `formatLegalText` también filtra estos patrones como red de seguridad.

---

## v1.5.1 — 2026-04-28 *(versión en pantalla: v1.5.1)*

### Añadido — Visor de texto completo desde Drive (LEXIUS + Drive)

- **Nuevo endpoint GAS `GET ?path=documento/texto&id=UUID`**
  - *Motivo*: El visor mostraba solo el resumen de 80 palabras; el usuario necesita leer el texto legal completo (todos los artículos, capítulos, secciones).
  - *Comportamiento*: Busca el documento en el índice por UUID. Si tiene `drive_id`, extrae el texto directamente (para PDF convierte a Google Doc temporalmente). Si no tiene `drive_id` (caso LEXIUS), busca el archivo `.txt` en Drive por `nombre_archivo` usando `DriveApp.getFilesByName()`.
  - Soporta: `.txt` (lectura directa UTF-8), `.pdf` (conversión a Google Doc + extracción), `.docx` (conversión a Google Doc + extracción), Google Docs nativos.
  - *Fix fallback*: si no encuentra el archivo por nombre exacto, intenta búsqueda parcial con `title contains`.

- **Nuevo helper GAS `buscarYLeerArchivo(nombre, titulo)`** — encapsula la búsqueda en Drive y la extracción de texto para todos los formatos.

- **Visor de pantalla completa actualizado** (`openDocView`):
  - Antes: mostraba `resumen` (80 palabras) + `fragmentos_clave` cuando no había `drive_id`.
  - Ahora: llama siempre a `?path=documento/texto&id=UUID` y muestra **el texto íntegro** formateado con `formatLegalText` (títulos, capítulos, artículos, todo).
  - Si el archivo no está en Drive, muestra mensaje de error claro con el nombre del archivo a cargar.

- **GAS `Code.gs` requiere re-despliegue** para activar el nuevo endpoint.

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

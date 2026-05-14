/**
 * EL JURISTA — Google Apps Script API
 * Versión: 1.0.0
 * Cuenta: irvinleandro@gmail.com
 *
 * Despliegue: Ejecutar como → Yo (irvinleandro@gmail.com)
 *             Acceso: Cualquier persona (anónimo)
 *
 * IMPORTANTE: Al desplegar, copiar la URL del Web App y registrarla
 * en EL JURISTA/CLAUDE.md → campo GAS_URL_BASE
 */

// ─────────────────────────────────────────────
// CONFIGURACIÓN CENTRAL
// ─────────────────────────────────────────────
const CONFIG = {
  DRIVE_ROOT_ID:    '1bsMMHEzxsx5YbpCKaF1aATorTYquvclg', // carpeta "EL JURISTA"
  JURISTA_DB_ID:    '1oHWWIrpHcwJGrnzj1shIgA6Ud2AaKnGR', // carpeta "EL_JURISTA_DB"
  INDEX_FILE_NAME:  'jurista_index.json',
  BACKUPS_ID:       '1BVUD0NZgE5hKYNoPJxY57ZjO6YX2fqIS', // carpeta "_BACKUPS"
  MAX_BACKUPS:      4,
  // GITHUB_TOKEN: almacenado en Script Properties — no hardcodeado aquí.
  // Para configurarlo: ejecutar setGithubToken('ghp_...') desde el editor GAS.
  get GITHUB_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') || '';
  },
  GITHUB_REPO:      'ItoVzla/EL-JURISTA',
  GITHUB_BRANCH:    'main',
  GITHUB_INDEX_PATH:'data/jurista_index.json',
  LIBROS_FOLDER_ID: '1-l9ZA6OfKxGg1DDTHOIU4xc25QYfVzCu', // carpeta LIBROS en Drive
};

// Mapa de materias → IDs de carpetas en Drive
const MATERIAS_IDS = {
  'Constitucional':    '1tkJpQRWPP38ns6JPltz5x2_yJmx0AEUV',
  'Civil':             '1lvyZp4KLLvc_oaity6zrhfO9_peb-09D',
  'Mercantil':         '12lwUlXL3Ca6ICiYFC_ngVqniiLC10EAz',
  'Laboral_Venezuela': '1m7gr8XwOwQp6cqq4pTLBswJ6J4zwjJ3h',
  'Penal':             '1qKRvwtgCaSUAOaqWpYItdyQTAiKlZ13p',
  'Administrativo':    '1RnILL-TDZMRyc81hx3Kk2-uU1DPWD_C0',
  'Procesal':          '1j4zTA1v9ssgZV5t0JXMzIrMYgHezT3tP',
  'Electoral':         '1ANvBDtDY-ZFNNEgVj3p4BecCpbnlhEMz',
  'Derecho_Probatorio':'1g9_FajAoF2vZjdSHvzKLQ7FnqeryWjfW',
  'Internacional':     '1tdoLjxvXqYuoyxk8sfQxgBt2LlbRjpYA',
  'Tributario':        '1RP7cZGF4ACP6zs8L6j1pksbDnGCOzCVX',
  'ACIENPOL':          '1GO9mGAQWkHzFia85b43PsVMPZWRsLJsu',
  'No_Juridico':       '1jTMDVUtybfFhhkKsnrAfDam1TyYKLeC9', // archivados, sin uploads esperados
  '_Por_Clasificar':   '1jTMDVUtybfFhhkKsnrAfDam1TyYKLeC9',
};


// ─────────────────────────────────────────────
// ROUTER PRINCIPAL
// ─────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter;
  const path   = params.path || '';

  try {
    if (path === 'indice/resumen')   return jsonResponse(getIndiceResumen());
    if (path === 'indice/buscar')    return jsonResponse(buscarEnIndice(params));
    if (path === 'indice/doc')       return jsonResponse(getDocMeta(params.id));
    if (path === 'documento')        return jsonResponse(getDocumento(params.id));
    if (path === 'documento/texto')  return jsonResponse(getTextoCompleto(params));
    if (path === 'listar')           return jsonResponse(listarArchivos(params));
    if (path === 'descargar')        return jsonResponse(getUrlDescarga(params.id));
    if (path === 'libro/pdf-id')     return jsonResponse(getLibroDriveId(params.id));
    if (path === 'isbn/buscar')      return jsonResponse(buscarISBN(params.isbn || params.q));
    if (path === 'verificar/drive')  return jsonResponse(verificarArchivosEnDrive());
    return jsonResponse({ error: 'Endpoint no encontrado', path: path }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  const params = e.parameter;
  const path   = params.path || '';

  try {
    const body = e.postData ? JSON.parse(e.postData.contents) : {};

    if (path === 'subir')                   return jsonResponse(subirDocumento(body));
    if (path === 'clasificar')              return jsonResponse(clasificarDocumento(body));
    if (path === 'eliminar')                return jsonResponse(eliminarDocumento(body));
    if (path === 'scrape')                  return jsonResponse(scrapeUrl(body));
    if (path === 'indice/update')           return jsonResponse(actualizarDocMeta(body));
    if (path === 'documento/texto/update')  return jsonResponse(actualizarTextoDocumento(body));
    return jsonResponse({ error: 'Endpoint no encontrado', path: path }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}


// ─────────────────────────────────────────────
// GET /indice/resumen
// Retorna array liviano — solo campos esenciales
// ─────────────────────────────────────────────
function getIndiceResumen() {
  const index = leerIndex();
  return index.documentos
    .filter(d => !d.estado || d.estado === 'activo')
    .map(d => ({
      id:             d.id,
      drive_id:       d.drive_id        || '',
      nombre_archivo: d.nombre_archivo  || '',
      lexius_file:    d.lexius_file     || '',
      fuente:         d.fuente          || '',  // necesario para identificar LIBROS en el frontend
      titulo:         d.titulo,
      materia:        d.materia,
      sub_materia:    d.sub_materia,
      tipo:           d.tipo,
      autor:          d.autor,
      año:            d.año,
      tags:           d.tags,
      vigencia:       d.vigencia,
      cita_formal:    d.cita_formal,
      fecha_ingesta:  d.fecha_ingesta   || '',
      isbn:           d.isbn            || '',
      notebooklm_id:  d.notebooklm_id  || null,
    }));
}


// ─────────────────────────────────────────────
// GET /indice/buscar?q=TERM&materia=X&tipo=Y&año=Z
// Búsqueda textual — retorna top 10 con fragmentos
// ─────────────────────────────────────────────
function buscarEnIndice(params) {
  const q       = (params.q || '').toLowerCase();
  const materia = params.materia || '';
  const tipo    = params.tipo    || '';
  const año     = params.año     || '';

  const index = leerIndex();
  let docs = index.documentos.filter(d => !d.estado || d.estado === 'activo');

  // Filtros
  if (materia) docs = docs.filter(d => d.materia === materia);
  if (tipo)    docs = docs.filter(d => d.tipo === tipo);
  if (año)     docs = docs.filter(d => String(d.año) === String(año));

  // Búsqueda textual con scoring
  if (q) {
    docs = docs
      .map(d => {
        let score = 0;
        const titleMatch  = d.titulo.toLowerCase().includes(q);
        const autorMatch  = (d.autor || '').toLowerCase().includes(q);
        const tagMatch    = (d.tags || []).some(t => t.toLowerCase().includes(q));
        const resumenMatch= (d.resumen || '').toLowerCase().includes(q);
        const fragMatch   = (d.fragmentos_clave || []).some(f => f.toLowerCase().includes(q));

        if (titleMatch)   score += 10;
        if (autorMatch)   score += 5;
        if (tagMatch)     score += 4;
        if (resumenMatch) score += 2;
        if (fragMatch)    score += 3;
        return { doc: d, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(x => x.doc);
  } else {
    docs = docs.slice(0, 10);
  }

  // Retorna con fragmentos clave
  return docs.map(d => ({
    id:              d.id,
    drive_id:        d.drive_id,
    titulo:          d.titulo,
    materia:         d.materia,
    sub_materia:     d.sub_materia,
    tipo:            d.tipo,
    autor:           d.autor,
    año:             d.año,
    resumen:         d.resumen,
    fragmentos_clave:d.fragmentos_clave,
    cita_formal:     d.cita_formal,
    tags:            d.tags,
    notebooklm_id:   d.notebooklm_id || null,
  }));
}


// ─────────────────────────────────────────────
// GET /documento?id=DRIVE_ID
// Extrae y retorna el texto completo del PDF
// ─────────────────────────────────────────────
function getDocumento(driveId) {
  if (!driveId) throw new Error('Parámetro id requerido');

  // ── Caché de texto (CacheService, TTL 6h) ─────────────────
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'doc_txt_' + driveId;
  const cached   = cache.get(cacheKey);
  if (cached) {
    return { drive_id: driveId, titulo: '', texto: cached, caracteres: cached.length, fromCache: true };
  }

  const file = DriveApp.getFileById(driveId);
  const mimeType = file.getMimeType();
  let texto = '';

  if (mimeType === 'text/plain' || mimeType === 'application/octet-stream') {
    // Archivo de texto plano (.txt) — leer directamente
    texto = file.getBlob().getDataAsString('UTF-8');
    texto = limpiarTextoLexius(texto);
  } else if (mimeType === 'application/pdf') {
    // Convertir PDF a Google Doc temporalmente para extraer texto
    const resource = { title: '_tmp_extract_' + driveId, mimeType: 'application/vnd.google-apps.document' };
    const blob = file.getBlob();
    const tmpDoc = Drive.Files.insert(resource, blob, { convert: true });
    const doc = DocumentApp.openById(tmpDoc.id);
    texto = doc.getBody().getText();
    DriveApp.getFileById(tmpDoc.id).setTrashed(true);
  } else if (mimeType === 'application/vnd.google-apps.document') {
    texto = DocumentApp.openById(driveId).getBody().getText();
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const resource = { title: '_tmp_docx_' + driveId, mimeType: 'application/vnd.google-apps.document' };
    const tmpDoc   = Drive.Files.insert(resource, file.getBlob(), { convert: true });
    texto          = DocumentApp.openById(tmpDoc.id).getBody().getText();
    DriveApp.getFileById(tmpDoc.id).setTrashed(true);
  } else {
    texto = '[Formato no soportado para extracción de texto: ' + mimeType + ']';
  }

  // Guardar en caché si cabe (máx 100 KB por entrada de CacheService)
  if (texto && texto.length <= 100000) {
    try { cache.put(cacheKey, texto, 21600); } catch(e) { /* silent */ }
  }

  return {
    drive_id:   driveId,
    titulo:     file.getName(),
    texto:      texto,
    caracteres: texto.length,
  };
}


// ─────────────────────────────────────────────
// GET /documento/texto?id=UUID  (o &nombre=FILENAME)
// Devuelve el texto COMPLETO de un documento.
// Prioridad:
//   1. Si el doc tiene drive_id → delega a getDocumento(drive_id)
//   2. Si no → busca el archivo por nombre en Drive (LEXIUS .txt)
// ─────────────────────────────────────────────
function getTextoCompleto(params) {
  const id     = params.id     || '';
  const nombre = params.nombre || '';

  // Caso 1: se pasó un drive_id directo
  if (!id && !nombre) throw new Error('Se requiere id (UUID) o nombre (filename)');

  // Si vino UUID, buscar el doc en el índice
  if (id) {
    const index = leerIndex();
    const doc   = index.documentos.find(d => d.id === id);
    if (!doc) throw new Error('Documento no encontrado en índice: ' + id);

    // Tiene drive_id: delegar al extractor de Drive
    if (doc.drive_id) return getDocumento(doc.drive_id);

    // Sin drive_id pero es libro (LIBROS): devolver resumen + fragmentos del índice
    if (doc.fuente === 'LIBROS') {
      const partes = [doc.resumen || ''].concat(doc.fragmentos_clave || []).filter(Boolean);
      const texto  = partes.join('\n\n') || '(Sin texto disponible)';
      return { titulo: doc.titulo, drive_id: '', texto: texto, caracteres: texto.length,
               fuente: 'LIBROS', nota: 'Texto extraído del índice (resumen y fragmentos clave)' };
    }

    // Derivar el nombre real del archivo:
    // 1. Usar el basename del campo lexius_file (nombre original de LEXIUS)
    // 2. Fallback al nombre_archivo (nombre normalizado, menos fiable)
    let searchName = '';
    if (doc.lexius_file) {
      // lexius_file = "Legislación/Constitución/Constitución de Venezuela 1999.txt"
      const parts = doc.lexius_file.split('/');
      searchName = parts[parts.length - 1]; // → "Constitución de Venezuela 1999.txt"
    }
    if (!searchName && doc.nombre_archivo) searchName = doc.nombre_archivo;
    if (!searchName) throw new Error('El documento no tiene archivo asociado');

    return buscarYLeerArchivo(searchName, doc.titulo);
  }

  // Se pasó nombre directamente
  return buscarYLeerArchivo(nombre, nombre);
}

// Busca un archivo en todo el Drive por nombre y devuelve su texto
function buscarYLeerArchivo(nombre, titulo) {
  // ── Caché de texto (CacheService, TTL 6h) ─────────────────
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'file_txt_' + nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 200);
  const cached   = cache.get(cacheKey);
  if (cached) {
    return { nombre, titulo: titulo || nombre, drive_id: '', texto: cached, caracteres: cached.length, fromCache: true };
  }

  // 1. Búsqueda exacta por nombre
  let files = DriveApp.getFilesByName(nombre);
  if (!files.hasNext()) {
    // 2. Fallback: el nombre puede estar truncado en Drive (LEXIUS trunca a ~100 chars)
    //    Buscar por los primeros 60 caracteres del nombre sin extensión
    const sinExt = nombre.replace(/\.[^.]+$/, '');
    const fragmento = sinExt.substring(0, 60).replace(/"/g, '');
    files = DriveApp.searchFiles('title contains "' + fragmento + '" and mimeType = "text/plain"');
  }

  if (!files.hasNext()) {
    throw new Error('Archivo no encontrado en Drive: ' + nombre +
      '. Carga el archivo .txt en la carpeta de su materia en Drive.');
  }

  const file     = files.next();
  const mimeType = file.getMimeType();
  let texto      = '';

  if (mimeType === 'text/plain' || mimeType === 'application/octet-stream') {
    texto = file.getBlob().getDataAsString('UTF-8');
  } else if (mimeType === 'application/pdf') {
    // Convertir PDF a Google Doc para extraer texto
    const resource = { title: '_tmp_' + file.getId(), mimeType: 'application/vnd.google-apps.document' };
    const tmpDoc   = Drive.Files.insert(resource, file.getBlob(), { convert: true });
    texto          = DocumentApp.openById(tmpDoc.id).getBody().getText();
    DriveApp.getFileById(tmpDoc.id).setTrashed(true);
  } else if (mimeType === 'application/vnd.google-apps.document') {
    texto = DocumentApp.openById(file.getId()).getBody().getText();
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // DOCX: convertir a Google Doc
    const resource = { title: '_tmp_' + file.getId(), mimeType: 'application/vnd.google-apps.document' };
    const tmpDoc   = Drive.Files.insert(resource, file.getBlob(), { convert: true });
    texto          = DocumentApp.openById(tmpDoc.id).getBody().getText();
    DriveApp.getFileById(tmpDoc.id).setTrashed(true);
  } else {
    throw new Error('Formato no soportado para lectura: ' + mimeType);
  }

  // Limpiar artefactos de UI de LEXIUS antes de devolver
  texto = limpiarTextoLexius(texto);

  // Guardar en caché si cabe (máx 100 KB)
  if (texto && texto.length <= 100000) {
    try { cache.put(cacheKey, texto, 21600); } catch(e) { /* silent */ }
  }

  return {
    nombre:     nombre,
    titulo:     titulo || file.getName(),
    drive_id:   file.getId(),
    texto:      texto,
    caracteres: texto.length,
  };
}

// ─────────────────────────────────────────────
// Limpia artefactos de la plataforma LEXIUS
// que quedaron incrustados en el texto scrapeado
// ─────────────────────────────────────────────
function limpiarTextoLexius(texto) {
  if (!texto) return texto;

  // Bloques de UI de LEXIUS (orden importa: del más específico al más general)
  const patrones = [
    // Botones de acción de LEXIUS
    /Sintetizar texto legal con el Asistente Virtual\s*/gi,
    /Generar Video Podcast Legal usando este texto legal como contexto\s*/gi,
    /Generar Canci[oó]n usando este texto legal como contexto\s*/gi,
    /Crear P[aá]gina Interactiva usando este texto legal como contexto\s*/gi,
    /Generar Presentaci[oó]n de PowerPoint usando este texto legal como contexto\s*/gi,
    /Iniciar llamada con .{0,80} acerca de este texto legal\s*/gi,
    // Pie de página / ayuda LEXIUS
    /[¿?]?Tienes dudas acerca de c[oó]mo usar la aplicaci[oó]n\?.*?escribenos[\s\S]{0,200}/gi,
    // Encabezados de LEXIUS con nombre de la ley repetido al inicio
    /^.{0,200}appvenezuela\.lexius\.io.{0,200}\n?/gim,
    // "Volver" y botones de navegación
    /^\s*Volver\s*$/gim,
    // Líneas sueltas que solo contienen "LEXIUS" o "Lexius Venezuela"
    /^.*[Ll]exius.*$/gim,
    // Metadata de LEXIUS al inicio del archivo (antes del título real)
    /^Gaceta Oficial.*?\n(?=Gaceta Oficial|\d|[A-ZÁÉÍÓÚ])/gm,
  ];

  patrones.forEach(p => { texto = texto.replace(p, ''); });

  // Normalizar espacios en blanco excesivos (máx 2 líneas en blanco seguidas)
  texto = texto.replace(/\n{4,}/g, '\n\n\n');

  return texto.trim();
}


// ─────────────────────────────────────────────
// GET /listar?materia=X&tipo=Y
// Lista archivos en Drive para la Biblioteca
// ─────────────────────────────────────────────
function listarArchivos(params) {
  const index = leerIndex();
  let docs = index.documentos.filter(d => !d.estado || d.estado === 'activo');

  if (params.materia) docs = docs.filter(d => d.materia === params.materia);
  if (params.tipo)    docs = docs.filter(d => d.tipo === params.tipo);

  return docs.map(d => ({
    id:           d.id,
    drive_id:     d.drive_id,
    titulo:       d.titulo,
    materia:      d.materia,
    sub_materia:  d.sub_materia,
    tipo:         d.tipo,
    autor:        d.autor,
    año:          d.año,
    vigencia:     d.vigencia,
    cita_formal:  d.cita_formal,
    nombre_archivo: d.nombre_archivo,
    fecha_ingesta:  d.fecha_ingesta,
  }));
}


// ─────────────────────────────────────────────
// GET /descargar?id=DRIVE_ID
// Retorna URL temporal de descarga
// ─────────────────────────────────────────────
function getUrlDescarga(driveId) {
  if (!driveId) throw new Error('Parámetro id requerido');
  const file = DriveApp.getFileById(driveId);
  // Hacer el archivo accesible temporalmente (vista)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    drive_id:     driveId,
    titulo:       file.getName(),
    download_url: 'https://drive.google.com/uc?export=download&id=' + driveId,
    view_url:     file.getUrl(),
  };
}


// ─────────────────────────────────────────────
// POST /subir
// Guarda en Drive, indexa, actualiza JSON, replica a GitHub
// ─────────────────────────────────────────────
function subirDocumento(body) {
  // Validaciones
  const req = ['titulo', 'materia', 'tipo', 'año', 'contenido_base64', 'extension'];
  req.forEach(f => { if (!body[f]) throw new Error('Campo requerido: ' + f); });

  const materia    = body.materia;
  const subMateria = body.sub_materia || '';
  const tipo       = body.tipo;
  const autor      = body.autor || '-';
  const año        = body.año;
  const titulo     = body.titulo;
  const ext        = body.extension.toLowerCase().replace('.', '');

  // Generar nombre según convención
  const slug        = slugify(titulo);
  const autorSlug   = slugify(autor.split(' ').slice(-1)[0]); // último apellido
  const tipoAbrev   = { legislacion:'LEY', sentencia:'SENT', doctrina:'DOC',
                         articulo:'ART', tesis:'TESIS', convenio:'CONV', modelo:'MOD' }[tipo] || tipo.toUpperCase();
  const matAbrev    = materia.toUpperCase().replace('_VENEZUELA','').replace('DERECHO_','');
  const nombreArchivo = `${matAbrev}_${tipoAbrev}_${autorSlug}_${año}_${slug}.${ext}`;

  // Encontrar carpeta destino en Drive
  const carpetaPadreId = MATERIAS_IDS[materia] || MATERIAS_IDS['_Por_Clasificar'];
  let carpetaDestinoId = carpetaPadreId;

  if (subMateria) {
    // Buscar subcarpeta dentro de la materia
    const subcarpetas = DriveApp.getFolderById(carpetaPadreId).getFoldersByName(subMateria);
    if (subcarpetas.hasNext()) {
      carpetaDestinoId = subcarpetas.next().getId();
    }
  }

  // Guardar archivo en Drive
  const mimeMap = {
    'pdf':  'application/pdf',
    'txt':  'text/plain',
    'md':   'text/plain',
    'html': 'text/html',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc':  'application/msword',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  const blob     = Utilities.newBlob(Utilities.base64Decode(body.contenido_base64), mime, nombreArchivo);
  const carpeta  = DriveApp.getFolderById(carpetaDestinoId);
  const archivo  = carpeta.createFile(blob);
  const driveId  = archivo.getId();

  // Construir registro para el índice
  const uuid = Utilities.getUuid();
  const registro = {
    id:              uuid,
    drive_id:        driveId,
    titulo:          titulo,
    materia:         materia,
    sub_materia:     subMateria,
    tipo:            tipo,
    autor:           autor,
    año:             parseInt(año),
    editorial:       body.editorial || null,
    isbn:            body.isbn || null,
    sala:            body.sala || null,
    expediente:      body.expediente || null,
    ponente:         body.ponente || null,
    partes:          body.partes || null,
    fecha_sentencia: body.fecha_sentencia || null,
    vigencia:        body.vigencia || 'vigente',
    tags:            body.tags || [],
    resumen:         body.resumen || generarResumen(body.texto_extraido || ''),
    indice_libro:    body.indice_libro || '',
    fragmentos_clave:body.fragmentos_clave || extraerFragmentos(body.texto_extraido || ''),
    cita_formal:     generarCita(body),
    nombre_archivo:  nombreArchivo,
    fecha_ingesta:   Utilities.formatDate(new Date(), 'America/Caracas', 'yyyy-MM-dd'),
    estado:          'activo',
  };

  // Actualizar jurista_index.json
  const index = leerIndex();
  index.documentos.push(registro);
  index.total_documentos = index.documentos.filter(d => !d.estado || d.estado === 'activo').length;
  index.ultima_actualizacion = new Date().toISOString();
  guardarIndex(index);

  // Replicar índice a GitHub (backup Capa 2)
  replicarIndexAGitHub(index);

  // Registrar en DB_CHANGELOG
  registrarDBChangelog('AÑADIDO', nombreArchivo, materia + '/' + (subMateria || ''));

  return {
    success:        true,
    id:             uuid,
    drive_id:       driveId,
    nombre_archivo: nombreArchivo,
    carpeta_drive:  carpetaDestinoId,
    total_docs:     index.total_documentos,
  };
}


// ─────────────────────────────────────────────
// POST /clasificar
// Mueve doc de _Por_Clasificar a su carpeta definitiva
// ─────────────────────────────────────────────
function clasificarDocumento(body) {
  if (!body.drive_id || !body.materia) throw new Error('drive_id y materia requeridos');

  const file = DriveApp.getFileById(body.drive_id);
  const carpetaDestinoId = MATERIAS_IDS[body.materia] || MATERIAS_IDS['_Por_Clasificar'];
  const carpetaDestino   = DriveApp.getFolderById(carpetaDestinoId);
  const carpetaOrigen    = DriveApp.getFolderById(MATERIAS_IDS['_Por_Clasificar']);

  // Mover archivo
  carpetaDestino.addFile(file);
  carpetaOrigen.removeFile(file);

  // Actualizar índice
  const index = leerIndex();
  const doc = index.documentos.find(d => d.drive_id === body.drive_id);
  if (doc) {
    const materiaAnterior = doc.materia;
    doc.materia     = body.materia;
    doc.sub_materia = body.sub_materia || '';
    guardarIndex(index);
    replicarIndexAGitHub(index);
    registrarDBChangelog('RECLASIFICADO', doc.nombre_archivo, materiaAnterior + ' → ' + body.materia);
  }

  return { success: true, drive_id: body.drive_id, nueva_materia: body.materia };
}


// ─────────────────────────────────────────────
// POST /eliminar
// Soft delete — marca estado como "eliminado"
// ─────────────────────────────────────────────
function eliminarDocumento(body) {
  if (!body.id) throw new Error('Campo id requerido');
  if (!body.password) throw new Error('Contraseña requerida');
  if (body.password !== 'ElJurista2026') throw new Error('Contraseña incorrecta');

  const index = leerIndex();
  const doc = index.documentos.find(d => d.id === body.id);
  if (!doc) throw new Error('Documento no encontrado: ' + body.id);

  // Enviar archivo a papelera de Drive si tiene drive_id
  if (doc.drive_id) {
    try {
      DriveApp.getFileById(doc.drive_id).setTrashed(true);
    } catch(e) {
      // Archivo no accesible o ya eliminado — continuar
    }
  }

  doc.estado = 'eliminado';
  index.total_documentos = index.documentos.filter(d => !d.estado || d.estado === 'activo').length;
  index.ultima_actualizacion = new Date().toISOString();
  guardarIndex(index);
  replicarIndexAGitHub(index);
  registrarDBChangelog('ELIMINADO', doc.nombre_archivo || doc.titulo, doc.materia);

  return { success: true, id: body.id, titulo: doc.titulo };
}


// ─────────────────────────────────────────────
// POST /scrape
// Usa Jina AI Reader para extraer texto de una URL
// ─────────────────────────────────────────────
function scrapeUrl(body) {
  if (!body.url) throw new Error('Campo url requerido');

  const jinaUrl = 'https://r.jina.ai/' + encodeURIComponent(body.url);
  const response = UrlFetchApp.fetch(jinaUrl, {
    headers: { 'Accept': 'text/plain' },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Jina AI no pudo procesar la URL. Código: ' + response.getResponseCode());
  }

  const texto = response.getContentText();

  // Auto-clasificar por palabras clave
  const materia = autoClasificar(texto + ' ' + (body.url || ''));

  // Si la URL apunta a un PDF, descargarlo
  let archivoGuardado = null;
  if (body.url.toLowerCase().endsWith('.pdf') || response.getHeaders()['Content-Type'] === 'application/pdf') {
    const pdfResponse = UrlFetchApp.fetch(body.url, { muteHttpExceptions: true });
    if (pdfResponse.getResponseCode() === 200) {
      const carpetaId = MATERIAS_IDS[materia] || MATERIAS_IDS['_Por_Clasificar'];
      const nombreTmp = 'scrape_' + Utilities.formatDate(new Date(), 'America/Caracas', 'yyyyMMdd_HHmmss') + '.pdf';
      const blob = pdfResponse.getBlob().setName(nombreTmp);
      const archivo = DriveApp.getFolderById(carpetaId).createFile(blob);
      archivoGuardado = { drive_id: archivo.getId(), nombre: nombreTmp, carpeta: materia };
    }
  }

  return {
    success:          true,
    url:              body.url,
    materia_detectada:materia,
    texto_extraido:   texto.substring(0, 2000) + (texto.length > 2000 ? '...' : ''),
    longitud_total:   texto.length,
    archivo_guardado: archivoGuardado,
    pendiente_indexar: archivoGuardado ? true : false,
  };
}


// ─────────────────────────────────────────────
// BACKUP SEMANAL — Trigger: domingo 2-3am
// ─────────────────────────────────────────────
function backupSemanal() {
  const fecha     = Utilities.formatDate(new Date(), 'America/Caracas', 'yyyy-MM-dd');
  const nombreBkp = 'BACKUP_' + fecha;

  // Crear carpeta del backup
  const backupFolder = DriveApp.getFolderById(CONFIG.BACKUPS_ID).createFolder(nombreBkp);

  // Copiar todos los archivos de EL_JURISTA_DB excepto _BACKUPS
  copiarCarpetaRecursivo(
    DriveApp.getFolderById(CONFIG.JURISTA_DB_ID),
    backupFolder,
    CONFIG.BACKUPS_ID // excluir esta carpeta
  );

  // Limpiar backups viejos (conservar solo MAX_BACKUPS)
  const backupsFolder = DriveApp.getFolderById(CONFIG.BACKUPS_ID);
  const carpetas = [];
  const iter = backupsFolder.getFolders();
  while (iter.hasNext()) {
    const c = iter.next();
    carpetas.push({ name: c.getName(), id: c.getId() });
  }
  carpetas.sort((a, b) => a.name.localeCompare(b.name)); // orden cronológico

  while (carpetas.length > CONFIG.MAX_BACKUPS) {
    const vieja = carpetas.shift();
    DriveApp.getFolderById(vieja.id).setTrashed(true);
  }

  // Registrar en DB_CHANGELOG
  const index = leerIndex();
  registrarDBChangelog(
    'BACKUP',
    nombreBkp,
    'Backup automático — ' + index.total_documentos + ' documentos respaldados'
  );

  Logger.log('Backup completado: ' + nombreBkp);
}

function copiarCarpetaRecursivo(origen, destino, excluirId) {
  // Copiar archivos
  const archivos = origen.getFiles();
  while (archivos.hasNext()) {
    const f = archivos.next();
    f.makeCopy(f.getName(), destino);
  }
  // Copiar subcarpetas recursivamente
  const subcarpetas = origen.getFolders();
  while (subcarpetas.hasNext()) {
    const sub = subcarpetas.next();
    if (sub.getId() === excluirId) continue;
    const nuevaSub = destino.createFolder(sub.getName());
    copiarCarpetaRecursivo(sub, nuevaSub, excluirId);
  }
}


// ─────────────────────────────────────────────
// GET /indice/doc?id=UUID
// Retorna todos los campos de un documento del índice
// ─────────────────────────────────────────────
function getDocMeta(id) {
  if (!id) throw new Error('Parámetro id requerido');
  const index = leerIndex();
  const doc = index.documentos.find(d => d.id === id);
  if (!doc) throw new Error('Documento no encontrado: ' + id);
  return doc;
}


// ─────────────────────────────────────────────
// POST /indice/update
// Actualiza campos editables de un documento en el índice
// ─────────────────────────────────────────────
function actualizarDocMeta(body) {
  if (!body.id) throw new Error('Campo id requerido');
  const index = leerIndex();
  const i = index.documentos.findIndex(d => d.id === body.id);
  if (i === -1) throw new Error('Documento no encontrado: ' + body.id);

  const EDITABLES = [
    'titulo', 'autor', 'año', 'materia', 'sub_materia', 'tipo', 'vigencia',
    'resumen', 'indice_libro', 'cita_formal', 'tags', 'ponente', 'sala', 'expediente',
    'fecha_sentencia', 'partes', 'editorial', 'isbn', 'edicion',
    'gaceta_oficial', 'fecha_gaceta', 'coautores', 'pais', 'drive_id', 'estado'
  ];
  EDITABLES.forEach(k => {
    if (body[k] !== undefined) index.documentos[i][k] = body[k];
  });
  index.ultima_actualizacion = new Date().toISOString();

  guardarIndex(index);
  replicarIndexAGitHub(index);
  registrarDBChangelog('EDITADO',
    index.documentos[i].nombre_archivo || index.documentos[i].titulo,
    index.documentos[i].materia);

  return { success: true, doc: index.documentos[i] };
}


// ─────────────────────────────────────────────
// POST /documento/texto/update
// Sobreescribe el archivo .txt en Drive con el
// texto editado por el usuario.
// Body: { id: UUID, texto: string }
// ─────────────────────────────────────────────
function actualizarTextoDocumento(body) {
  if (!body.id) throw new Error('Campo id requerido');
  if (body.texto === undefined || body.texto === null) throw new Error('Campo texto requerido');

  const texto = String(body.texto);
  const index = leerIndex();
  const doc   = index.documentos.find(d => d.id === body.id);
  if (!doc) throw new Error('Documento no encontrado en índice: ' + body.id);

  let file = null;

  // 1. Si tiene drive_id, intentar directamente
  if (doc.drive_id) {
    try {
      const f    = DriveApp.getFileById(doc.drive_id);
      const mime = f.getMimeType();
      if (mime === 'text/plain' || mime === 'application/octet-stream') {
        file = f;
      } else {
        throw new Error(
          'Este documento es un ' + mime + '. Solo se pueden editar archivos de texto (.txt) directamente. ' +
          'Los PDFs deben reemplazarse en Drive.'
        );
      }
    } catch (e) {
      if (e.message.startsWith('Este documento es')) throw e;
      // drive_id inválido — fallback a búsqueda por nombre
    }
  }

  // 2. Si no hay drive_id válido, buscar el archivo por nombre
  if (!file) {
    let searchName = '';
    if (doc.lexius_file) {
      const parts = doc.lexius_file.split('/');
      searchName  = parts[parts.length - 1];
    }
    if (!searchName && doc.nombre_archivo) searchName = doc.nombre_archivo;
    if (!searchName) throw new Error('El documento no tiene archivo .txt asociado — agrega el archivo a Drive primero.');

    let files = DriveApp.getFilesByName(searchName);
    if (!files.hasNext()) {
      const sinExt    = searchName.replace(/\.[^.]+$/, '');
      const fragmento = sinExt.substring(0, 60).replace(/"/g, '');
      files = DriveApp.searchFiles('title contains "' + fragmento + '" and mimeType = "text/plain"');
    }
    if (!files.hasNext()) {
      throw new Error('Archivo no encontrado en Drive: ' + searchName + '. Cárgalo primero en su carpeta de materia.');
    }
    file = files.next();
  }

  // Escribir el texto nuevo
  file.setContent(texto);

  // Actualizar drive_id en el índice si no lo tenía
  if (!doc.drive_id) doc.drive_id = file.getId();

  // Actualizar resumen y fragmentos_clave en el índice con el texto nuevo
  doc.resumen          = generarResumen(texto);
  doc.fragmentos_clave = extraerFragmentos(texto);
  index.ultima_actualizacion = new Date().toISOString();

  guardarIndex(index);
  // No sincronizar a GitHub en cada edición de texto (demasiado lento)
  // — se sincronizará en la próxima operación de índice normal

  registrarDBChangelog('TEXTO_EDITADO', doc.nombre_archivo || doc.titulo, doc.materia);

  return {
    success:    true,
    drive_id:   file.getId(),
    titulo:     doc.titulo,
    caracteres: texto.length,
    message:    'Texto guardado correctamente en Drive.',
  };
}


// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES — Índice
// ─────────────────────────────────────────────
function leerIndex() {
  const folder = DriveApp.getFolderById(CONFIG.JURISTA_DB_ID);
  const files   = folder.getFilesByName(CONFIG.INDEX_FILE_NAME);
  if (!files.hasNext()) return { version:'1.0', ultima_actualizacion: new Date().toISOString(), total_documentos: 0, documentos: [] };
  const file    = files.next();
  const content = file.getBlob().getDataAsString('UTF-8');
  return JSON.parse(content);
}

function guardarIndex(index) {
  const folder = DriveApp.getFolderById(CONFIG.JURISTA_DB_ID);
  const files   = folder.getFilesByName(CONFIG.INDEX_FILE_NAME);
  const content = JSON.stringify(index, null, 2);
  if (files.hasNext()) {
    files.next().setContent(content);
  } else {
    folder.createFile(CONFIG.INDEX_FILE_NAME, content, 'application/json');
  }
}


// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES — GitHub (backup Capa 2)
// ─────────────────────────────────────────────
function replicarIndexAGitHub(index) {
  try {
    const apiBase = 'https://api.github.com/repos/' + CONFIG.GITHUB_REPO + '/contents/' + CONFIG.GITHUB_INDEX_PATH;
    const headers = {
      'Authorization': 'token ' + CONFIG.GITHUB_TOKEN,
      'Accept':        'application/vnd.github.v3+json',
      'User-Agent':    'EL-JURISTA-GAS',
    };

    // Obtener SHA actual del archivo (requerido para actualizar)
    let sha = null;
    const getResp = UrlFetchApp.fetch(apiBase + '?ref=' + CONFIG.GITHUB_BRANCH, {
      headers: headers,
      muteHttpExceptions: true,
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }

    // Subir/actualizar el archivo
    const content   = Utilities.base64Encode(JSON.stringify(index, null, 2), Utilities.Charset.UTF_8);
    const putBody   = {
      message: 'index: actualización automática ' + Utilities.formatDate(new Date(), 'America/Caracas', 'yyyy-MM-dd HH:mm'),
      content: content,
      branch:  CONFIG.GITHUB_BRANCH,
    };
    if (sha) putBody.sha = sha;

    UrlFetchApp.fetch(apiBase, {
      method:             'put',
      headers:            headers,
      payload:            JSON.stringify(putBody),
      muteHttpExceptions: true,
    });

  } catch (err) {
    Logger.log('Error replicando a GitHub: ' + err.message);
    // No lanzar el error — el backup de GitHub es Capa 2, no crítico
  }
}


// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES — DB_CHANGELOG
// ─────────────────────────────────────────────
function registrarDBChangelog(accion, archivo, detalle) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_ID);
    const files   = folder.getFilesByName('DB_CHANGELOG.md');
    let contenido = '';

    if (files.hasNext()) {
      contenido = files.next().getBlob().getDataAsString('UTF-8');
    }

    const fecha   = Utilities.formatDate(new Date(), 'America/Caracas', 'yyyy-MM-dd HH:mm');
    const entrada = `\n## ${fecha} — ${accion}\n\n| Acción | Archivo | Detalle |\n|---|---|---|\n| ${accion} | ${archivo} | ${detalle} |\n\n---\n`;

    // Insertar al inicio (después del encabezado)
    const lineas     = contenido.split('\n');
    const firstEntry = lineas.findIndex((l, i) => i > 0 && l.startsWith('## '));
    if (firstEntry > 0) {
      lineas.splice(firstEntry, 0, ...entrada.split('\n'));
      contenido = lineas.join('\n');
    } else {
      contenido = contenido + entrada;
    }

    const filesExist = folder.getFilesByName('DB_CHANGELOG.md');
    if (filesExist.hasNext()) {
      filesExist.next().setContent(contenido);
    } else {
      folder.createFile('DB_CHANGELOG.md', contenido, 'text/plain');
    }
  } catch (err) {
    Logger.log('Error actualizando DB_CHANGELOG: ' + err.message);
  }
}


// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES — Texto y Clasificación
// ─────────────────────────────────────────────
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40);
}

function generarResumen(texto) {
  if (!texto) return '';
  const palabras = texto.replace(/\s+/g, ' ').trim().split(' ');
  return palabras.slice(0, 100).join(' ') + (palabras.length > 100 ? '...' : '');
}

function extraerFragmentos(texto) {
  if (!texto) return [];
  const parrafos = texto.split(/\n\n+/).filter(p => p.trim().length > 80);
  return parrafos.slice(0, 3).map(p => p.trim().substring(0, 300));
}

function generarCita(body) {
  const tipo = body.tipo || '';
  if (tipo === 'sentencia') {
    return `${body.sala || 'TSJ'}, sentencia de fecha ${body.fecha_sentencia || body.año}, expediente ${body.expediente || 'N/A'}.`;
  } else if (tipo === 'legislacion' || tipo === 'convenio') {
    return `${body.titulo} (${body.año}).`;
  } else {
    return `${body.autor || 'Autor desconocido'} (${body.año}). ${body.titulo}. ${body.editorial || ''}.`.trim();
  }
}

function autoClasificar(texto) {
  const t = texto.toLowerCase();
  const reglas = [
    { materia: 'Laboral_Venezuela',  palabras: ['lottt','loptra','lopcymat','prestaciones','antigüedad','trabajador','despido','sala de casación social'] },
    { materia: 'Constitucional',     palabras: ['crbv','constitución','amparo','sala constitucional','derechos fundamentales'] },
    { materia: 'Penal',              palabras: ['copp','código penal','imputado','acusado','sala penal','ministerio público'] },
    { materia: 'Civil',              palabras: ['código civil','obligaciones','contrato','sala de casación civil','demandante','demandado'] },
    { materia: 'Mercantil',          palabras: ['código de comercio','sociedad anónima','letra de cambio','quiebra','atraso'] },
    { materia: 'Administrativo',     palabras: ['lopa','sala político','contencioso administrativo','contraloría','acto administrativo'] },
    { materia: 'Electoral',          palabras: ['cne','lopre','sala electoral','proceso electoral','votación'] },
    { materia: 'Derecho_Probatorio', palabras: ['prueba','probatorio','valoración','sana crítica','cadena de custodia','licitud'] },
    { materia: 'Procesal',           palabras: ['cpc','loptra','nulidad','reposición','lapso procesal','recurso de apelación'] },
  ];

  let mejor = { materia: '_Por_Clasificar', score: 0 };
  reglas.forEach(r => {
    const score = r.palabras.filter(p => t.includes(p)).length;
    if (score > mejor.score) mejor = { materia: r.materia, score };
  });
  return mejor.materia;
}


// ─────────────────────────────────────────────
// LIBROS — Buscar Drive ID por ID de índice
// ─────────────────────────────────────────────
function getLibroDriveId(docId) {
  if (!docId) return { error: 'id requerido' };
  const index = leerIndex();
  const doc = (index.documentos || []).find(function(d){ return d.id === docId; });
  if (!doc) return { error: 'Documento no encontrado en índice' };
  if (doc.drive_id) return { drive_id: doc.drive_id };

  const rutaLocal = doc.ruta_local || doc.nombre_archivo || '';
  const filename  = rutaLocal.split('/').pop();
  if (!filename) return { error: 'ruta_local no disponible' };

  // Buscar en carpeta LIBROS (desde CONFIG) con fallback a todo Drive
  const safeFilename = filename.replace(/'/g, "\\'");
  const queryLibros  = "title = '" + safeFilename + "' and '" + CONFIG.LIBROS_FOLDER_ID + "' in ancestors and trashed = false";
  const queryAll     = "title = '" + safeFilename + "' and trashed = false";
  try {
    let results = DriveApp.searchFiles(queryLibros);
    if (!results.hasNext()) results = DriveApp.searchFiles(queryAll);
    if (results.hasNext()) {
      const file     = results.next();
      const drive_id = file.getId();
      doc.drive_id   = drive_id;
      guardarIndex(index);
      replicarIndexAGitHub(index);
      return { drive_id: drive_id, nombre: file.getName() };
    }
  } catch(e) {
    return { error: e.message };
  }
  return { error: 'Archivo no encontrado en Drive' };
}


// ─────────────────────────────────────────────
// GET /isbn/buscar?isbn=XXXXXX
// Consulta Google Books API para obtener metadatos
// ─────────────────────────────────────────────
function buscarISBN(isbn) {
  if (!isbn) return { error: 'ISBN requerido' };
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  try {
    const url = 'https://www.googleapis.com/books/v1/volumes?q=isbn:' + encodeURIComponent(cleanIsbn);
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw new Error('Google Books no disponible');
    const data  = JSON.parse(resp.getContentText());
    if (!data.totalItems || !data.items || !data.items.length) {
      // Fallback: OpenLibrary
      return buscarISBNOpenLibrary(cleanIsbn);
    }
    const vol  = data.items[0].volumeInfo || {};
    return {
      titulo:    vol.title || '',
      subtitulo: vol.subtitle || '',
      autores:   (vol.authors || []).join(', '),
      editorial: vol.publisher || '',
      año:       vol.publishedDate ? parseInt(vol.publishedDate.substring(0, 4)) : null,
      isbn:      cleanIsbn,
      descripcion: vol.description ? vol.description.substring(0, 500) : '',
      paginas:   vol.pageCount || null,
      idioma:    vol.language || '',
      imagen:    vol.imageLinks ? (vol.imageLinks.thumbnail || '') : '',
      fuente:    'Google Books',
    };
  } catch(e) {
    try { return buscarISBNOpenLibrary(cleanIsbn); } catch(e2) {}
    return { error: e.message };
  }
}

function buscarISBNOpenLibrary(isbn) {
  const url  = 'https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&format=json&jscmd=data';
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) return { error: 'OpenLibrary no disponible' };
  const data = JSON.parse(resp.getContentText());
  const key  = 'ISBN:' + isbn;
  if (!data[key]) return { error: 'ISBN no encontrado en OpenLibrary' };
  const vol = data[key];
  const autores = (vol.authors || []).map(function(a){ return a.name; }).join(', ');
  const editorial = vol.publishers ? vol.publishers[0].name : '';
  const año = vol.publish_date ? parseInt(vol.publish_date.replace(/\D/g,'').substring(0,4)) : null;
  return {
    titulo:    vol.title || '',
    subtitulo: vol.subtitle || '',
    autores:   autores,
    editorial: editorial,
    año:       año,
    isbn:      isbn,
    descripcion: vol.notes ? (typeof vol.notes === 'string' ? vol.notes.substring(0,500) : '') : '',
    paginas:   vol.number_of_pages || null,
    idioma:    '',
    imagen:    vol.cover ? (vol.cover.medium || '') : '',
    fuente:    'OpenLibrary',
  };
}


// ─────────────────────────────────────────────
// GET /verificar/drive
// Escanea todas las carpetas de materias en Drive
// y retorna lista de archivos con sus drive_id reales.
// Permite al frontend cruzar con el índice.
// ─────────────────────────────────────────────
function verificarArchivosEnDrive() {
  const resultado = {};
  const todasLasCarpetas = Object.assign({}, MATERIAS_IDS, {
    'LIBROS': CONFIG.LIBROS_FOLDER_ID,
  });

  for (const materia in todasLasCarpetas) {
    const carpetaId = todasLasCarpetas[materia];
    try {
      const archivos = [];
      const iter = DriveApp.getFolderById(carpetaId).getFiles();
      while (iter.hasNext()) {
        const f = iter.next();
        archivos.push({
          drive_id: f.getId(),
          nombre:   f.getName(),
          mime:     f.getMimeType(),
          size:     f.getSize(),
          modified: f.getLastUpdated().toISOString(),
        });
      }
      resultado[materia] = archivos;
    } catch(e) {
      resultado[materia] = { error: e.message };
    }
  }

  // Retornar también cuántos docs del índice tienen drive_id vs. no
  const index = leerIndex();
  const total  = index.documentos.filter(d => !d.estado || d.estado === 'activo').length;
  const conId  = index.documentos.filter(d => (!d.estado || d.estado === 'activo') && d.drive_id).length;

  return {
    carpetas:          resultado,
    indice_total:      total,
    indice_con_drive:  conId,
    indice_sin_drive:  total - conId,
  };
}

// ─────────────────────────────────────────────
// UTILIDAD — Respuesta JSON estándar
// ─────────────────────────────────────────────
function jsonResponse(data, code) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}


// ─────────────────────────────────────────────
// CONFIGURAR TRIGGER DE BACKUP SEMANAL
// Ejecutar esta función UNA VEZ manualmente desde GAS
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// REORGANIZACIÓN FÍSICA DE DRIVE
// Mueve cada archivo con drive_id a la carpeta correcta según su materia.
// Ejecutar desde Apps Script. Usa continuación por lotes para no agotar el tiempo.
// ─────────────────────────────────────────────
function reorganizarDrive() {
  const props   = PropertiesService.getScriptProperties();
  const index   = leerIndex();
  const docs    = index.documentos;

  // Materias que tienen carpeta en Drive (excluir General y No_Juridico)
  const materiasConCarpeta = Object.keys(MATERIAS_IDS).filter(
    m => m !== '_Por_Clasificar' && m !== 'No_Juridico'
  );

  // Leer posición de continuación (lote)
  let startIdx = parseInt(props.getProperty('reorg_start') || '0', 10);
  const BATCH  = 100; // docs por ejecución
  const endIdx = Math.min(startIdx + BATCH, docs.length);

  let moved = 0, skipped = 0, errors = 0;
  const log = [];

  for (let i = startIdx; i < endIdx; i++) {
    const doc = docs[i];
    if (!doc.drive_id || doc.drive_id === '') { skipped++; continue; }
    if (!materiasConCarpeta.includes(doc.materia)) { skipped++; continue; }

    const targetFolderId = MATERIAS_IDS[doc.materia];
    if (!targetFolderId) { skipped++; continue; }

    try {
      const file         = DriveApp.getFileById(doc.drive_id);
      const targetFolder = DriveApp.getFolderById(targetFolderId);
      const parents      = file.getParents();

      // Verificar si ya está en la carpeta correcta
      let alreadyThere = false;
      const parentList = [];
      while (parents.hasNext()) {
        const p = parents.next();
        parentList.push(p);
        if (p.getId() === targetFolderId) alreadyThere = true;
      }

      if (alreadyThere && parentList.length === 1) { skipped++; continue; }

      // Agregar a carpeta correcta
      if (!alreadyThere) targetFolder.addFile(file);

      // Quitar de otras carpetas dentro de EL_JURISTA_DB (no quitar de targetFolder)
      for (const p of parentList) {
        if (p.getId() !== targetFolderId && p.getId() !== CONFIG.JURISTA_DB_ID) {
          p.removeFile(file);
        }
      }

      moved++;
      log.push(`MOVIDO: ${doc.titulo ? doc.titulo.slice(0,50) : doc.drive_id} → ${doc.materia}`);
    } catch (e) {
      errors++;
      log.push(`ERROR [${doc.drive_id}]: ${e.message}`);
    }
  }

  // Guardar progreso
  const done = endIdx >= docs.length;
  if (done) {
    props.deleteProperty('reorg_start');
  } else {
    props.setProperty('reorg_start', String(endIdx));
  }

  const msg = [
    `Lote ${startIdx}–${endIdx} de ${docs.length}`,
    `Movidos: ${moved} | Saltados: ${skipped} | Errores: ${errors}`,
    done ? '✅ REORGANIZACIÓN COMPLETA' : `▶ Ejecuta de nuevo para continuar (desde ${endIdx})`,
    ...log.slice(0, 20)
  ].join('\n');

  Logger.log(msg);
  return msg;
}

// Reinicia el contador de reorganización (por si necesitas empezar de cero)
function resetReorganizacion() {
  PropertiesService.getScriptProperties().deleteProperty('reorg_start');
  Logger.log('Contador de reorganización reiniciado. Ejecuta reorganizarDrive() para comenzar.');
}

// Ejecutar UNA VEZ desde el editor GAS: reemplaza PASTE_TOKEN_HERE con tu token
// y ejecuta la función. Después borra el token de aquí o deja el placeholder.
function setGithubToken() {
  const token = 'PASTE_TOKEN_HERE'; // ← pegar el token antes de ejecutar
  if (!token || token === 'PASTE_TOKEN_HERE') {
    Logger.log('ERROR: reemplaza PASTE_TOKEN_HERE con el token real antes de ejecutar.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', token);
  Logger.log('GITHUB_TOKEN guardado en Script Properties.');
}

function configurarTriggerBackup() {
  // Eliminar triggers existentes de backupSemanal
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'backupSemanal') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Crear nuevo trigger: domingos 2-3am hora Venezuela (UTC-4 = 6-7am UTC)
  ScriptApp.newTrigger('backupSemanal')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(6)
    .create();
  Logger.log('Trigger de backup semanal configurado: domingos 2am Venezuela');
}


// ─────────────────────────────────────────────
// CORRECCIÓN MASIVA DE CLASIFICACIONES — v1.8.2
// Ejecutar UNA SOLA VEZ desde el editor de Apps Script
// Corrige 181 documentos mal clasificados como "sentencia"
// ─────────────────────────────────────────────
function corregirClasificacionTipos() {
  const CORRECTION_MAP = {
    "6c9d978e-113f-400e-ba7c-faad53232699": "resolucion",
    "d330970b-2526-42b1-a56e-6bafd9232fa8": "acta",
    "0627fb8d-c358-4fd1-8362-4cf60c34a96f": "acta",
    "d3863e0b-6f2f-4662-a671-85dc85ad1c3e": "acta",
    "b44ef1c3-ca41-4deb-b2ef-0c20e96f48c8": "acta",
    "f3db3a68-b69c-472c-9980-cd2edbdc315e": "acto_legislativo",
    "cfc12a33-4d4c-4dd4-8c56-ce90d82b2296": "acto_legislativo",
    "042fd387-8b96-4ec3-96b0-04cd378a87ed": "contrato",
    "30461105-e8e8-4178-b152-b043319edc06": "contrato",
    "e691623d-464e-4cdb-9ea8-f77813d97c74": "contrato",
    "adb12546-8a13-4f81-9743-305d43963cf3": "contrato",
    "242fef53-3584-469f-98e4-340b2e7b4dfa": "contrato",
    "5480f608-22fb-47d4-9a66-1975f86ee8d5": "contrato",
    "adae4de8-6453-481c-a4b3-83023cf15e91": "contrato",
    "f5c92529-e049-44a8-aed3-dfa4542614a3": "contrato",
    "0475bd68-4f8a-4f55-bde1-951d92c302bf": "contrato",
    "8a2622be-941b-4120-bca1-d4e3ffbff5d3": "contrato",
    "ad831bcd-10f5-43de-b9a9-9361d647e924": "resolucion",
    "de92eb83-5946-467d-869c-359004c9eef5": "resolucion",
    "04aa761d-5b7c-4850-866d-c388c6888420": "resolucion",
    "5b9c07a6-9651-4f2b-a7a4-6f6ca52a66a7": "resolucion",
    "133dc596-81ee-41f0-b35b-b8c546bbece3": "resolucion",
    "569b9265-d1cb-44c6-a319-2899c646d254": "resolucion",
    "b660a13e-08e8-4a9b-91a4-6b721d584980": "resolucion",
    "8434c661-3b6e-491a-996d-03d1e6070586": "legislacion",
    "9a9894a8-d0c6-4bd5-a6eb-f3c9a0d70e2f": "legislacion",
    "cf59f5b0-9ed4-4202-b5bc-8dad183f138a": "auto_procesal",
    "00a8865b-ee97-4aa6-aa16-4fa139b0b7cc": "auto_procesal",
    "e17b87fb-691a-4252-98b4-9946fa6d10a2": "auto_procesal",
    "d22e95f0-f4ee-4696-943b-a0b424b0412b": "auto_procesal",
    "3772c92d-a48d-466d-9069-61b841b73e87": "auto_procesal",
    "78333004-70a0-4bc2-bc81-d37af34c505d": "acta",
    "f558f5f1-d8ac-4b57-9c4d-9e1f481aba13": "acta",
    "79b21bf5-4305-4753-9693-a11f4b7fc7eb": "acta",
    "44d86d91-cbef-4342-9e20-549b33ab6ccb": "acta",
    "6c8f2a63-070e-4031-a533-801137dae549": "acta",
    "762b1b8a-757f-471a-a2a8-41b7baf08508": "acto_legislativo",
    "6fe5aa4d-1d90-42fa-bd50-d77c7722f086": "acto_legislativo",
    "9acebf7b-9be8-4ca2-b3bd-540643d9e6b4": "legislacion",
    "631a59e8-e96c-47d5-97e8-6b8026ecf72a": "legislacion",
    "91d4f35d-ff00-425e-a21a-a1cb0b05dec8": "legislacion",
    "572a3b9c-0522-4cc8-965d-316d7095d188": "acta",
    "b02ad797-ef57-44a5-ad35-ecaa494ebb5a": "auto_procesal",
    "3676016d-8030-4397-8235-f76482b8e158": "auto_procesal",
    "6854decb-c23d-4c77-9ae2-d73a79e89a66": "auto_procesal",
    "5865e46b-6b7f-458b-9fa1-bfc7863237b1": "auto_procesal",
    "3eafe199-a960-4816-98e5-91b90a99e43d": "contrato",
    "2e35204a-7520-4bc3-a10d-6f96949b8bcc": "legislacion",
    "51f7a55e-af87-4cdb-9fee-925567fdd247": "legislacion",
    "ce80bb15-8ab9-4db2-9bf7-f20777c48f86": "acta",
    "7f7f19dc-39aa-4451-9491-3e204ff09e34": "acta",
    "6b010994-03d0-471c-9458-0bef4da603b1": "acta",
    "e51c791b-13da-424c-9fa1-7d68585d5762": "auto_procesal",
    "e3283c0b-71ed-4863-ad87-f1aebf6f3ebc": "auto_procesal",
    "95806bcd-a093-4ad2-9a79-c4dcb771fa0d": "auto_procesal",
    "f16fe592-d85b-449c-8d28-2b6523040dbd": "auto_procesal",
    "81f40507-8348-4a7f-abc6-1122c5c323e4": "auto_procesal",
    "aa60a348-2e84-4325-8ebf-24f1e5740743": "auto_procesal",
    "814aa8f7-ced2-4048-9559-f6ea4ee465a0": "auto_procesal",
    "3f1d994c-559d-4bb5-9410-1d4ee049ccb8": "auto_procesal",
    "cf9c9c34-09a6-4382-bb32-d2b35648aa23": "auto_procesal",
    "ae00e436-d79d-4248-95cc-05b3c516a5df": "auto_procesal",
    "958f10fe-f4ab-4c2f-ae8d-4654f86ef955": "legislacion",
    "ce981c0d-b8fc-4842-bc9f-1603c830e730": "legislacion",
    "ac289245-b77a-4510-b742-83ace3291b32": "legislacion",
    "176b8e69-1a16-4d3d-a6ed-eb76c991b96f": "legislacion",
    "05718c2c-e21d-4128-af95-ade4c19d6569": "legislacion",
    "b73b2c1c-251c-450b-8188-e9223ce8e924": "legislacion",
    "080148f0-b297-4d37-96f6-5791004d8e3f": "legislacion",
    "e66764e8-5782-426e-be40-6a462490981f": "legislacion",
    "dc181cc5-bd3a-443a-a3bf-6959f32186ad": "legislacion",
    "3b965709-09a4-48ac-93f6-df9d7a2fc547": "legislacion",
    "f933b61e-2970-40da-b41f-dc3b58ac41f8": "legislacion",
    "583a08c4-4340-46b6-b93e-ee65ae41b2cc": "legislacion",
    "6c8da0b5-4061-488f-8f09-de46e972cad4": "legislacion",
    "c27a11d4-f34e-48cf-bf26-b817ec247805": "legislacion",
    "fbffdb3e-5c0f-421f-8806-3733bfa00fda": "legislacion",
    "1f64f5b5-0734-487d-a125-5736e53ff8e6": "legislacion",
    "4fe98850-2b75-46f8-a8aa-544b6b49301d": "legislacion",
    "bfc34c02-476d-46f1-99a4-f64f62d9bc38": "legislacion",
    "7e50ed1c-749f-4216-9059-8a06a052616d": "legislacion",
    "b50e9384-27a8-45d0-a51d-cc63c9b6eb4e": "legislacion",
    "c1a672cc-634a-4da0-905e-627b1731982e": "legislacion",
    "ee789156-e435-435f-9359-805e090589de": "legislacion",
    "d685fde6-26f8-43d4-988f-4c082a0e3303": "legislacion",
    "ddad857b-a50e-440d-a4d0-11a2d5e3fa96": "legislacion",
    "fd0c568f-31b6-4ea0-b539-4fe6062e1aa4": "legislacion",
    "cd3311dd-850c-498b-80a4-0c63faeade37": "legislacion",
    "149c4421-f59c-4be1-9cdb-d559f1fd6acf": "legislacion",
    "f9aa16f0-29f6-4f88-bb2e-7d316047a680": "legislacion",
    "a0478fea-f095-4b49-9f48-11697db6cd78": "legislacion",
    "babe5711-602b-441d-bb2e-d022b6b18397": "legislacion",
    "9e6096d2-3dc6-4601-8fd7-a5cccd4fe22f": "legislacion",
    "583dbb68-92c4-4edf-8265-59cf4a46315e": "legislacion",
    "3617e76c-512a-4ce6-ab6f-22b2e354a423": "legislacion",
    "213facca-19f2-43da-bcfc-26a1a060b813": "legislacion",
    "06d8d112-c004-465e-99c8-076e20be2f98": "legislacion",
    "a32d3143-3890-4f41-8194-7449a0999a22": "legislacion",
    "c79c7f7c-1f3b-4dda-ad95-9e8b749179ff": "legislacion",
    "3f970bf7-9ce9-45b6-980d-4b2479a0b871": "legislacion",
    "da2634bf-76cb-49a3-ab5a-c0a61bc4f11b": "legislacion",
    "d2b16419-16c8-41e4-8e13-241a7e0c7a69": "legislacion",
    "3916a2bb-6e0b-436a-b9e7-2af5a45b0352": "legislacion",
    "5d0e7a2f-0a0c-4edf-9652-3bb090a7dab6": "legislacion",
    "298cc95c-8f8b-41c5-9aa5-a12de7ebc528": "legislacion",
    "fbb1c158-655e-4104-a0a8-b7cbbe1d373f": "legislacion",
    "eee2bcd4-a04e-45b6-92d3-ca43806de1c0": "legislacion",
    "b4866a0e-f227-4b81-8136-968dbfe0a851": "legislacion",
    "5eed151e-38e5-4cbc-8df1-b135e7fc2bc7": "legislacion",
    "a4e5a92a-3c3c-44bc-91ac-f49a243ea5ce": "legislacion",
    "67158352-ea58-446e-9f78-f219e296c4de": "legislacion",
    "6e3af569-38c0-49d7-8024-04a3884d898b": "legislacion",
    "06febabb-2710-44fc-87af-066ec03133e8": "legislacion",
    "1fbfd6a6-41eb-4e08-854b-cda8b8f2a6fc": "legislacion",
    "1e6d3f69-d735-43dc-b075-b68e4c8d78e6": "legislacion",
    "a3c61b4d-c8d1-4d23-a11e-4118236892e9": "legislacion",
    "d4d09223-4436-482a-b669-b4652846e9db": "legislacion",
    "3f325a9c-a6bd-4f2e-a2d6-a5270b57359f": "legislacion",
    "6844e786-fb74-49a7-842f-9e60f2bff39d": "legislacion",
    "918ab162-d9dc-48c9-9796-c031851a4658": "legislacion",
    "b27cee79-d6b9-4c1a-93e9-c6abe185ec0c": "legislacion",
    "144a3e8b-b58c-4d92-b3b0-50b5afeceab2": "legislacion",
    "7e3672d0-94e9-42d6-be47-edbc7918573e": "legislacion",
    "9a5f3202-aa22-4b10-84e5-15e523cfc71b": "legislacion",
    "57746c1c-6c6c-4aba-8d75-6174ab57d698": "legislacion",
    "a6f5f81c-9b42-476f-9ae6-073abf67decf": "legislacion",
    "a22104c1-9095-4753-93e6-73a3b56223c9": "legislacion",
    "c27f305d-536b-4b77-ba2d-4695154b363e": "legislacion",
    "6d10f720-3b9b-426e-bfa6-6f0828c8c2f9": "legislacion",
    "d5005c85-9c10-41d0-b1a9-52064e131be1": "legislacion",
    "ebb657ed-6abf-4f30-962a-36e6a88eda6e": "legislacion",
    "d51e264e-8e94-4a99-b486-5dc81a374790": "legislacion",
    "94ba9470-0107-4837-b75f-06520aa2890a": "legislacion",
    "5c94afe1-d398-4a00-b76f-e477625717a1": "legislacion",
    "2a3070d8-5862-4b79-a64b-d9cf4ea8fa0d": "legislacion",
    "ccd1433b-b1d4-4631-b917-afd7ae04fdb5": "legislacion",
    "a9481054-83ab-4070-ae47-ff3bd8354d7e": "legislacion",
    "541cb6ef-bc1c-4f7f-a866-46c2232be7fe": "legislacion",
    "4ad93bde-197c-4cdf-a3e5-e4f28de7544e": "legislacion",
    "42fc7556-3792-4c09-9100-3b085b94dd4b": "legislacion",
    "66a56b92-7d18-41b7-bfce-0701ead966ca": "legislacion",
    "e15c14b0-e61e-4973-bd42-df79774e3e46": "legislacion",
    "a6a8a91f-82bc-40ea-8aca-ff5a35527aea": "legislacion",
    "3d0cbccb-7b3e-4a05-bfc3-96d53e20629e": "legislacion",
    "f2e3a29d-fc5e-47c3-a1c5-f9b2ec3480ed": "legislacion",
    "4024aaaf-ae2d-4271-adc2-41b581fac70c": "legislacion",
    "0d17b15e-50da-46c3-be86-5304423561db": "legislacion",
    "745d0826-9ccf-44d1-8b0d-61563795dda5": "legislacion",
    "efe2cff2-a3db-49b0-b5c5-477fdd27a2f1": "legislacion",
    "c74c93a1-7ddc-4609-9411-03e7e4323f13": "legislacion",
    "c7420075-b451-4600-bf11-4352f0c8b3fb": "legislacion",
    "2cefa477-fa60-4147-ad0a-4c289ad50201": "legislacion",
    "55a5b8ef-4e0a-493e-9648-5953c30eaa8c": "legislacion",
    "f36541ed-6632-4de4-9515-6220eab30779": "legislacion",
    "41c89f18-e549-4665-b09c-4dad5bb8d703": "legislacion",
    "dbe70f52-260a-4ae3-b1b9-fc4f452e0e47": "legislacion",
    "83f02c68-8299-4c6a-b656-9c9e2b684578": "legislacion",
    "94cb9d61-2350-4591-90c3-0fc7a09e3596": "legislacion",
    "30e27245-f488-48dc-b457-5360acf11618": "legislacion",
    "83d35dde-aaf0-42b4-884d-4e85a7d70398": "legislacion",
    "3f2392a1-2c5a-4ee6-b6ad-55b17a793a8f": "legislacion",
    "8b2a4c9d-4650-401f-a523-78a5a67167bb": "legislacion",
    "60e85805-357f-44bc-a5aa-7d17f66a01cc": "legislacion",
    "7abe8416-21c5-41fd-853d-92421050de8c": "legislacion",
    "ce174277-500e-4457-bdb1-8ea5399adf23": "legislacion",
    "d40c6cb3-72b7-4c0d-b356-28d755652e01": "legislacion",
    "eab035bc-228e-496b-a7b6-b74f661220b8": "legislacion",
    "437bb24b-086d-4788-8ff5-0fadb9e05e86": "legislacion",
    "dc9c4580-02df-4f59-9314-223ae94c4e0f": "legislacion",
    "75c11c4e-9829-42b6-a697-b2cd70f6843d": "legislacion",
    "e8d256bf-d26d-4d9d-a1bd-791c422f25f5": "legislacion",
    "9d7c5705-89d2-41e4-a48b-f28a7c5b09ed": "legislacion",
    "9475cc22-8b49-4f87-878e-e163b0193756": "legislacion",
    "27721403-c4df-4e80-a5a3-f68d49a958b7": "legislacion",
    "5de4f2f5-870d-4603-ba6d-2749bd044e69": "resolucion",
    "5719fadf-61b5-4a0f-9704-79191616b32a": "resolucion",
    "0690092b-1800-4b67-bf6d-848188a51138": "resolucion",
    "024cb19c-d017-4b1e-b441-690ef1ea9914": "resolucion",
    "e1b13381-1bf9-4ba3-bd9e-7148b277287a": "resolucion",
    "86162fe8-c5f2-46bb-9163-11fd5f17bb67": "resolucion",
    "d4501e5c-1ee4-4f3e-b070-2ca85094ebc3": "legislacion",
  };

  Logger.log("Iniciando corrección de 181 clasificaciones...");
  
  // Leer índice de Drive
  const indexFile = DriveApp.getFileById(CONFIG.INDEX_FILE_NAME === "jurista_index.json" ?
    DriveApp.getFolderById(CONFIG.JURISTA_DB_ID).getFilesByName(CONFIG.INDEX_FILE_NAME).next().getId() :
    "1P4MAvfb0_YKlNsxwOeK_oza-gMxH4zIq");
  // Forma directa por ID conocido
  const idxFile = DriveApp.getFileById("1P4MAvfb0_YKlNsxwOeK_oza-gMxH4zIq");
  const content = idxFile.getBlob().getDataAsString("UTF-8");
  const data = JSON.parse(content);

  let correcciones = 0;
  for (const doc of data.documentos) {
    if (CORRECTION_MAP[doc.id] !== undefined) {
      doc.tipo = CORRECTION_MAP[doc.id];
      correcciones++;
    }
  }

  // Guardar en Drive
  idxFile.setContent(JSON.stringify(data));
  Logger.log("Correcciones en Drive: " + correcciones);

  // Replicar índice completo a GitHub (preservando drive_id y todos los campos necesarios)
  replicarIndexAGitHub(data);

  Logger.log("✅ Índice Drive + GitHub corregidos: " + correcciones + " documentos");
  return "Correcciones completadas: " + correcciones;
}

// ─────────────────────────────────────────────
// ELIMINAR ACUERDOS AN — Ejecutar UNA sola vez
// ─────────────────────────────────────────────
// Mueve a la papelera de Drive los 67 archivos físicos correspondientes
// a los 364 Acuerdos conmemorativos/designaciones AN eliminados del índice.
// El índice ya fue actualizado desde Claude (4,408 → 4,044 docs).
// Esta función solo limpia los archivos físicos en Drive + replica a GitHub.
function eliminarAcuerdosAN() {
  const DRIVE_IDS_ELIMINAR = [
    "1XYYfxym6Z4CqyIc8JcxRcDkXRS9M036j",
    "1z7cYffTDonwKHFy8M5oHzKoZ2Y-3sH8G",
    "1j4cwKgOa6V4yxFt9VQbw7apwK7Imo4-C",
    "1wi6LhuHNBv4OcExv6neESoSBi1ykvkF_",
    "1FRsxTeqLVlolamNXl1pRY1ESQdnT5eaQ",
    "1q3edvEyDcZjArtAh_bPi31PtAdAjgRRH",
    "1_2siEgxWA7aelO7dvVR8evrI_5hQB8-E",
    "1lx4UI6yJdaCG8dXhW1J_ZdffpPIh6qAT",
    "1I9PN3lbldDM_MkfzhenclbwAl-xXOzpt",
    "1gunEA2WHJ33D-ogNQnpGv7Wl9AUGJU9x",
    "1t73E1hu_i5QzqT6gN1jISw7ytN7bnB8k",
    "1Lr74vY6aqF-RYScTYEV7aEq4cPI7Pxei",
    "1QhgBh197gDQdojLV2vlJUyPDbw5W42PW",
    "1kQWqbFN4wBxQs29Mzj2ySKFVt9b1mK0s",
    "1WBXvnF1XpQlTgF8SGdMHxHWZKfaLos9v",
    "1Fw_FZBABAJ_JzDikBo9cxd-jHo7afSlP",
    "1XrxmGZzUKKadN5Pcj23zW0dcIxoxMoOZ",
    "1d6I8Zh5DJWSzJhpD8WVqr-_inYeQANE9",
    "1YEdGQ3F07tsBRBuwHlJYtaT-xHjZJnZ3",
    "1uE9W1wK7CS2XSAJT6-vLwEFpLkSvBzHX",
    "1JfSWc9beZf13MFF0vfRl3HcQRm-F_eod",
    "1B0VXfZOlMAhYvSL0oy8N_OI2OTiGx-H6",
    "1dX6dCIk9ed-DNQ4v3_eBr6G0l7HJc55L",
    "12DxM1OZBMK16GtgfCyFBarwa0ULy2NAG",
    "1R6diDEkV8fyH-ey-dJU196tdPbLKRIRv",
    "1DnLoO82XNfj6-CGFLSLx8kqyhvgC0kYO",
    "1VA_yn75XQeK25OQebguwl9_hlYCftexr",
    "1s-T4cthJ1wmStzpFYxkeqQ46rHyY47gc",
    "1lEBOlt5YL-6P8CvsdRvUX80HBx9XsNgo",
    "10vloseC3XrY2yfIJhstMIUDR7oCYoZcO",
    "1DU7v2aKcLCfFPQwt4_KNAPJ77rldPYvJ",
    "1ujeEPQT0bWiONgJYMhuGwntSaWq2ZToZ",
    "1EdKxGVXBAU1fdaxDdmuqXeYkty8Nw3Pe",
    "1EVC595pxrOtBF2P62TjApvqmn4RGE7KE",
    "1aRF9I0GTBAhiev7_gvXlAzHcp0J628zd",
    "1VdLMOsfbGQgblb76erua37FzMvnvVz-J",
    "1KRhKmQfDQBoPa_XhvVPFyDUVEqcjyssO",
    "16czxL7IgGwW07ESbQHWBjnKbnhAQyWrd",
    "1JKHYDvHWwCjpnsE4I77sQqktDT1dMlMd",
    "1hm05Z3jsGwpzp_KQpWDmhvfFOyJ8NlTV",
    "1GVKoY07On94SGwp7jMNHJWdttdokzHmH",
    "1w5ISl_dIOYjUAOqSwS_AKqy1tl9fOfnx",
    "163KmUMiHyqK06wNoEVqIGmKQYi7R-ffy",
    "18SH-Jag5dsdwswRVA1Cwd9lHP_yktY4l",
    "1hBdpQsen9Q2KWALGWu8MB9SSaekVNj_w",
    "18uepTE_1R7q1yVUSaaFmuSWOvcweChSI",
    "14QKQOH9-DZZypkHKzEyIxkxHZgadkOqp",
    "1YHA8vENr8znrr7LPDUsr4Mo3d3Xe9B3_",
    "1nd94BRZSNnKF0TAcmtFRRGll8qyxCSwF",
    "1YM5XGG3iAjiB8M0ogIqNhQVWy8OhcHF5",
    "1pL-bHRfdrqoHOLCf_BmZ5T0eNV1rjsU0",
    "1JpotTOvnV3z97xFayEK4325YF7hxqu5a",
    "1_gBd2tAFFS8qr5dpkQIuCHQnTVizXtvJ",
    "19akFr15Sn9Xv_3qNb4quCT3su5rAltpi",
    "1p3OPuS4EFQ4jXVwlD7NjGEj_tP_2uVMR",
    "1x5uzEIUDOJn3QLRlsol9hkmByPSb87Kf",
    "1hooFkW86gwvQQk8zuQPDqKd75xU6Dmfz",
    "13qW35a-BXArv83ipdeNqbDlELw-dPVxu",
    "1oHkP6X6sLEuoboZSauY4GCwJky59kyTt",
    "1MM6jdxmfE4CqIoTRGRRvpVEmBadvVodF",
    "1-1SsYn7q0SXL1yjQz_7_UIaX2VYppO9j",
    "1peIsgO8HCJHn-e4KnMXH2dxGTDRaE_sQ",
    "1w1U3EJOQj3KM3ErM8kbo4V6WkR_8Jd2S",
    "1CApWM0O3Xx6nNcrNna1nizIqPWkLW6Uy",
    "1hmJ_ZvyRskXhAE56tXUN3F0eBrU1KKhS",
    "11YraRtRa40-F3A_PMJ8lCgIsLJi3nOiB",
    "1C9du3fNqig1Z8k66OQHPEDXTwVXzxjOd",
  ];

  let borrados = 0;
  let errores = 0;
  const log = [];

  for (const driveId of DRIVE_IDS_ELIMINAR) {
    try {
      const file = DriveApp.getFileById(driveId);
      file.setTrashed(true);
      borrados++;
      log.push("✓ " + file.getName());
    } catch(e) {
      errores++;
      log.push("✗ " + driveId + ": " + e.message);
    }
  }

  // Sincronizar índice actualizado a GitHub
  // (el índice ya fue actualizado por Python/Claude — 4,408 → 4,044 docs)
  try {
    const folder = DriveApp.getFolderById(CONFIG.JURISTA_DB_ID);
    const files = folder.getFilesByName(CONFIG.INDEX_FILE_NAME);
    if (files.hasNext()) {
      const idxFile = files.next();
      const data = JSON.parse(idxFile.getBlob().getDataAsString("UTF-8"));
      replicarIndexAGitHub(data);
      Logger.log("✅ Índice replicado a GitHub: " + data.total_documentos + " docs");
    }
  } catch(e) {
    Logger.log("⚠️ Error replicando a GitHub: " + e.message);
  }

  Logger.log("Archivos borrados de Drive: " + borrados);
  Logger.log("Errores: " + errores);
  Logger.log(log.join("\n"));
  return "Borrados: " + borrados + " | Errores: " + errores;
}
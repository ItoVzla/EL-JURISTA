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
  GITHUB_TOKEN:     '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',
  GITHUB_REPO:      'ItoVzla/EL-JURISTA',
  GITHUB_BRANCH:    'main',
  GITHUB_INDEX_PATH:'data/jurista_index.json',
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
  '_Por_Clasificar':   '1jTMDVUtybfFhhkKsnrAfDam1TyYKLeC9',
};


// ─────────────────────────────────────────────
// ROUTER PRINCIPAL
// ─────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter;
  const path   = params.path || '';

  try {
    if (path === 'indice/resumen')  return jsonResponse(getIndiceResumen());
    if (path === 'indice/buscar')   return jsonResponse(buscarEnIndice(params));
    if (path === 'documento')       return jsonResponse(getDocumento(params.id));
    if (path === 'listar')          return jsonResponse(listarArchivos(params));
    if (path === 'descargar')       return jsonResponse(getUrlDescarga(params.id));
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

    if (path === 'subir')      return jsonResponse(subirDocumento(body));
    if (path === 'clasificar') return jsonResponse(clasificarDocumento(body));
    if (path === 'eliminar')   return jsonResponse(eliminarDocumento(body));
    if (path === 'scrape')     return jsonResponse(scrapeUrl(body));
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
    .filter(d => d.estado === 'activo')
    .map(d => ({
      id:          d.id,
      drive_id:    d.drive_id,
      titulo:      d.titulo,
      materia:     d.materia,
      sub_materia: d.sub_materia,
      tipo:        d.tipo,
      autor:       d.autor,
      año:         d.año,
      tags:        d.tags,
      vigencia:    d.vigencia,
      cita_formal: d.cita_formal,
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
  let docs = index.documentos.filter(d => d.estado === 'activo');

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
  }));
}


// ─────────────────────────────────────────────
// GET /documento?id=DRIVE_ID
// Extrae y retorna el texto completo del PDF
// ─────────────────────────────────────────────
function getDocumento(driveId) {
  if (!driveId) throw new Error('Parámetro id requerido');

  const file = DriveApp.getFileById(driveId);
  const mimeType = file.getMimeType();
  let texto = '';

  if (mimeType === 'application/pdf') {
    // Convertir PDF a Google Doc temporalmente para extraer texto
    const resource = { title: '_tmp_extract_' + driveId, mimeType: 'application/vnd.google-apps.document' };
    const blob = file.getBlob();
    const tmpDoc = Drive.Files.insert(resource, blob, { convert: true });
    const doc = DocumentApp.openById(tmpDoc.id);
    texto = doc.getBody().getText();
    // Limpiar el temporal
    DriveApp.getFileById(tmpDoc.id).setTrashed(true);
  } else if (mimeType === 'application/vnd.google-apps.document') {
    texto = DocumentApp.openById(driveId).getBody().getText();
  } else {
    texto = '[Formato no soportado para extracción de texto: ' + mimeType + ']';
  }

  return {
    drive_id:   driveId,
    titulo:     file.getName(),
    texto:      texto,
    caracteres: texto.length,
  };
}


// ─────────────────────────────────────────────
// GET /listar?materia=X&tipo=Y
// Lista archivos en Drive para la Biblioteca
// ─────────────────────────────────────────────
function listarArchivos(params) {
  const index = leerIndex();
  let docs = index.documentos.filter(d => d.estado === 'activo');

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
  const blob     = Utilities.newBlob(Utilities.base64Decode(body.contenido_base64), 'application/pdf', nombreArchivo);
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
    fragmentos_clave:body.fragmentos_clave || extraerFragmentos(body.texto_extraido || ''),
    cita_formal:     generarCita(body),
    nombre_archivo:  nombreArchivo,
    fecha_ingesta:   Utilities.formatDate(new Date(), 'America/Caracas', 'yyyy-MM-dd'),
    estado:          'activo',
  };

  // Actualizar jurista_index.json
  const index = leerIndex();
  index.documentos.push(registro);
  index.total_documentos = index.documentos.filter(d => d.estado === 'activo').length;
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

  const index = leerIndex();
  const doc = index.documentos.find(d => d.id === body.id);
  if (!doc) throw new Error('Documento no encontrado: ' + body.id);

  doc.estado = 'eliminado';
  index.total_documentos = index.documentos.filter(d => d.estado === 'activo').length;
  index.ultima_actualizacion = new Date().toISOString();
  guardarIndex(index);
  replicarIndexAGitHub(index);
  registrarDBChangelog('ELIMINADO', doc.nombre_archivo, doc.materia);

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

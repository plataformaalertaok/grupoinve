/**
 * GRUPO BRIONES (CLON) — Backend (Google Apps Script + Google Sheets + GitHub API)
 * ------------------------------------------------------------------------------
 * Cómo usar:
 * 1) Creá un Google Sheet nuevo y anotá su URL.
 * 2) Abrí Extensiones > Apps Script en ese Sheet y pegá TODO este archivo.
 * 3) Configurá las Script Properties (Configuración del proyecto > Propiedades
 *    del script > Agregar propiedad de script):
 *      GITHUB_TOKEN   -> Personal Access Token (fine-grained, permiso de
 *                         escritura SOLO sobre "Contents" del repo del sitio)
 *      GITHUB_OWNER   -> tu usuario u organización de GitHub
 *      GITHUB_REPO    -> nombre del repositorio (el que sirve GitHub Pages)
 *      GITHUB_BRANCH  -> normalmente "main"
 * 4) Ejecutá una vez la función "_setup" (menú Ejecutar > _setup) para que
 *    cree automáticamente todas las hojas y encabezados necesarios.
 * 5) Ejecutá una vez la función "crearUsuarioInicial" para dar de alta el
 *    primer usuario administrador (editá USUARIO_INICIAL / PASSWORD_INICIAL
 *    más abajo antes de correrla, y volvé a poner PASSWORD_INICIAL en
 *    blanco después de usarla).
 * 6) Desplegá: Implementar > Nueva implementación > Aplicación web.
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier usuario
 *    Copiá la URL que termina en /exec: esa es tu API_URL para index.html
 *    y admin.html.
 *
 * Hojas que se auto-crean con _setup():
 *   Usuarios      -> Usuario | PasswordHash | Salt | Token | TokenExpira
 *   Contactos     -> Direccion | Telefono | Email | Instagram | TikTok | YouTube | LinkedIn | Facebook
 *   Estadisticas  -> ID | Label | Valor | Orden
 *   Imagenes      -> ID | NombreOriginal | NombreArchivo | RutaRepo | URLPublica | SHA | MimeType | TamanioKB | FechaSubida | SubidoPor
 *   Proyectos     -> ID | Orden | Nombre | Slug | Barrio | Estado | Direccion | DescripcionCorta | DescripcionLarga | ImagenURL | GaleriaURLs | PDFPlanosUrl | Lat | Lng | Ambientes | Activo
 *   Amenities     -> ID | ProyectoID | Nombre | IconoURL | Orden
 *   Blog          -> ID | Slug | Categoria | Fecha | Titulo | Resumen | ContenidoHTML | ImagenURL | Activo
 *   Eventos       -> ID | Orden | Titulo | Descripcion | ImagenURL
 *   Prensa        -> ID | Medio | Titulo | URL | ImagenURL | Fecha
 *   FAQs          -> ID | Orden | Categoria | Pregunta | Respuesta
 *   Equipo        -> ID | Orden | Nombre | Cargo | Bio | FotoURL
 *   Leads         -> Timestamp | Nombre | Email | Telefono | Ambiente | Zona | ProyectoID | Mensaje | Origen
 * ------------------------------------------------------------------------------
 */

// ==== CONFIGURACIÓN INICIAL (solo para crear el primer admin) ====
const USUARIO_INICIAL = 'administrador';
const PASSWORD_INICIAL = ''; // completar temporalmente, correr crearUsuarioInicial(), y volver a vaciar

const TOKEN_DURATION_MS = 2 * 60 * 60 * 1000; // duración de la sesión de admin: 2 horas

const SHEET_USUARIOS = 'Usuarios';
const SHEET_CONTACTOS = 'Contactos';
const SHEET_ESTADISTICAS = 'Estadisticas';
const SHEET_IMAGENES = 'Imagenes';
const SHEET_PROYECTOS = 'Proyectos';
const SHEET_AMENITIES = 'Amenities';
const SHEET_BLOG = 'Blog';
const SHEET_EVENTOS = 'Eventos';
const SHEET_PRENSA = 'Prensa';
const SHEET_FAQS = 'FAQs';
const SHEET_EQUIPO = 'Equipo';
const SHEET_LEADS = 'Leads';

// ================== SETUP / BOOTSTRAP ==================

/**
 * Ejecutar UNA sola vez a mano desde el editor de Apps Script.
 * Crea las hojas y encabezados si no existen todavía.
 */
function _setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheetWithHeaders(ss, SHEET_USUARIOS, ['Usuario', 'PasswordHash', 'Salt', 'Token', 'TokenExpira']);
  ensureSheetWithHeaders(ss, SHEET_CONTACTOS, ['Direccion', 'Telefono', 'Email', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook']);
  ensureSheetWithHeaders(ss, SHEET_ESTADISTICAS, ['ID', 'Label', 'Valor', 'Orden']);
  ensureSheetWithHeaders(ss, SHEET_IMAGENES, ['ID', 'NombreOriginal', 'NombreArchivo', 'RutaRepo', 'URLPublica', 'SHA', 'MimeType', 'TamanioKB', 'FechaSubida', 'SubidoPor']);
  ensureSheetWithHeaders(ss, SHEET_PROYECTOS, ['ID', 'Orden', 'Nombre', 'Slug', 'Barrio', 'Estado', 'Direccion', 'DescripcionCorta', 'DescripcionLarga', 'ImagenURL', 'GaleriaURLs', 'PDFPlanosUrl', 'Lat', 'Lng', 'Ambientes', 'Activo']);
  ensureSheetWithHeaders(ss, SHEET_AMENITIES, ['ID', 'ProyectoID', 'Nombre', 'IconoURL', 'Orden']);
  ensureSheetWithHeaders(ss, SHEET_BLOG, ['ID', 'Slug', 'Categoria', 'Fecha', 'Titulo', 'Resumen', 'ContenidoHTML', 'ImagenURL', 'Activo']);
  ensureSheetWithHeaders(ss, SHEET_EVENTOS, ['ID', 'Orden', 'Titulo', 'Descripcion', 'ImagenURL']);
  ensureSheetWithHeaders(ss, SHEET_PRENSA, ['ID', 'Medio', 'Titulo', 'URL', 'ImagenURL', 'Fecha']);
  ensureSheetWithHeaders(ss, SHEET_FAQS, ['ID', 'Orden', 'Categoria', 'Pregunta', 'Respuesta']);
  ensureSheetWithHeaders(ss, SHEET_EQUIPO, ['ID', 'Orden', 'Nombre', 'Cargo', 'Bio', 'FotoURL']);
  ensureSheetWithHeaders(ss, SHEET_LEADS, ['Timestamp', 'Nombre', 'Email', 'Telefono', 'Ambiente', 'Zona', 'ProyectoID', 'Mensaje', 'Origen']);

  // Contactos inicial, para que la sección pública no aparezca vacía.
  const contactos = ss.getSheetByName(SHEET_CONTACTOS);
  if (contactos.getLastRow() < 2) {
    contactos.appendRow([
      'Cerrito 1186, CABA',
      '+54 9 11 2468-2070',
      'contacto@grupobriones.com.ar',
      'https://www.instagram.com/grupobriones/',
      'https://www.tiktok.com/@grupobriones',
      'https://www.youtube.com/@beltranbriones',
      'https://www.linkedin.com/company/grupobriones/',
      'https://www.facebook.com/profile.php?id=61582398871835'
    ]);
  }

  // Estadísticas iniciales del hero (contadores animados).
  const estadisticas = ss.getSheetByName(SHEET_ESTADISTICAS);
  if (estadisticas.getLastRow() < 2) {
    estadisticas.appendRow([Utilities.getUuid(), 'Edificios entregados por los socios', 12, 1]);
    estadisticas.appendRow([Utilities.getUuid(), 'Departamentos entregados', 350, 2]);
    estadisticas.appendRow([Utilities.getUuid(), 'M² construidos', 45000, 3]);
  }

  Logger.log('Setup completo. Hojas creadas/verificadas.');
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Ejecutar a mano UNA sola vez para crear el primer usuario admin.
 * Completá USUARIO_INICIAL / PASSWORD_INICIAL arriba antes de correrla.
 */
function crearUsuarioInicial() {
  if (!PASSWORD_INICIAL) {
    throw new Error('Completá PASSWORD_INICIAL antes de ejecutar esta función.');
  }
  const sheet = getSheet(SHEET_USUARIOS);
  const salt = Utilities.getUuid();
  const hash = hashPassword(PASSWORD_INICIAL, salt);
  sheet.appendRow([USUARIO_INICIAL, hash, salt, '', '']);
  Logger.log('Usuario inicial creado: ' + USUARIO_INICIAL + '. Volvé a vaciar PASSWORD_INICIAL ahora.');
}

// ================== UTILIDADES ==================

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('No existe la hoja: ' + name + '. Corré _setup() primero.');
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row, idx) => {
    const obj = { _row: idx + 2 }; // fila real en la hoja, útil para updates
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function headerIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(headerName);
}

function hashPassword(password, salt) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Verifica que el token recibido sea válido y no haya expirado.
 * Devuelve la fila del usuario si es válido, o null si no.
 */
function verifyToken(token) {
  if (!token) return null;
  const sheet = getSheet(SHEET_USUARIOS);
  const users = sheetToObjects(sheet);
  const now = new Date().getTime();
  const user = users.find(u => u.Token && u.Token === token && Number(u.TokenExpira) > now);
  return user || null;
}

function requireAuth(token) {
  const user = verifyToken(token);
  if (!user) throw new AuthError('Sesión inválida o expirada. Iniciá sesión nuevamente.');
  return user;
}

function AuthError(message) {
  this.message = message;
  this.isAuthError = true;
}
AuthError.prototype = Object.create(Error.prototype);

// ================== ENTRADA HTTP ==================

// doGet: operaciones de solo lectura, públicas (no requieren token).
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || '';
    switch (action) {
      case 'getContactos': return jsonResponse({ ok: true, data: getContactos() });
      case 'getEstadisticas': return jsonResponse({ ok: true, data: getEstadisticas() });
      case 'getProyectos': return jsonResponse({ ok: true, data: getProyectosActivos() });
      case 'getProyecto': return jsonResponse({ ok: true, data: getProyectoPorSlug(e.parameter.slug) });
      case 'getAmenities': return jsonResponse({ ok: true, data: getAmenities(e.parameter.proyectoId) });
      case 'getBlog': return jsonResponse({ ok: true, data: getBlogPublicado() });
      case 'getBlogPost': return jsonResponse({ ok: true, data: getBlogPorSlug(e.parameter.slug) });
      case 'getEventos': return jsonResponse({ ok: true, data: getAll(SHEET_EVENTOS, 'Orden') });
      case 'getPrensa': return jsonResponse({ ok: true, data: getAll(SHEET_PRENSA, 'Fecha') });
      case 'getFaqs': return jsonResponse({ ok: true, data: getAll(SHEET_FAQS, 'Orden') });
      case 'getEquipo': return jsonResponse({ ok: true, data: getAll(SHEET_EQUIPO, 'Orden') });
      default: return jsonResponse({ ok: false, error: 'Acción GET no reconocida: ' + action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

// doPost: el body llega como texto plano (para evitar el preflight CORS
// de "application/json") y se parsea acá adentro.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    switch (action) {
      // Auth
      case 'login': return jsonResponse(login(body.usuario, body.password));
      case 'changeCredentials': return jsonResponse(changeCredentials(body.token, body.nuevoUsuario, body.nuevaPassword));

      // Público (sin token)
      case 'addLead': return jsonResponse(addLead(body.lead));

      // Contactos / Estadísticas (protegido)
      case 'updateContactos': return jsonResponse(updateContactos(body.token, body.contactos));
      case 'saveEstadistica': return jsonResponse(saveGenerico(body.token, SHEET_ESTADISTICAS, body.item, ['Label', 'Valor', 'Orden']));
      case 'deleteEstadistica': return jsonResponse(deleteGenerico(body.token, SHEET_ESTADISTICAS, body.id));

      // Proyectos (protegido)
      case 'saveProyecto': return jsonResponse(saveGenerico(body.token, SHEET_PROYECTOS, body.item, ['Orden','Nombre','Slug','Barrio','Estado','Direccion','DescripcionCorta','DescripcionLarga','ImagenURL','GaleriaURLs','PDFPlanosUrl','Lat','Lng','Ambientes','Activo']));
      case 'deleteProyecto': return jsonResponse(deleteGenerico(body.token, SHEET_PROYECTOS, body.id));

      // Amenities (protegido)
      case 'saveAmenity': return jsonResponse(saveGenerico(body.token, SHEET_AMENITIES, body.item, ['ProyectoID','Nombre','IconoURL','Orden']));
      case 'deleteAmenity': return jsonResponse(deleteGenerico(body.token, SHEET_AMENITIES, body.id));

      // Blog (protegido)
      case 'saveBlog': return jsonResponse(saveGenerico(body.token, SHEET_BLOG, body.item, ['Slug','Categoria','Fecha','Titulo','Resumen','ContenidoHTML','ImagenURL','Activo']));
      case 'deleteBlog': return jsonResponse(deleteGenerico(body.token, SHEET_BLOG, body.id));

      // Eventos (protegido)
      case 'saveEvento': return jsonResponse(saveGenerico(body.token, SHEET_EVENTOS, body.item, ['Orden','Titulo','Descripcion','ImagenURL']));
      case 'deleteEvento': return jsonResponse(deleteGenerico(body.token, SHEET_EVENTOS, body.id));

      // Prensa (protegido)
      case 'savePrensa': return jsonResponse(saveGenerico(body.token, SHEET_PRENSA, body.item, ['Medio','Titulo','URL','ImagenURL','Fecha']));
      case 'deletePrensa': return jsonResponse(deleteGenerico(body.token, SHEET_PRENSA, body.id));

      // FAQs (protegido)
      case 'saveFaq': return jsonResponse(saveGenerico(body.token, SHEET_FAQS, body.item, ['Orden','Categoria','Pregunta','Respuesta']));
      case 'deleteFaq': return jsonResponse(deleteGenerico(body.token, SHEET_FAQS, body.id));

      // Equipo (protegido)
      case 'saveEquipo': return jsonResponse(saveGenerico(body.token, SHEET_EQUIPO, body.item, ['Orden','Nombre','Cargo','Bio','FotoURL']));
      case 'deleteEquipo': return jsonResponse(deleteGenerico(body.token, SHEET_EQUIPO, body.id));

      // Leads (solo lectura protegida)
      case 'getLeads': return jsonResponse(getLeads(body.token));

      // Listado genérico para el c-panel (incluye registros inactivos)
      case 'adminList': return jsonResponse(adminList(body.token, body.sheet));

      // Imágenes (protegido) — sube a GitHub vía Contents API
      case 'uploadImage': return jsonResponse(uploadImage(body.token, body.nombreOriginal, body.mimeType, body.contenidoBase64));
      case 'listImages': return jsonResponse(listImages(body.token));
      case 'deleteImage': return jsonResponse(deleteImage(body.token, body.id));

      default: return jsonResponse({ ok: false, error: 'Acción POST no reconocida: ' + action });
    }
  } catch (err) {
    if (err && err.isAuthError) return jsonResponse({ ok: false, error: err.message, authError: true });
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

// ================== LECTURA PÚBLICA ==================

function getContactos() {
  const rows = sheetToObjects(getSheet(SHEET_CONTACTOS));
  return rows[0] || {};
}

function getEstadisticas() {
  return getAll(SHEET_ESTADISTICAS, 'Orden');
}

function getAll(sheetName, sortBy) {
  const rows = sheetToObjects(getSheet(sheetName));
  if (sortBy) {
    rows.sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      if (sortBy === 'Fecha') return new Date(bv) - new Date(av); // más reciente primero
      return (Number(av) || 0) - (Number(bv) || 0);
    });
  }
  return rows;
}

function getProyectosActivos() {
  const rows = sheetToObjects(getSheet(SHEET_PROYECTOS));
  return rows
    .filter(r => String(r.Activo).toUpperCase() !== 'FALSE' && r.Activo !== false)
    .sort((a, b) => (Number(a.Orden) || 0) - (Number(b.Orden) || 0));
}

function getProyectoPorSlug(slug) {
  const rows = sheetToObjects(getSheet(SHEET_PROYECTOS));
  const proyecto = rows.find(r => r.Slug === slug);
  if (!proyecto) return null;
  proyecto.amenities = getAmenities(proyecto.ID);
  return proyecto;
}

function getAmenities(proyectoId) {
  const rows = sheetToObjects(getSheet(SHEET_AMENITIES));
  const filtered = proyectoId ? rows.filter(r => String(r.ProyectoID) === String(proyectoId)) : rows;
  return filtered.sort((a, b) => (Number(a.Orden) || 0) - (Number(b.Orden) || 0));
}

function getBlogPublicado() {
  const rows = sheetToObjects(getSheet(SHEET_BLOG));
  return rows
    .filter(r => String(r.Activo).toUpperCase() !== 'FALSE' && r.Activo !== false)
    .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
}

function getBlogPorSlug(slug) {
  const rows = sheetToObjects(getSheet(SHEET_BLOG));
  return rows.find(r => r.Slug === slug) || null;
}

// ================== AUTENTICACIÓN ==================

function login(usuario, password) {
  if (!usuario || !password) return { ok: false, error: 'Usuario y contraseña son requeridos.' };
  const sheet = getSheet(SHEET_USUARIOS);
  const users = sheetToObjects(sheet);
  const user = users.find(u => u.Usuario === usuario);
  if (!user) return { ok: false, error: 'Usuario o contraseña incorrectos.' };

  const hash = hashPassword(password, user.Salt);
  if (hash !== user.PasswordHash) return { ok: false, error: 'Usuario o contraseña incorrectos.' };

  const token = Utilities.getUuid();
  const expira = new Date().getTime() + TOKEN_DURATION_MS;
  sheet.getRange(user._row, headerIndex(sheet, 'Token') + 1).setValue(token);
  sheet.getRange(user._row, headerIndex(sheet, 'TokenExpira') + 1).setValue(expira);

  return { ok: true, token: token, usuario: user.Usuario, expira: expira };
}

function changeCredentials(token, nuevoUsuario, nuevaPassword) {
  const user = requireAuth(token);
  const sheet = getSheet(SHEET_USUARIOS);
  if (nuevoUsuario) {
    sheet.getRange(user._row, headerIndex(sheet, 'Usuario') + 1).setValue(nuevoUsuario);
  }
  if (nuevaPassword) {
    const salt = Utilities.getUuid();
    const hash = hashPassword(nuevaPassword, salt);
    sheet.getRange(user._row, headerIndex(sheet, 'PasswordHash') + 1).setValue(hash);
    sheet.getRange(user._row, headerIndex(sheet, 'Salt') + 1).setValue(salt);
  }
  return { ok: true };
}

// ================== CRUD CONTACTOS (protegido) ==================

function updateContactos(token, contactos) {
  requireAuth(token);
  const sheet = getSheet(SHEET_CONTACTOS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => contactos[h] !== undefined ? contactos[h] : '');

  if (sheet.getLastRow() < 2) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(2, 1, 1, headers.length).setValues([row]);
  }
  return { ok: true, data: getContactos() };
}

// ================== CRUD GENÉRICO (Proyectos, Amenities, Blog, Eventos, Prensa, FAQs, Equipo, Estadisticas) ==================
//
// Todas estas tablas comparten el mismo patrón: primera columna "ID" (uuid),
// alta si no viene ID, edición si viene ID. Se valida con requiredField
// según corresponda desde cada wrapper específico (saveProyecto, etc. ya
// resuelto en el switch, delegando en saveGenerico/deleteGenerico).

function saveGenerico(token, sheetName, item, camposEditables) {
  requireAuth(token);
  if (!item) return { ok: false, error: 'Faltan datos del registro.' };

  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = sheetToObjects(sheet);

  if (item.ID) {
    const existing = rows.find(r => String(r.ID) === String(item.ID));
    if (!existing) return { ok: false, error: 'No se encontró el registro a editar.' };
    const row = headers.map(h => item[h] !== undefined ? item[h] : existing[h]);
    sheet.getRange(existing._row, 1, 1, headers.length).setValues([row]);
    return { ok: true, data: getAll(sheetName) };
  }

  item.ID = Utilities.getUuid();
  if (headers.indexOf('Orden') !== -1 && item.Orden === undefined) item.Orden = rows.length + 1;
  if (headers.indexOf('Activo') !== -1 && item.Activo === undefined) item.Activo = true;
  const row = headers.map(h => item[h] !== undefined ? item[h] : '');
  sheet.appendRow(row);
  return { ok: true, data: getAll(sheetName) };
}

function deleteGenerico(token, sheetName, id) {
  requireAuth(token);
  const sheet = getSheet(sheetName);
  const rows = sheetToObjects(sheet);
  const existing = rows.find(r => String(r.ID) === String(id));
  if (!existing) return { ok: false, error: 'No se encontró el registro a borrar.' };
  sheet.deleteRow(existing._row);
  return { ok: true, data: getAll(sheetName) };
}

// ================== LEADS (público escribe, admin lee) ==================

function addLead(lead) {
  if (!lead || !lead.Nombre || !lead.Telefono) {
    return { ok: false, error: 'Nombre y teléfono son obligatorios.' };
  }
  const sheet = getSheet(SHEET_LEADS);
  sheet.appendRow([
    new Date(),
    lead.Nombre || '',
    lead.Email || '',
    lead.Telefono || '',
    lead.Ambiente || '',
    lead.Zona || '',
    lead.ProyectoID || '',
    lead.Mensaje || '',
    lead.Origen || 'web'
  ]);
  return { ok: true };
}

function getLeads(token) {
  requireAuth(token);
  const rows = sheetToObjects(getSheet(SHEET_LEADS));
  rows.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  return { ok: true, data: rows };
}

const ADMIN_LISTABLE_SHEETS = [
  SHEET_ESTADISTICAS, SHEET_PROYECTOS, SHEET_AMENITIES, SHEET_BLOG,
  SHEET_EVENTOS, SHEET_PRENSA, SHEET_FAQS, SHEET_EQUIPO, SHEET_IMAGENES
];

/** Listado sin filtrar (incluye inactivos) para el c-panel, con whitelist de hojas permitidas. */
function adminList(token, sheetName) {
  requireAuth(token);
  if (ADMIN_LISTABLE_SHEETS.indexOf(sheetName) === -1) {
    return { ok: false, error: 'Hoja no permitida: ' + sheetName };
  }
  return { ok: true, data: getAll(sheetName) };
}

// ================== GESTIÓN DE IMÁGENES (GitHub Contents API) ==================

function getGithubConfig() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  if (!token || !owner || !repo) {
    throw new Error('Faltan Script Properties: GITHUB_TOKEN, GITHUB_OWNER y/o GITHUB_REPO. Configuralas en Configuración del proyecto > Propiedades del script.');
  }
  return { token, owner, repo, branch };
}

function sanitizeFileName(name) {
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
  const base = parts.join('.')
    .toLowerCase()
    .normalize('NFD').replace(new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g'), '') // saca acentos (marcas diacriticas combinadas)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'imagen';
  return base + '.' + (ext || 'jpg');
}

/**
 * Sube una imagen (base64, sin el prefijo "data:...;base64,") al repo de
 * GitHub vía la Contents API, y registra la URL pública resultante en la
 * hoja "Imagenes".
 */
function uploadImage(token, nombreOriginal, mimeType, contenidoBase64) {
  const user = requireAuth(token);
  if (!nombreOriginal || !contenidoBase64) {
    return { ok: false, error: 'Falta el archivo o el nombre de la imagen.' };
  }

  const cfg = getGithubConfig();
  const sanitized = sanitizeFileName(nombreOriginal);
  const nombreArchivo = Date.now() + '-' + sanitized;
  const rutaRepo = 'img/' + nombreArchivo;

  const apiUrl = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + rutaRepo;
  const payload = {
    message: 'Subida de imagen desde c-panel: ' + nombreArchivo,
    content: contenidoBase64,
    branch: cfg.branch
  };

  const response = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    contentType: 'application/json',
    headers: {
      Authorization: 'token ' + cfg.token,
      Accept: 'application/vnd.github+json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const result = JSON.parse(response.getContentText());
  if (status !== 200 && status !== 201) {
    return { ok: false, error: 'Error al subir a GitHub (' + status + '): ' + (result.message || 'desconocido') };
  }

  const urlPublica = 'https://' + cfg.owner + '.github.io/' + cfg.repo + '/' + rutaRepo;
  const sha = result.content && result.content.sha ? result.content.sha : '';

  const sheet = getSheet(SHEET_IMAGENES);
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    nombreOriginal,
    nombreArchivo,
    rutaRepo,
    urlPublica,
    sha,
    mimeType || '',
    Math.round((contenidoBase64.length * 0.75) / 1024),
    new Date(),
    user.Usuario
  ]);

  return { ok: true, id: id, url: urlPublica };
}

function listImages(token) {
  requireAuth(token);
  const rows = sheetToObjects(getSheet(SHEET_IMAGENES));
  rows.sort((a, b) => new Date(b.FechaSubida) - new Date(a.FechaSubida));
  return { ok: true, data: rows };
}

function deleteImage(token, id) {
  requireAuth(token);
  const sheet = getSheet(SHEET_IMAGENES);
  const rows = sheetToObjects(sheet);
  const existing = rows.find(r => String(r.ID) === String(id));
  if (!existing) return { ok: false, error: 'No se encontró la imagen a borrar.' };

  const enUso = buscarUsoDeImagen(existing.URLPublica);
  if (enUso.length > 0) {
    return { ok: false, error: 'La imagen está en uso en: ' + enUso.join(', ') + '. Quitala de ahí antes de borrarla.' };
  }

  const cfg = getGithubConfig();
  const apiUrl = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + existing.RutaRepo;
  const response = UrlFetchApp.fetch(apiUrl, {
    method: 'delete',
    contentType: 'application/json',
    headers: {
      Authorization: 'token ' + cfg.token,
      Accept: 'application/vnd.github+json'
    },
    payload: JSON.stringify({
      message: 'Borrado de imagen desde c-panel: ' + existing.NombreArchivo,
      sha: existing.SHA,
      branch: cfg.branch
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status !== 200) {
    const result = JSON.parse(response.getContentText());
    return { ok: false, error: 'Error al borrar en GitHub (' + status + '): ' + (result.message || 'desconocido') };
  }

  sheet.deleteRow(existing._row);
  return { ok: true };
}

/** Recorre las tablas con campos de imagen y devuelve en cuáles se usa esta URL. */
function buscarUsoDeImagen(url) {
  const encontrados = [];
  const tablasConCampos = [
    [SHEET_PROYECTOS, ['ImagenURL', 'GaleriaURLs']],
    [SHEET_BLOG, ['ImagenURL']],
    [SHEET_EQUIPO, ['FotoURL']],
    [SHEET_EVENTOS, ['ImagenURL']],
    [SHEET_PRENSA, ['ImagenURL']],
    [SHEET_AMENITIES, ['IconoURL']],
  ];
  tablasConCampos.forEach(([sheetName, campos]) => {
    const rows = sheetToObjects(getSheet(sheetName));
    const usado = rows.some(r => campos.some(c => String(r[c] || '').indexOf(url) !== -1));
    if (usado) encontrados.push(sheetName);
  });
  return encontrados;
}

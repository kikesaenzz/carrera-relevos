/**
 * ============================================================
 *  CARRERA RELEVOS — Inscripciones centralizadas
 *  Google Apps Script que hace de base de datos (Google Sheets)
 *  Ver guía de instalación: INSCRIPCIONES.md
 * ============================================================
 *
 *  Cómo se usa desde la web (index.html):
 *   - POST  <URL>?accion=guardar   {nombre, email}  -> guarda fila
 *   - GET   <URL>?accion=lista&clave=XXXX            -> devuelve JSON
 *
 *  Despliego: Script Google -> pegar este código -> Implementar
 *  como "Aplicación web" (ejecutar como yo, acceso: cualquiera)
 *  y pegar la URL /exec en INSCRIPCIONES_ENDPOINT de index.html.
 */

// ---- Configuración -------------------------------------------------
const CLAVE_ADMIN = 'relevos2026';   // ← cámbiala por la tuya (la misma que pides en ?admin=1)
const NOMBRE_HOJA = 'Inscripciones';
const SHEET_ID = '';                 // opcional: ID de una hoja ya creada (si lo dejas vacío se crea sola)

// ---- Utilidades ----------------------------------------------------
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Devuelve la hoja de inscripciones. Si no existe ni la hoja ni el ID,
 * crea la hoja de cálculo una sola vez y recuerda su ID en las
 * propiedades del script.
 */
function obtenerHoja_() {
  const props = PropertiesService.getScriptProperties();
  let id = SHEET_ID || props.getProperty('SHEET_ID');
  if (!id) {
    const ss = SpreadsheetApp.create('Carrera Relevos - Inscripciones');
    id = ss.getId();
    props.setProperty('SHEET_ID', id);
    Logger.log('Hoja creada: ' + ss.getUrl());
  }
  const ss = SpreadsheetApp.openById(id);
  let hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HOJA);
    hoja.appendRow(['Fecha', 'Nombre', 'Email']);
    hoja.setFrozenRows(1);
    hoja.setFrozenColumns(0);
  }
  return { hoja: hoja, url: ss.getUrl() };
}

function emailValido_(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// ---- Guardar inscripción (POST) -----------------------------------
function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const nombre = String(d.nombre || '').trim();
    const email = String(d.email || '').trim().toLowerCase();
    if (!nombre || !emailValido_(email)) return json_({ ok: false, error: 'datos' });

    const res = obtenerHoja_();
    const datos = res.hoja.getDataRange().getValues();
    const duplicado = datos.slice(1).some(function (f) {
      return String(f[2] || '').trim().toLowerCase() === email;
    });
    if (!duplicado) res.hoja.appendRow([new Date(), nombre, email]);

    return json_({
      ok: true,
      duplicado: duplicado,
      total: Math.max(0, res.hoja.getLastRow() - 1)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---- Listar inscripciones (GET, requiere clave) ---------------------
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.accion !== 'lista') {
    return json_({ ok: true, msg: 'Endpoint de inscripciones de la Carrera de Relevos.' });
  }
  if (String(p.clave || '') !== CLAVE_ADMIN) return json_({ ok: false, error: 'clave' });

  try {
    const res = obtenerHoja_();
    const datos = res.hoja.getDataRange().getValues().slice(1);
    const lista = datos
      .filter(function (f) { return f[1] || f[2]; })
      .map(function (f) {
        return {
          fecha: f[0] instanceof Date ? f[0].toISOString() : String(f[0] || ''),
          nombre: String(f[1] || ''),
          email: String(f[2] || '')
        };
      })
      .reverse(); // más recientes primero
    return json_({ ok: true, lista: lista, hoja: res.url });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

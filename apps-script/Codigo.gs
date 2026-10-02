/**
 * ============================================================
 *  CARRERA RELEVOS — Inscripciones centralizadas
 *  Google Apps Script que hace de base de datos (Google Sheets)
 *  Ver guía de instalación: INSCRIPCIONES.md
 * ============================================================
 *
 *  Cómo se usa desde la web (index.html):
 *   - POST  <URL>?accion=guardar   {nombre, email}  -> guarda fila
 *                                                  -> {ok:true, duplicado:true} si el email ya existía
 *   - GET   <URL>?accion=comprobar&email=x@y.com     -> {ok:true, existe:true|false}
 *   - POST  <URL>?accion=vaciar    {clave:XXXX}     -> borra todas las filas
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

// Correo de confirmación enviado por el propio script (alternativa a EmailJS).
// Ándalo a true SOLO si desactivas el envío desde la web (EmailJS), para que
// no lleguen dos correos. Detalles en INSCRIPCIONES.md (sección "Va a spam").
const ENVIAR_CORREO_SERVIDOR = false;
const ASUNTO_CORREO = '¡Inscripción confirmada! · Carrera de Relevos 8K';

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

/** ¿Este email ya está inscrito? (comparación sin distinguir mayúsculas) */
function existeEmail_(hoja, email) {
  const datos = hoja.getDataRange().getValues();
  return datos.slice(1).some(function (f) {
    return String(f[2] || '').trim().toLowerCase() === email;
  });
}

/** Correo de confirmación enviado por Gmail (ver ENVIAR_CORREO_SERVIDOR). */
function enviarCorreoServidor_(email, nombre) {
  const cuerpo =
    '¡Hola, ' + nombre + '!\n\n' +
    'Tu inscripción en la Carrera de Relevos 8K está confirmada.\n\n' +
    '· Fechas: jueves 8 o viernes 9 de octubre de 2026, por la tarde\n' +
    '· Lugar: Parque Grande de Zaragoza (salida y meta)\n' +
    '· Formato: equipos de 2 personas, 3 vueltas cada uno (~9 km en total)\n\n' +
    'Los equipos se forman allí mismo antes de empezar; no hace falta venir con compañero asignado.\n\n' +
    '¡Nos vemos en la salida!\n';
  MailApp.sendEmail(email, ASUNTO_CORREO, cuerpo, { name: 'Carrera de Relevos 8K' });
}

// ---- Acciones con cuerpo JSON (POST) --------------------------------
function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const accion = String(d.accion || (e && e.parameter && e.parameter.accion) || 'guardar');

    // ---- Vaciar la lista (requiere clave) ----
    if (accion === 'vaciar') {
      if (String(d.clave || '') !== CLAVE_ADMIN) return json_({ ok: false, error: 'clave' });
      const v = obtenerHoja_();
      const last = v.hoja.getLastRow();
      if (last > 1) v.hoja.deleteRows(2, last - 1);
      return json_({ ok: true, total: 0 });
    }

    // ---- Guardar inscripción ----
    const nombre = String(d.nombre || '').trim();
    const email = String(d.email || '').trim().toLowerCase();
    if (!nombre || !emailValido_(email)) return json_({ ok: false, error: 'datos' });

    const res = obtenerHoja_();
    const duplicado = existeEmail_(res.hoja, email);
    if (!duplicado) {
      res.hoja.appendRow([new Date(), nombre, email]);
      if (ENVIAR_CORREO_SERVIDOR) {
        try { enviarCorreoServidor_(email, nombre); } catch (err) { Logger.log('Correo: ' + err); }
      }
    }

    // duplicado:true + ok:true => la web decide qué mostrar sin reencolar el envío
    return json_({
      ok: true,
      duplicado: duplicado,
      total: Math.max(0, res.hoja.getLastRow() - 1)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---- Consultas (GET) -------------------------------------------------
function doGet(e) {
  const p = (e && e.parameter) || {};

  // ¿Está este email ya inscrito? (lo usa la web al cargar y antes de inscribir)
  if (p.accion === 'comprobar') {
    const email = String(p.email || '').trim().toLowerCase();
    if (!emailValido_(email)) return json_({ ok: false, error: 'datos' });
    try {
      return json_({ ok: true, existe: existeEmail_(obtenerHoja_().hoja, email) });
    } catch (err) {
      return json_({ ok: false, error: String(err) });
    }
  }

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

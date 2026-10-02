# Inscripciones centralizadas — Google Sheets

La web guarda cada inscripción en una hoja de Google Sheets (gratis) y la puedes
ver en cualquier momento desde un panel privado. El guardado local y el correo
de confirmación (EmailJS) siguen funcionando igual que antes.

## 1. Crear el endpoint (5 minutos, una sola vez)

1. Entra en <https://script.google.com> y crea un **Proyecto en blanco**.
2. Borra el contenido de `Código.gs` y pega el de **`apps-script/Codigo.gs`** de este repo.
3. Recomendado: cambia la constante `CLAVE_ADMIN = 'relevos2026'` por tu propia clave.
4. Menú **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Mi cuenta**
   - Acceso: **Cualquier usuario**
5. **Implementar** → acepta los permisos (Google mostrará "no verificado":
   ve a *Avanzado → Ir a la aplicación (no segura)*; es tu propio script).
6. **Copia la URL** que termina en `/exec`.

## 2. Conectar la web

En `index.html` busca (junto a la clave de EmailJS):

```js
let INSCRIPCIONES_ENDPOINT = '';
```

y pega tu URL:

```js
let INSCRIPCIONES_ENDPOINT = 'https://script.google.com/macros/s/AKfyc.../exec';
```

Sube el cambio (`git push`).

## 3. Ver a los personas inscritas

- Abre la web con `?admin=1` al final:

  ```
  https://<tu-web>/index.html?admin=1
  ```

- Introduce la clave (la que pusiste en `CLAVE_ADMIN`). Verás: contador,
  tabla con fecha/nombre/email, botones **Actualizar**, **Google Sheets**
  (abre la hoja), **Copiar CSV**, **Vaciar lista** y **Cerrar** (o tecla `Esc`).
- **Vaciar lista** borra todas las filas de la hoja (pide confirmación y la
  clave). Los dispositivos inscritos dejan de verse como "ya inscrito" en su
  próxima visita, porque la web comprueba contra la hoja.
- Guarda ese enlace como favorito en el móvil → acceso en 2 toques.
- Solo se pide la clave una vez por pestaña.

La hoja de cálculo se **crea sola con la primera inscripción**; el botón
*Google Sheets* te lleva a ella. Si prefieres usar una hoja propia: créala,
copia su ID de la URL (`.../spreadsheets/d/**ID**/edit`) y pégalo en
`SHEET_ID` de `apps-script/Codigo.gs`.

## Notas

- **La hoja es la referencia**: el `localStorage` solo guarda el estado del
  dispositivo. Al enviar, el script responde `duplicado:true` si el email ya
  existía (funciona también en ventana de incógnito), y al cargar la web se
  comprueba con `?accion=comprobar` que el "ya inscrito" siga siendo cierto.
- **Varios participantes desde el mismo dispositivo**: el botón
  **Añadir a otra persona** (en la pantalla de éxito y en la de duplicado)
  vuelve al formulario sin borrar a quien ya estaba inscrito.
- **Reintentos**: si el envío falla (sin conexión, Google caído), se encola en
  `localStorage` y se reenvía solo en la próxima visita.
- **Si modificas `Codigo.gs`**: Implementar → Administrar implementaciones →
  editar → **Nueva versión** (la URL no cambia). Obligatorio tras cada cambio:
  sin la nueva versión no existen `comprobar` ni `vaciar` (la web funciona igual,
  pero no puede detectar duplicados al cargar ni vaciar la lista).
- Cuotas: Apps Script y Sheets son gratuitos y de sobra para este uso.
- No publiques tu `CLAVE_ADMIN` en la web; vive solo en el script de Google.

## Acciones del endpoint

| Método | URL | Qué hace |
|---|---|---|
| POST | `?accion=guardar` `{nombre, email}` | Guarda la fila. Devuelve `{ok:true, duplicado:true}` si el email ya estaba. |
| GET | `?accion=comprobar&email=x@y.com` | `{ok:true, existe:true\|false}`. Sin clave: solo devuelve un sí/no. |
| POST | `?accion=vaciar` `{clave}` | Borra todas las filas (requiere `CLAVE_ADMIN`). |
| GET | `?accion=lista&clave=XXXX` | Lista completa para el panel `?admin=1`. |

## El correo llega a spam

Lo más habitual es que el correo lo mande **EmailJS desde una IP compartida**,
y que ciertos proveedores (Outlook, Yahoo, corporativos) lo clasifiquen como
no deseado. Cosas que funcionan, de menor a mayor esfuerzo:

1. **En la plantilla de EmailJS**
   - Asunto corto y sin mayúsculas ni signos de exclamación excesivos
     (mejor `Inscripción confirmada · Carrera de Relevos 8K`).
   - Remitente con **nombre y dirección propios** (p. ej.
     `Carrera de Relevos 8K <inscripciones@tudominio.com>`), siempre el mismo.
   - Añade en *Reply-To* el campo `{{reply_to}}` (la web ya envía ese dato).
   - Texto con contenido real (fechas, lugar) y una línea con tus datos de
     contacto; evita solo mayúsculas, emojis y mucha imagen, poco texto.
2. **Que los destinatarios te ayuden**: la primera vez, marcar
   "No es spam" / "Añadir al remitente a contactos" en Gmail. Es lo que más
   pesa a futuro.
3. **Enviar desde tu propio Gmail**: en `apps-script/Codigo.gs` pon
   `ENVIAR_CORREO_SERVIDOR = true` y quita el envío de EmailJS de la web
   (`sendConfirmationEmail`). El correo sale de tu cuenta de Google con
   `MailApp` (buena reputación, pero límite de ~100/día y solo texto plano).
4. **Dominio propio (opcional)**: si te registras en EmailJS con un dominio
   tuyo verificado (SPF/DKIM), la entregabilidad sube bastante. Es de pago.

Comprueba siempre la carpeta de **Correo no deseado** de un par de cuentas
diferentes (Gmail y Outlook) después de cambiar algo.

## Cómo fluye

```
Visitante rellena formulario
        │
        ├─► localStorage del visitante  (estado de este dispositivo)
        ├─► EmailJS                     (correo de confirmación)
        └─► POST endpoint (Apps Script)
                 ├─► ¿el email ya existe? → {duplicado:true} → "Correo en uso"
                 └─► Google Sheets (fila nueva)
                                              ▲
Tú: index.html?admin=1 + clave ─ GET lista ───┘
        └─ botón "Vaciar lista" ─ POST vaciar ─┘
```

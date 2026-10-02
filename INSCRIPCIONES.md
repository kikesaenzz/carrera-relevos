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
  (abre la hoja), **Copiar CSV** y **Cerrar** (o tecla `Esc`).
- Guarda ese enlace como favorito en el móvil → acceso en 2 toques.
- Solo se pide la clave una vez por pestaña.

La hoja de cálculo se **crea sola con la primera inscripción**; el botón
*Google Sheets* te lleva a ella. Si prefieres usar una hoja propia: créala,
copia su ID de la URL (`.../spreadsheets/d/**ID**/edit`) y pégalo en
`SHEET_ID` de `apps-script/Codigo.gs`.

## Notas

- **Deduplica por email**: la misma dirección no se registra dos veces.
- **Reintentos**: si el envío falla (sin conexión, Google caído), se encola en
  `localStorage` y se reenvía solo en la próxima visita.
- **Si modificas `Codigo.gs`**: Implementar → Administrar implementaciones →
  editar → **Nueva versión** (la URL no cambia).
- Cuotas: Apps Script y Sheets son gratuitos y de sobra para este uso.
- No publiques tu `CLAVE_ADMIN` en la web; vive solo en el script de Google.

## Cómo fluye

```
Visitante rellena formulario
        │
        ├─► localStorage del visitante  (duplicados en su dispositivo)
        ├─► EmailJS                     (correo de confirmación)
        └─► POST endpoint (Apps Script) ─► Google Sheets (fila nueva)
                                             ▲
Tú: index.html?admin=1 + clave ─ GET lista ───┘
```

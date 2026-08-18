# Grupo Briones (clon) — Guía de puesta en marcha

Este proyecto tiene 3 partes que se configuran por separado:

1. **Backend** — Google Sheet + Apps Script (`backend/Code.gs`)
2. **Frontend público** — `index.html` (sitio para los visitantes)
3. **C-Panel** — `admin.html` (panel de administración)

Ambos archivos HTML son estáticos y no necesitan build: se abren directo
en el navegador o se publican tal cual en GitHub Pages.

---

## 1) Backend — Google Sheets + Apps Script

1. Creá una Google Sheet nueva (hojas en blanco).
2. Abrí **Extensiones > Apps Script**, borrá el contenido por defecto y
   pegá todo el contenido de [`backend/Code.gs`](backend/Code.gs).
3. En el editor de Apps Script, andá a **Configuración del proyecto ⚙️ >
   Propiedades del script > Agregar propiedad de script** y cargá:

   | Propiedad | Valor |
   |---|---|
   | `GITHUB_TOKEN` | Personal Access Token de GitHub (ver paso 3 más abajo) |
   | `GITHUB_OWNER` | tu usuario u organización de GitHub |
   | `GITHUB_REPO` | nombre del repositorio donde vas a publicar el sitio |
   | `GITHUB_BRANCH` | `main` (o la rama que uses) |

4. En el desplegable de funciones (arriba, al lado de "Depurar"), elegí
   `_setup` y hacé clic en **Ejecutar**. La primera vez te va a pedir
   autorizar permisos — aceptá. Esto crea todas las hojas necesarias.
5. Abrí el código, completá temporalmente:
   ```js
   const PASSWORD_INICIAL = 'TuContraseñaTemporal123';
   ```
   Elegí `crearUsuarioInicial` en el desplegable y ejecutala una vez.
   Esto crea tu primer usuario admin (`administrador` / la contraseña que
   pusiste). **Después volvé a dejar `PASSWORD_INICIAL = ''`** y guardá,
   para no dejar la contraseña en texto plano en el código.
6. **Implementar > Nueva implementación > Aplicación web**:
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién tiene acceso: **Cualquier usuario**
   - Copiá la URL que termina en `/exec` — esa es tu `API_URL`.

---

## 2) Personal Access Token de GitHub (para subir imágenes)

El backend necesita este token para poder escribir archivos en la
carpeta `img/` de tu repo cuando subís una imagen desde el c-panel.

1. En GitHub: **Settings > Developer settings > Personal access tokens
   > Fine-grained tokens > Generate new token**.
2. **Repository access**: elegí *Only select repositories* y marcá el
   repo donde vas a publicar el sitio (podés crearlo antes, vacío).
3. **Permissions > Repository permissions > Contents**: ponelo en
   **Read and write**. No hace falta ningún otro permiso.
4. Generá el token y pegalo en la Script Property `GITHUB_TOKEN` (paso 1.3).

⚠️ Este token nunca va en el frontend ni en el HTML — solo vive en las
Script Properties de Apps Script, que son privadas.

---

## 3) Repositorio de GitHub + GitHub Pages

1. Creá un repositorio nuevo en GitHub (público o privado con Pages
   habilitado en tu plan).
2. Subí el contenido de esta carpeta (`index.html`, `admin.html`,
   `img/`) a la raíz del repo:
   ```bash
   git init
   git remote add origin https://github.com/<owner>/<repo>.git
   git add index.html admin.html img
   git commit -m "Sitio inicial clonado de Grupo Briones"
   git branch -M main
   git push -u origin main
   ```
3. En GitHub: **Settings > Pages > Source: Deploy from a branch >
   Branch: main / (root)**.
4. Tu sitio va a quedar publicado en
   `https://<owner>.github.io/<repo>/` y las imágenes subidas desde el
   c-panel van a aparecer automáticamente en `.../img/archivo.jpg`.

---

## 4) Conectar el frontend con el backend

Editá **ambos** archivos:

- `index.html` → buscá `window.CONFIG = { API_URL: "" }` cerca del
  principio del `<body>` y pegá tu URL `/exec`.
- `admin.html` → buscá la misma constante `window.CONFIG` al principio
  del `<script>` y pegá la misma URL.

Sin esta URL configurada:
- `index.html` sigue funcionando igual, mostrando el contenido de
  referencia local (`FALLBACK_DATA`) — sirve para revisar el diseño
  antes de tener el backend listo.
- `admin.html` muestra una pantalla avisando que falta configurar el
  backend (el c-panel no puede funcionar sin la API, porque todo el
  contenido que administra vive en la Sheet).

---

## 5) Primer ingreso al c-panel

1. Abrí `admin.html` (local o ya publicado).
2. Iniciá sesión con el usuario que creaste en el paso 1.5.
3. Cargá primero **Contactos** y **Estadísticas** (son los datos que
   se ven en el hero de la home).
4. Cargá tus **Proyectos** — al elegir la imagen principal o la
   galería, si todavía no subiste ninguna imagen, primero subila desde
   el mismo selector ("Subir imagen nueva" dentro del modal de
   galería) y después seleccionala.
5. Repetí para Blog, Eventos, Prensa, FAQs y Equipo.
6. Cambiá tu usuario/contraseña inicial desde **Cuenta**.

---

## Notas técnicas

- El ruteo del sitio público es por **hash** (`#/proyectos/casa-huidobro`),
  así que no hace falta configurar un `404.html` de fallback en GitHub
  Pages — cualquier URL con `#` siempre carga `index.html` primero.
- Las imágenes se comprimen en el navegador (máx. 1920px de ancho,
  calidad ~80%) antes de subirse, para no pasar los límites de tamaño
  de Apps Script.
- Si borrás una imagen desde la galería y está siendo usada en algún
  Proyecto/Blog/Equipo/etc., el backend rechaza el borrado y te avisa
  dónde está en uso — quitala de ahí primero.
- El bug del sitio original (el botón "Consultar" apuntaba a un ancla
  `#contact` rota) está corregido acá: el botón hace scroll directo al
  formulario de leads del hero.

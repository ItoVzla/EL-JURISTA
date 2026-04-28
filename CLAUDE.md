# CLAUDE.md — EL JURISTA
## Instrucciones del sistema para Claude en este proyecto

---

## 🔢 Versión actual del sistema

**v1.3.0** — Estado: FASE 2 EN PROGRESO (2,979 docs LEXIUS cargados en índice). Infraestructura de sub-agentes lista. Pendiente alimentar carpetas Jurisprudencia/Doctrina.

---

## 📁 Archivos clave del proyecto

| Archivo | Propósito |
|---|---|
| `DET_EL_JURISTA.md` | Documento de Especificaciones Técnicas completo |
| `CHANGELOG.md` | Historial de versiones del sistema |
| `DB_CHANGELOG.md` | Historial de cambios a la base de datos |
| `CLAUDE.md` | Este archivo — instrucciones para Claude |
| `gas/Code.gs` | Código completo del GAS backend (listo para pegar en Apps Script) |
| `prompts/orquestador.md` | System prompt del Orquestador El Jurista v1.0.0 |

---

## 🔢 Regla de versionado — OBLIGATORIA

**SIEMPRE que modifiques cualquier componente del sistema** (Web App, GAS, system prompts, estructura de Drive), debes:

1. **Incrementar la versión** según:
   - PATCH (+0.0.1): correcciones visuales, ajustes menores, fix de bugs
   - MINOR (+0.1.0): nuevas funcionalidades, nuevos endpoints, nuevos agentes
   - MAJOR (+1.0.0): cambios estructurales que rompen compatibilidad

2. **Agregar entrada en `CHANGELOG.md`** con el formato:
   ```markdown
   ## vX.Y.Z — YYYY-MM-DD *(versión en pantalla: vX.Y.Z)*

   ### Añadido / Corregido / Cambiado

   - **Descripción del cambio**.
     - *Motivo*: por qué fue necesario.
     - *Detección*: cómo se descubrió (si aplica).
     - *Fix*: qué se hizo exactamente.
   ```

3. **Actualizar el badge** en la Web App HTML:
   ```html
   <div id="versionBadge">vX.Y.Z</div>
   ```

4. **Nunca sobreescribir** entradas anteriores. Siempre agregar al inicio del archivo.

---

## 🗄️ Regla de DB_CHANGELOG — OBLIGATORIA

**SIEMPRE que se añada, corrija, reclasifique o elimine un documento** de la base de datos:

1. Agregar entrada en `DB_CHANGELOG.md` con fecha, hora y tabla de cambios.
2. Este archivo NO incrementa la versión del sistema.
3. El GAS lo actualiza automáticamente. Si Claude lo hace manualmente, usar el mismo formato.

---

## 🔗 URLs del sistema

```
GAS_URL_BASE:        https://script.google.com/macros/s/AKfycbwMPuY32Y84n3kQM6mAXR6xJgBaybHAW6MYtOPsS0oyVYoCwkXZ689zvbVNN269jZBU/exec
GITHUB_REPO:         ItoVzla/EL-JURISTA  ✅ creado
GITHUB_PAGES_URL:    https://itovzla.github.io/EL-JURISTA/  ✅ publicado
DRIVE_ROOT_ID:       1bsMMHEzxsx5YbpCKaF1aATorTYquvclg  ← carpeta "EL JURISTA" en Drive
DRIVE_JURISTA_DB_ID: 1oHWWIrpHcwJGrnzj1shIgA6Ud2AaKnGR  ← EL_JURISTA_DB/ ✅ creada
```

### Protocolo de lectura multi-dispositivo (instrucción de arranque de El Jurista)

```
GET [GAS_URL_BASE]/indice/resumen
Authorization: ninguna (URL es la clave de acceso)
→ Retorna: array liviano {id, titulo, materia, tipo, año, tags, vigencia}
→ Si falla: notificar al usuario y responder desde conocimiento general
```

---

## 🏛️ Estructura de Drive — IDs confirmados

**Carpeta raíz:** `EL_JURISTA_DB/` en Google Drive (cuenta irvinleandro@gmail.com)

| Carpeta | Drive ID |
|---|---|
| `EL_JURISTA_DB/` | `1oHWWIrpHcwJGrnzj1shIgA6Ud2AaKnGR` |
| `_Por_Clasificar/` | `1jTMDVUtybfFhhkKsnrAfDam1TyYKLeC9` |
| `_BACKUPS/` | `1BVUD0NZgE5hKYNoPJxY57ZjO6YX2fqIS` |
| `Constitucional/` | `1tkJpQRWPP38ns6JPltz5x2_yJmx0AEUV` |
| `Civil/` | `1lvyZp4KLLvc_oaity6zrhfO9_peb-09D` |
| `Mercantil/` | `12lwUlXL3Ca6ICiYFC_ngVqniiLC10EAz` |
| `Laboral_Venezuela/` | `1m7gr8XwOwQp6cqq4pTLBswJ6J4zwjJ3h` |
| `Penal/` | `1qKRvwtgCaSUAOaqWpYItdyQTAiKlZ13p` |
| `Administrativo/` | `1RnILL-TDZMRyc81hx3Kk2-uU1DPWD_C0` |
| `Procesal/` | `1j4zTA1v9ssgZV5t0JXMzIrMYgHezT3tP` |
| `Electoral/` | `1ANvBDtDY-ZFNNEgVj3p4BecCpbnlhEMz` |
| `Derecho_Probatorio/` | `1g9_FajAoF2vZjdSHvzKLQ7FnqeryWjfW` |
| `Derecho_Probatorio/Medios_de_Prueba/` | `12ziGtkxabYfPBdZHgMRCOtXoFSbU27dJ` |
| `Derecho_Probatorio/Control_Contradiccion/` | `1o31i7NBfFX_jnSgssFJnqp-5SY2na8uZ` |
| `Derecho_Probatorio/Carga_Valoracion/` | `1vBiZWmP5uCRP4Q7mnH2cmT4P10VkDIyN` |
| `jurista_index.json` (archivo) | `1P4MAvfb0_YKlNsxwOeK_oza-gMxH4zIq` |
| `prompts/` | `1_Ijo49DweOn9L9FEE_8EzqMp1nbb5p87` |
| `prompts/orquestador.md` | `1HQkxkERnaNSqJH3lSA4suci5EQe92XAy` |
| `prompts/sub_agentes/` | `1JXXco-kB70bd_Rr_BnoP1-ow08k4Wrqf` |
| `Constitucional/Jurisprudencia/` | `18KNuft_WUFgOtt5rgBeHaZNkD0l6IZ4-` |
| `Constitucional/Doctrina/` | `1EZReIJQfed-VdGnWYg3d6AC9tp_b1ZNQ` |
| `Civil/Jurisprudencia/` | `1-tEHbv7JCoc1rzxq6IimkTnfXSguE9lX` |
| `Civil/Doctrina/` | `1sj31fn6lMzRq3xdesS2qTXQcFHZ3kFkn` |
| `Mercantil/Jurisprudencia/` | `1t8CiuDe-dM2JfKg7NJwSK9l9VL0yrUYP` |
| `Mercantil/Doctrina/` | `1qySSsyUUnylaUs0ZIB3JAN7T0WsfKT2R` |
| `Laboral_Venezuela/Jurisprudencia/` | `105upg1lqBfDc3Thwbb89VdDvOOML9Egr` |
| `Laboral_Venezuela/Doctrina/` | `1DW7paa0QNOOKtfhHPhb5xWlqfqBa6FvO` |
| `Penal/Jurisprudencia/` | `1c8nFYVGGlPoilPGQ7PfjkOfNnalyjieR` |
| `Penal/Doctrina/` | `1nCcILkEVSqPGC3Qja5FkTAAknyLTycup` |
| `Administrativo/Jurisprudencia/` | `1kfbSQawzUkKdou-hJg1YdubHRL11Idym` |
| `Administrativo/Doctrina/` | `1qiaF48WbDpvfVxMs8hrrvM77qn95NhgK` |
| `Procesal/Jurisprudencia/` | `1DkCg1LCCxTQunLF5JRTc0AyOGGxqADmz` |
| `Procesal/Doctrina/` | `1oHHZRGfOo87rac0mGFzWVTnurWGLab8F` |
| `Electoral/Jurisprudencia/` | `1mku-1E5xEtj0I8TFWLYu8ngFCAK1V8NW` |
| `Electoral/Doctrina/` | `1pxObIzl-A97tP82uNkwr0Oqk_ldKn-NW` |
| `Derecho_Probatorio/Jurisprudencia/` | `1Xr1BqTyIhiONPWX0oKu501iT0UZyX9eQ` |

Ver estructura completa en: `DET_EL_JURISTA.md` → Sección 3.

---

## 🤖 Protocolo de Alimentación de Sub-Agentes

Cada sub-agente tiene su base de conocimiento en dos subcarpetas de Drive (`Jurisprudencia/` y `Doctrina/`) bajo su materia. La alimentación puede hacerse de dos formas:

### Vía Claude Cowork (recomendada)

1. Arrastra el PDF, .txt o .docx a la carpeta correcta en Drive:
   - Sentencias → `[Materia]/Jurisprudencia/`
   - Libros/artículos → `[Materia]/Doctrina/`
2. Dile a Claude: *"procesa los nuevos documentos en [Materia]"*
3. Claude lee los archivos nuevos, extrae metadatos, genera resumen y los agrega al `jurista_index.json`
4. El índice se sincroniza automáticamente a GitHub (Capa 2)

### Vía Web App (futuro)

- Usar el endpoint `POST [GAS_URL_BASE]/subir` con el archivo y los metadatos
- La Web App tendrá interfaz de upload por materia

### Convención de nombres para documentos nuevos

```
[MATERIA]_[TIPO]_[AUTOR-o-TRIBUNAL]_[AÑO]_[SLUG].pdf
```
Donde `[TIPO]` puede ser:
- `SENT` — sentencia
- `DOC` — doctrina/libro
- `ART` — artículo académico
- `LEY` — legislación no cubierta por LEXIUS

### Stubs de sub-agentes (pendiente alimentar)

| Sub-Agente | Prompt | Estado |
|---|---|---|
| Laboral | `prompts/sub_agentes/laboral.md` | ⏳ vacío |
| Probatorio | `prompts/sub_agentes/probatorio.md` | ⏳ vacío |
| Constitucional | `prompts/sub_agentes/constitucional.md` | ⏳ vacío |
| Civil | `prompts/sub_agentes/civil.md` | ⏳ vacío |
| Mercantil | `prompts/sub_agentes/mercantil.md` | ⏳ vacío |
| Penal | `prompts/sub_agentes/penal.md` | ⏳ vacío |
| Administrativo | `prompts/sub_agentes/administrativo.md` | ⏳ vacío |
| Procesal | `prompts/sub_agentes/procesal.md` | ⏳ vacío |
| Electoral | `prompts/sub_agentes/electoral.md` | ⏳ vacío |

---

## 🤖 Sistema de Agentes

**Orquestador:** El Jurista  
**Instrucción de arranque:** Al iniciar, ejecutar `GET [GAS_URL_BASE]/indice/resumen` silenciosamente.  
**Regla de citación:** NUNCA afirmar artículo o sentencia no encontrado en el índice.

Ver jerarquía completa en: `DET_EL_JURISTA.md` → Sección 7.

---

## 💾 Backup

- **Capa 1:** GAS backup semanal en Drive (domingos 2am, últimos 4 backups)
- **Capa 2:** jurista_index.json replicado en GitHub en cada actualización

Ver detalles en: `DET_EL_JURISTA.md` → Sección 8.

---

## 📝 Convención de nombres de archivo

```
[MATERIA]_[TIPO]_[AUTOR]_[AÑO]_[SLUG].pdf
```

Ejemplos:
- `CONSTITUCIONAL_LEY_-_1999_crbv.pdf`
- `LABORAL_SENT_SCS_2023_vacaciones-fraccionadas.pdf`
- `PROBATORIO_DOC_BelloTabares_2009_tratado-derecho-probatorio.pdf`

Ver tabla completa en: `DET_EL_JURISTA.md` → Sección 11.

---

## 🔐 Acceso y Credenciales

- **Clave Web App:** `ElJurista#2026`
- **GitHub repo:** Privado — `irvinleandro` (usuario a confirmar al crear el repo)
- **Token GitHub:** `[GITHUB_TOKEN — ver Credenciales.rtf en Drive]`
  - ⚠️ Vive SOLO aquí y en GAS. Nunca en el HTML público.
  - ⚠️ Si se revoca, actualizar este archivo y la variable en GAS.
- **Drive:** `irvinleandro@gmail.com` — ID carpeta raíz EL JURISTA: `1bsMMHEzxsx5YbpCKaF1aATorTYquvclg`
- **MCP Drive UUID:** `8e05b614-31a0-4f2f-b11f-1cec6d779634` (cuenta irvinleandro)

---

## 📅 Fase actual

**FASE 0 — DISEÑO** ✅ Completado 2026-04-28

**FASE 1 — Infraestructura base** 🔄 EN PROGRESO — Pendiente acciones manuales del usuario

### ✅ Completado por Claude (automatizado)
- Estructura completa de carpetas en Drive (EL_JURISTA_DB/ + 9 materias + sub-carpetas Probatorio)
- `jurista_index.json` inicializado en Drive
- `gas/Code.gs` — Código GAS completo (8 endpoints + backup + GitHub sync)
- `prompts/orquestador.md` — System prompt del Orquestador v1.0.0

### ⏳ Pendiente — Acciones manuales del usuario

**A. Desplegar el GAS (15 minutos):**
1. Ir a [script.google.com](https://script.google.com) con la cuenta `irvinleandro@gmail.com`
2. Crear nuevo proyecto → nombre: `EL_JURISTA_API`
3. Pegar el contenido de `EL JURISTA/gas/Code.gs` (leerlo desde Drive)
4. Click en **Implementar** → **Nueva implementación**
   - Tipo: `Aplicación web`
   - Ejecutar como: `Yo (irvinleandro@gmail.com)`
   - Acceso: `Cualquier persona`
5. Copiar la URL de implementación
6. Actualizar este archivo: `GAS_URL_BASE` en sección URLs del sistema
7. En el editor GAS, ejecutar la función `configurarTriggerBackup()` una sola vez

**B. Crear repo GitHub (10 minutos):**
1. Ir a github.com → New repository
   - Nombre: `EL-JURISTA`
   - Privado ✓
   - Sin README (lo agregaremos después)
2. Crear carpeta `data/` en rama `main` (crear un archivo `data/.gitkeep`)
3. Actualizar este archivo: `GITHUB_REPO` y `GITHUB_PAGES_URL`

**Criterio de done de Fase 1:** El Jurista responde desde Mac Y teléfono con datos actualizados.

**FASE 2 — Carga inicial y sub-agentes** 🔄 EN PROGRESO

### ✅ Completado en Fase 2
- `jurista_index.json` poblado con **2,979 documentos** de LEXIUS Venezuela (5.8 MB)
  - Distribución: Constitucional (1,109) · Administrativo (558) · Mercantil (428) · Penal (232) · Laboral (216) · Procesal (166) · Civil (157) · Probatorio (67) · Electoral (46)
- Réplica GitHub actualizada (`data/jurista_index.json`)

### ⏳ Pendiente — Fase 2
- Desarrollar Sub-Agente Laboral (especializado en LOTTT/LOPTRA)
- Desarrollar Sub-Agente Probatorio (integrado con skill `escrito-pruebas`)
- Procesar carpeta `Jurisprudencia/` de LEXIUS (0 archivos encontrados — verificar scraper)
- Activar trigger de backup dominical en GAS (`configurarTriggerBackup()`)

Ver roadmap completo en: `DET_EL_JURISTA.md` → Sección 12.

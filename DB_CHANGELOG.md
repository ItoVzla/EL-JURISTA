# DB_CHANGELOG — EL JURISTA (Base de Datos)

Registra cambios a la **base de datos**: documentos añadidos, corregidos, reclasificados o eliminados.

> ⚠️ **Regla:** Este archivo NO tiene número de versión — solo fecha y hora. No incrementa la versión del sistema. Siempre agregar la entrada más reciente al inicio del archivo.

---

## 2026-04-28 22:50 — Carga masiva LEXIUS Venezuela (2,979 documentos)

Ingesta completa de la base de datos LEXIUS Venezuela desde carpeta `LEXIUS_DB/` en Drive.

| Materia | Documentos |
|---|---|
| Constitucional | 1,109 |
| Administrativo | 558 |
| Mercantil | 428 |
| Penal | 232 |
| Laboral_Venezuela | 216 |
| Procesal | 166 |
| Civil | 157 |
| Derecho_Probatorio | 67 |
| Electoral | 46 |
| **TOTAL** | **2,979** |

- Fuente: Lexius Venezuela (`appvenezuela.lexius.io`) — sección Legislación
- Tipo de documentos: Constitución, Códigos, Leyes Orgánicas, Leyes Ordinarias, Reglamentos, Decretos, Resoluciones, Tratados Internacionales
- Campos generados por IA: `resumen` (80 palabras), `fragmentos_clave` (3 párrafos), `tags`, clasificación por materia
- Formato: `jurista_index_v1.1.json` (5.8 MB) — índice completo. Réplica resumen en GitHub (1.6 MB).
- Índice subido a Drive (`jurista_index.json`, ID: `1P4MAvfb0_YKlNsxwOeK_oza-gMxH4zIq`) y replicado en GitHub (`data/jurista_index.json`).

**Estado actual:** 2,979 documentos · 9 materias activas

---

## 2026-04-28 — Inicialización del sistema

- Base de datos creada. Sin documentos aún.
- jurista_index.json inicializado con `total_documentos: 0`.
- Estructura de carpetas en Drive creada (vacía).

**Estado actual:** 0 documentos · 0 materias activas

---

*Las siguientes entradas se agregarán automáticamente por GAS al subir, corregir o eliminar documentos.*

*Formato de entrada:*
```
## YYYY-MM-DD HH:MM — [Tipo de acción] (N documentos)

| Acción | Archivo | Materia/Sub-materia |
|---|---|---|
| AÑADIDO | nombre_archivo.pdf | Materia/Subcarpeta |
| CORREGIDO | nombre_archivo.pdf | campo corregido: valor anterior → valor nuevo |
| RECLASIFICADO | nombre_archivo.pdf | origen → destino |
| ELIMINADO | nombre_archivo.pdf | Materia/Subcarpeta |

---
```

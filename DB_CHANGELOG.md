# DB_CHANGELOG — EL JURISTA (Base de Datos)

Registra cambios a la **base de datos**: documentos añadidos, corregidos, reclasificados o eliminados.

> ⚠️ **Regla:** Este archivo NO tiene número de versión — solo fecha y hora. No incrementa la versión del sistema. Siempre agregar la entrada más reciente al inicio del archivo.

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

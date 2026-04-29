#!/usr/bin/env python3
"""
Ingesta masiva de PDFs/DOCX/TXT a EL JURISTA via MarkItDown + GAS.

Uso:
  python ingestar_pdf.py CARPETA [--materia Laboral_Venezuela] [--tipo sentencia] [--dry-run]
  python ingestar_pdf.py archivo.pdf --materia Civil --tipo doctrina --autor "Bello Tabares"
  python ingestar_pdf.py CARPETA --dry-run  # solo muestra lo que haría, sin subir

El script:
  1. Detecta todos los PDF/DOCX/TXT en la carpeta (o el archivo indicado)
  2. Convierte cada uno a Markdown limpio con MarkItDown
  3. Infiere metadatos del nombre de archivo si siguen la convención del sistema
  4. Sube al GAS via POST /subir (que guarda en Drive + actualiza jurista_index.json + replica a GitHub)
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from buscador.base import DocumentoDescargado, extraer_texto, _limpiar
from buscador.gas_uploader import GASUploader

EXTENSIONES = {".pdf", ".docx", ".doc", ".txt", ".md", ".html"}

MATERIAS_VALIDAS = {
    "Constitucional", "Civil", "Mercantil", "Laboral_Venezuela",
    "Penal", "Administrativo", "Procesal", "Electoral", "Derecho_Probatorio",
}

TIPO_MAP = {
    "SENT": "sentencia", "DOC": "doctrina", "LEY": "legislacion",
    "ART": "articulo", "TESIS": "tesis", "CONV": "convenio", "MOD": "modelo",
}

MATERIA_ABREV = {
    "CONSTITUCIONAL": "Constitucional",
    "CIVIL": "Civil",
    "MERCANTIL": "Mercantil",
    "LABORAL": "Laboral_Venezuela",
    "PENAL": "Penal",
    "ADMINISTRATIVO": "Administrativo",
    "PROCESAL": "Procesal",
    "ELECTORAL": "Electoral",
    "PROBATORIO": "Derecho_Probatorio",
}


def inferir_metadatos(path: Path) -> dict:
    """Intenta inferir metadatos del nombre de archivo según convención del sistema.

    Convención: MATERIA_TIPO_AUTOR_AÑO_SLUG.ext
    Ejemplo:    LABORAL_SENT_SCS_2023_vacaciones.pdf
    """
    stem = path.stem
    partes = stem.split("_")
    meta = {"titulo": stem.replace("_", " ").replace("-", " ").title()}

    if len(partes) >= 4:
        materia_abrev = partes[0].upper()
        tipo_abrev    = partes[1].upper()
        autor_raw     = partes[2]
        año_raw       = partes[3]

        if materia_abrev in MATERIA_ABREV:
            meta["materia"] = MATERIA_ABREV[materia_abrev]
        if tipo_abrev in TIPO_MAP:
            meta["tipo"] = TIPO_MAP[tipo_abrev]
        if re.match(r"^\d{4}$", año_raw):
            meta["año"] = int(año_raw)
        if autor_raw and autor_raw != "-":
            meta["autor"] = autor_raw

    return meta


def procesar_archivo(
    path: Path,
    materia_default: str,
    tipo_default: str,
    autor_default: str,
    año_default: int,
    sub_materia: str,
) -> DocumentoDescargado:
    """Lee el archivo y construye un DocumentoDescargado con Markitdown."""
    contenido_bytes = path.read_bytes()
    extension = path.suffix.lstrip(".")

    # Inferir metadatos del nombre de archivo
    meta = inferir_metadatos(path)

    materia = meta.get("materia", materia_default)
    tipo    = meta.get("tipo", tipo_default)
    autor   = meta.get("autor", autor_default)
    año     = meta.get("año", año_default)
    titulo  = meta.get("titulo", path.stem)

    # Extraer texto con MarkItDown
    texto = _limpiar(extraer_texto(contenido_bytes, extension))

    return DocumentoDescargado(
        titulo=titulo,
        materia=materia,
        tipo=tipo,
        año=año,
        contenido_bytes=contenido_bytes,
        extension=extension,
        texto_extraido=texto,  # ya extraído — __post_init__ no re-extrae
        sub_materia=sub_materia,
        autor=autor,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Ingesta masiva de PDFs a EL JURISTA",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("ruta", help="Archivo o carpeta a ingestar")
    parser.add_argument("--materia", default="Constitucional",
                        choices=sorted(MATERIAS_VALIDAS),
                        help="Materia jurídica por defecto (se infiere del nombre si sigue convención)")
    parser.add_argument("--tipo", default="doctrina",
                        choices=["sentencia","legislacion","doctrina","articulo","tesis","convenio","modelo"],
                        help="Tipo de documento por defecto")
    parser.add_argument("--autor", default="-", help="Autor por defecto")
    parser.add_argument("--año", type=int, default=2024, help="Año por defecto")
    parser.add_argument("--sub-materia", default="Doctrina",
                        help="Sub-materia: Jurisprudencia | Doctrina | Legislacion (default: Doctrina)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Solo muestra lo que haría, no sube al GAS")
    parser.add_argument("--delay", type=float, default=2.0,
                        help="Segundos entre uploads al GAS (default: 2.0)")

    args = parser.parse_args()
    ruta = Path(args.ruta)

    # Recolectar archivos
    if ruta.is_file():
        archivos = [ruta] if ruta.suffix.lower() in EXTENSIONES else []
    elif ruta.is_dir():
        archivos = sorted([f for f in ruta.rglob("*") if f.suffix.lower() in EXTENSIONES])
    else:
        print(f"❌ Ruta no encontrada: {ruta}")
        sys.exit(1)

    if not archivos:
        print(f"Sin archivos {EXTENSIONES} en {ruta}")
        sys.exit(0)

    print(f"\n{'='*62}")
    print(f"EL JURISTA — Ingesta masiva con MarkItDown")
    print(f"{'='*62}")
    print(f"  Archivos encontrados : {len(archivos)}")
    print(f"  Materia por defecto  : {args.materia}")
    print(f"  Tipo por defecto     : {args.tipo}")
    print(f"  Sub-materia          : {args.sub_materia}")
    print(f"  Dry-run              : {'SÍ' if args.dry_run else 'NO'}")
    print()

    docs = []
    errores = []

    for i, path in enumerate(archivos, 1):
        try:
            doc = procesar_archivo(
                path,
                materia_default=args.materia,
                tipo_default=args.tipo,
                autor_default=args.autor,
                año_default=args.año,
                sub_materia=args.sub_materia,
            )
            docs.append(doc)
            chars = len(doc.texto_extraido)
            print(f"  [{i:03}/{len(archivos)}] ✅ {path.name[:50]}")
            print(f"         Materia: {doc.materia} | Tipo: {doc.tipo} | Año: {doc.año}")
            print(f"         Texto:   {chars:,} chars | Resumen: {len(doc._generar_resumen())} chars")
        except Exception as e:
            print(f"  [{i:03}/{len(archivos)}] ❌ {path.name[:50]}: {e}")
            errores.append(path.name)

    print(f"\n{'='*62}")
    print(f"  Procesados OK : {len(docs)}")
    print(f"  Con error     : {len(errores)}")

    if args.dry_run:
        print(f"\n[--dry-run] Nada subido al GAS.")
        return

    if not docs:
        print("Sin docs para subir.")
        return

    print(f"\n📤 Subiendo {len(docs)} documentos al GAS...")
    uploader = GASUploader()
    resultados = uploader.subir_lote(docs, delay=args.delay)

    ok   = sum(1 for r in resultados if r.get("ok"))
    fail = len(resultados) - ok
    print(f"\n{'='*62}")
    print(f"  ✅ Subidos   : {ok}")
    print(f"  ❌ Fallidos  : {fail}")
    if fail:
        for r in resultados:
            if not r.get("ok"):
                print(f"     - {r['titulo'][:55]}: {r.get('error','?')}")
    print(f"{'='*62}")


if __name__ == "__main__":
    main()

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Iterator
import base64
import os
import re
import tempfile


def extraer_texto(contenido_bytes: bytes, extension: str) -> str:
    """Extrae texto limpio de cualquier formato usando MarkItDown.

    Para PDF/DOCX/PPTX usa MarkItDown (pdfminer + OCR).
    Para txt/html/md decodifica directamente.
    """
    ext = extension.lower().lstrip(".")
    if ext in ("txt", "md"):
        return contenido_bytes.decode("utf-8", errors="replace")

    try:
        from markitdown import MarkItDown
        suffix = f".{ext}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(contenido_bytes)
            tmp_path = tmp.name
        try:
            result = MarkItDown().convert(tmp_path)
            return result.text_content or ""
        finally:
            os.unlink(tmp_path)
    except Exception:
        return contenido_bytes.decode("utf-8", errors="replace")


def _limpiar(texto: str) -> str:
    texto = re.sub(r"[ \t]{2,}", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


@dataclass
class DocumentoDescargado:
    """Documento listo para ingestar al GAS."""
    titulo: str
    materia: str
    tipo: str          # sentencia | legislacion | convenio | doctrina
    año: int
    contenido_bytes: bytes
    extension: str     # txt | pdf | html
    texto_extraido: str = ""
    sub_materia: str = "Jurisprudencia"
    autor: str = "-"
    sala: str | None = None
    expediente: str | None = None
    ponente: str | None = None
    partes: str | None = None
    fecha_sentencia: str | None = None   # YYYY-MM-DD
    vigencia: str = "vigente"
    tags: list[str] = field(default_factory=list)
    fuente_url: str | None = None

    def __post_init__(self):
        """Auto-extrae texto con MarkItDown si no fue provisto."""
        if not self.texto_extraido and self.contenido_bytes:
            raw = extraer_texto(self.contenido_bytes, self.extension)
            self.texto_extraido = _limpiar(raw)

    def to_gas_payload(self) -> dict:
        """Construye el payload para POST /subir del GAS."""
        payload = {
            "titulo":          self.titulo,
            "materia":         self.materia,
            "sub_materia":     self.sub_materia,
            "tipo":            self.tipo,
            "autor":           self.autor,
            "año":             self.año,
            "vigencia":        self.vigencia,
            "tags":            self.tags,
            "contenido_base64": base64.b64encode(self.contenido_bytes).decode(),
            "extension":       self.extension,
            "texto_extraido":  self.texto_extraido,
            "resumen":         self._generar_resumen(),
            "fragmentos_clave": self._extraer_fragmentos(),
        }
        for campo in ("sala", "expediente", "ponente", "partes", "fecha_sentencia"):
            val = getattr(self, campo)
            if val is not None:
                payload[campo] = val
        return payload

    def _generar_resumen(self) -> str:
        """Primeras 80 palabras del texto extraído."""
        palabras = self.texto_extraido.split()[:80]
        return " ".join(palabras) + ("..." if len(self.texto_extraido.split()) > 80 else "")

    def _extraer_fragmentos(self) -> list[str]:
        """3 párrafos más largos del texto como fragmentos clave."""
        parrafos = [p.strip() for p in self.texto_extraido.split("\n\n") if len(p.strip()) > 100]
        parrafos.sort(key=len, reverse=True)
        return [p[:500] for p in parrafos[:3]]


class BaseScraper(ABC):
    """Clase base para todos los scrapers de EL JURISTA."""

    DELAY = 1.0  # segundos entre requests

    @property
    @abstractmethod
    def nombre(self) -> str:
        """Nombre identificador del scraper (e.g. 'TSJ', 'AN')."""
        ...

    @abstractmethod
    def buscar(self, query: str, **filtros) -> Iterator[DocumentoDescargado]:
        """
        Busca documentos y los descarga uno a uno.
        Yields DocumentoDescargado listos para subir al GAS.

        Parámetros comunes (cada scraper puede agregar más):
          query   — texto libre a buscar
          año     — int, año de la sentencia/ley
          sala    — str, sala del TSJ (solo TSJ)
          materia — str, materia jurídica
        """
        ...

    def _limpiar_texto(self, texto: str) -> str:
        return _limpiar(texto)

    def _extraer_texto(self, contenido_bytes: bytes, extension: str) -> str:
        """Extrae texto limpio con MarkItDown (PDF/DOCX) o decode directo (txt/html)."""
        return _limpiar(extraer_texto(contenido_bytes, extension))

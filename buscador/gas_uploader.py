from __future__ import annotations
import json
import time
import requests
from .base import DocumentoDescargado

GAS_URL = "https://script.google.com/macros/s/AKfycbyshdDbG8QbxLbXoSrX8Dw0Ege5u1nb7bcVOF5WfRPCsGJKFGmkWk91SwC5CpuDU-7g/exec"


class GASUploader:
    """Envía documentos al endpoint POST /subir del GAS de EL JURISTA."""

    def __init__(self, gas_url: str = GAS_URL, max_reintentos: int = 3):
        self.gas_url = gas_url
        self.max_reintentos = max_reintentos

    def subir(self, doc: DocumentoDescargado) -> dict:
        """
        Sube un documento al GAS.
        Retorna el JSON de respuesta del GAS (incluye drive_id, nombre_archivo).
        Lanza RuntimeError si falla tras todos los reintentos.
        """
        payload = doc.to_gas_payload()
        url = f"{self.gas_url}?path=subir"

        for intento in range(1, self.max_reintentos + 1):
            try:
                r = requests.post(
                    url,
                    data=json.dumps(payload),
                    headers={"Content-Type": "text/plain;charset=utf-8"},
                    timeout=60,
                    allow_redirects=True,
                )
                r.raise_for_status()
                respuesta = r.json()
                if not respuesta.get("success"):
                    raise ValueError(f"GAS error: {respuesta.get('error', respuesta)}")
                return respuesta
            except ValueError:
                raise  # GAS returned success=false — not a transient error, don't retry
            except Exception as e:
                if intento == self.max_reintentos:
                    raise RuntimeError(f"GAS upload falló tras {self.max_reintentos} intentos: {e}") from e
                espera = 2 ** intento
                print(f"  ⚠️  Intento {intento} fallido ({e}). Reintentando en {espera}s...")
                time.sleep(espera)

    def subir_lote(self, docs: list[DocumentoDescargado], delay: float = 1.5) -> list[dict]:
        """Sube una lista de documentos con delay entre cada uno."""
        resultados = []
        for i, doc in enumerate(docs, 1):
            print(f"  📤 [{i}/{len(docs)}] Subiendo: {doc.titulo[:60]}")
            try:
                res = self.subir(doc)
                print(f"       ✅ drive_id: {res.get('drive_id','?')}")
                resultados.append({"ok": True, "titulo": doc.titulo, **res})
            except RuntimeError as e:
                print(f"       ❌ {e}")
                resultados.append({"ok": False, "titulo": doc.titulo, "error": str(e)})
            time.sleep(delay)
        return resultados

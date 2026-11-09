#!/usr/bin/env python3
"""Publica estado da ingestão sem credenciais, preservando distinção entre arquivo e atualização."""
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
status = os.environ.get("FII_MAPPING_OUTCOME", "skipped")
cvm = os.environ.get("FII_CVM_OUTCOME", "unknown")
target = root / "public/data/cvm-fii-by-ticker.json"
valid = False
coverage = None

if target.is_file():
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
        coverage = payload.get("coverage")
        valid = (payload.get("schemaVersion") == 1 and
                 payload.get("dataType") == "monthly-fii-accounting-by-ticker" and
                 isinstance(payload.get("records"), list) and
                 len(payload["records"]) > 0)
    except (ValueError, OSError):
        pass

if status == "success" and not valid:
    raise SystemExit("Etapa marcada como sucesso sem JSON de vínculos válido")

# Falha de rede/parser não torna os dados antigos novos.
result = {
    "schemaVersion": 1,
    "source": "GitHub Actions - Radar CVM",
    "cvmMetricsStep": cvm,
    "mappingStep": status,
    "hasPublishedSnapshot": valid,
    "coverage": coverage if valid else None,
    "notes": ("Vínculos ticker/CNPJ confirmados pelo processo de cruzamento"
              if status == "success" else
              "Rotina não concluiu o vínculo; consultar o log do GitHub Actions. "
              "Não considerar dados históricos como atualizados.")
}
output = root / "public/data/fii-mapping-status.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Estado de mapeamento:", result["mappingStep"],
      "snapshot:", result["hasPublishedSnapshot"])

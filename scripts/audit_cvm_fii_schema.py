#!/usr/bin/env python3
"""Inspeciona cabeçalhos de todos os CSVs do ZIP oficial CVM e campos de VPA.
Não extrapola métricas e não publica dados de investidores.
"""
import csv
import io
import json
import re
import os
import tempfile
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from refresh_cvm_fii import official_resource,download,select_columns,normal

ROOT=Path(__file__).resolve().parents[1]
target=ROOT/"public/data/cvm-fii-schema-audit.json"
year=int(os.environ.get("CVM_FII_YEAR","2026"))
catalog=json.loads((ROOT/"public/data/cvm-catalog.json").read_text(encoding="utf-8"))
url=official_resource(catalog,year)
audit=[]
with tempfile.TemporaryDirectory() as folder:
    source=Path(folder)/"fii.zip"
    download(url,source)
    with zipfile.ZipFile(source) as archive:
        for item in archive.infolist():
            if item.is_dir() or not item.filename.lower().endswith(".csv"):
                continue
            with archive.open(item) as raw:
                line=raw.readline().decode("latin-1",errors="replace").strip("\r\n")
            delimiter=";" if line.count(";")>=line.count(",") else ","
            fields=next(csv.reader([line],delimiter=delimiter))
            mapped=select_columns(fields)
            suspects=[f for f in fields if re.search(r"(cota|quota|patrim|invest|qtde|quant|rend|cotist|classe)",normal(f))]
            audit.append({"file":item.filename,"compressedBytes":item.compress_size,
                          "uncompressedBytes":item.file_size,
                          "headerCount":len(fields),"headers":fields,
                          "mappedFields":mapped,"financialCandidateHeaders":suspects})
if not audit:
    raise ValueError("Nenhum CSV da CVM encontrado")
payload={"schemaVersion":1,"dataType":"fii-cvm-schema-audit","sourceUrl":url,
         "inspectedAtUtc":datetime.now(timezone.utc).isoformat(timespec="seconds"),
         "csvFiles":audit,
         "warning":"Diagnóstico de esquema; não constitui indicadores nem prova de correspondência por classe."}
target.parent.mkdir(parents=True,exist_ok=True)
temp=target.with_suffix(".tmp")
temp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
temp.replace(target)
print("Inspecionados",len(audit),"CSVs oficiais CVM")
for entry in audit:
    print(entry["file"],"campos mapeados",entry["mappedFields"],flush=True)

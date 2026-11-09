#!/usr/bin/env python3
"""Extrai métricas mensais de FIIs diretamente do ZIP oficial da CVM.

Não calcula dividendos, dividend yield, preço de mercado ou vínculo ticker-CNPJ.
Arquivo público contém apenas observações contábeis identificadas por CNPJ.
"""
import csv
import io
import json
import os
import re
import tempfile
import unicodedata
import urllib.request
import zipfile
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public/data/cvm-catalog.json"
OUTPUT = ROOT / "public/data/cvm-fii-metrics.json"
MAX_DOWNLOAD = 160 * 1024 * 1024
MAX_CSV_BYTES = 320 * 1024 * 1024
MAX_TOTAL_UNCOMPRESSED = 650 * 1024 * 1024

def normal(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(c for c in value if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", value.lower())

ALIASES = {
    "cnpj": ["CNPJ_FUNDO", "CNPJ_FUNDO_CLASSE", "CNPJ", "CNPJ_FUNDO_IMOBILIARIO"],
    "referenceDate": ["DT_COMPTC", "DT_REFER", "DT_REFERENCIA", "DATA_REFERENCIA", "DATA_BASE", "DATACOMPETENCIA"],
    "netAssets": ["VL_PATRIM_LIQ", "VL_PATRIMONIO_LIQUIDO", "PATRIMONIOLIQUIDO"],
    "units": ["QT_COTAS", "COTAS_EMITIDAS", "QUANTIDADE_COTAS_EMITIDAS", "QT_COTAS_EMITIDAS", "QTD_COTAS", "NUM_COTAS_EMITIDAS", "QUANTIDADE_COTAS_EMITIDAS"],
    "holders": ["NR_COTST", "TOTAL_NUMERO_COTISTAS", "NR_COTISTAS", "NUM_COTISTAS", "QUANTIDADE_COTISTAS"],
    "navReported": ["VL_PATRIM_COTA", "VL_PATRIMONIAL_COTA", "VALOR_PATRIMONIAL_COTA", "VALOR_PATRIMONIAL_COTAS"],
}
ALIASES = {key: [normal(v) for v in values] for key,values in ALIASES.items()}

def canonical_cnpj(value):
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 14 and digits != "0" * 14 else None

def numeric(value):
    s = str(value or "").strip().replace("\u00a0", "").replace(" ", "")
    if not s or s.lower() in ("nan", "null", "n/a", "-"):
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        num = float(s)
        return num if abs(num) < 1e17 and num == num and num not in (float("inf"),float("-inf")) else None
    except ValueError:
        return None

def iso_date(value):
    s = str(value or "").strip()[:10]
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
            d = date.fromisoformat(s)
        elif re.fullmatch(r"\d{2}/\d{2}/\d{4}", s):
            d = datetime.strptime(s,"%d/%m/%Y").date()
        else:
            return None
        return d.isoformat() if d <= date.today() else None
    except ValueError:
        return None

def select_columns(fields):
    lookup = {normal(f):f for f in fields or []}
    return {k:next((lookup[a] for a in aliases if a in lookup),None) for k,aliases in ALIASES.items()}

def extract(zip_path, year):
    selected = {}
    invalid_nav = set()
    scanned = 0
    accepted = 0
    with zipfile.ZipFile(zip_path) as archive:
        entries = [entry for entry in archive.infolist() if not entry.is_dir() and entry.filename.lower().endswith(".csv")]
        if not entries:
            raise ValueError("ZIP CVM sem CSV")
        if sum(e.file_size for e in entries) > MAX_TOTAL_UNCOMPRESSED:
            raise ValueError("ZIP CVM acima do limite de descompactação")
        for entry in entries:
            if entry.file_size > MAX_CSV_BYTES:
                continue
            with archive.open(entry) as raw:
                # O formato oficial da CVM normalmente usa ; e encoding latin1.
                text = io.TextIOWrapper(raw, encoding="latin-1", errors="replace", newline="")
                head = text.readline()
                if not head:
                    continue
                delimiter = ";" if head.count(";") >= head.count(",") else ","
                import itertools
                rows = csv.DictReader(itertools.chain([head],text),delimiter=delimiter)
                cols = select_columns(rows.fieldnames)
                if not cols["cnpj"] or not cols["referenceDate"] or not any(cols[x] for x in ("netAssets","holders","units","navReported")):
                    continue
                scanned += 1
                for r in rows:
                    cnpj = canonical_cnpj(r.get(cols["cnpj"]))
                    ref = iso_date(r.get(cols["referenceDate"]))
                    if not cnpj or not ref or not ref.startswith(str(year)+"-"):
                        continue
                    record = {"cnpj":cnpj,"referenceDate":ref}
                    for key in ("netAssets","units","holders","navReported"):
                        field = cols[key]
                        n = numeric(r.get(field)) if field else None
                        if n is None or n < 0 or (key in ("units","holders") and n != int(n)):
                            continue
                        record[key] = int(n) if key in ("units","holders") else round(n,6)
                    if len(record) == 2:
                        continue
                    key = cnpj
                    prev = selected.get(key)
                    if prev is None or ref > prev["referenceDate"]:
                        selected[key] = record
                    elif ref == prev["referenceDate"]:
                        # O ZIP da CVM pode distribuir colunas entre CSVs distintos.
                        # Unir somente mesma competência; conflito no mesmo campo
                        # mantém a primeira observação até revisão de reapresentação.
                        for field,value in record.items():
                            if field not in prev:
                                prev[field] = value
                            elif field in ("netAssets","units") and prev[field] != value:
                                # Valores conflitantes para a mesma competência exigem
                                # revisão humana; não publicar VPA calculado desse fundo.
                                invalid_nav.add((cnpj,ref))
                    accepted += 1
    if not scanned or not selected:
        raise ValueError("Nenhum CSV com colunas financeiras reconhecidas; esquema oficial exige revisão")
    for record in selected.values():
        if (record.get("units",0)>0 and record.get("netAssets",0)>0
                and (record["cnpj"],record["referenceDate"]) not in invalid_nav):
            calc = record["netAssets"]/record["units"]
            reported = record.get("navReported",0)
            # Nunca publicar VPA sem conciliação com o número por cota
            # declarado no informe oficial do mesmo fundo e competência.
            if reported>0 and abs(calc-reported)/reported <= 0.02:
                record["navCalculated"] = round(calc,6)
                record["navValidated"] = True
    return sorted(selected.values(), key=lambda r:r["cnpj"]), scanned, accepted

def official_resource(catalog, year):
    sets = [d for d in catalog.get("datasets",[]) if d.get("id")=="fii-doc-inf_mensal"]
    if len(sets)!=1:
        raise ValueError("Catálogo CVM de FII ausente")
    suffix = f"inf_mensal_fii_{year}.zip"
    urls = [r.get("url","") for r in sets[0].get("resources",[]) if r.get("url","").endswith("/"+suffix)]
    if len(urls)!=1:
        raise ValueError("Arquivo anual de FII ausente ou ambíguo")
    url = urls[0]
    parsed = urlparse(url)
    if parsed.scheme!="https" or parsed.hostname!="dados.cvm.gov.br" or not parsed.path.startswith("/dados/FII/DOC/INF_MENSAL/DADOS/"):
        raise ValueError("Origem CVM inválida")
    return url

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent":"DividendSystem/1.0 (+https://github.com/guidorafaelchaves/guido-dividend-system)"})
    with urllib.request.urlopen(req,timeout=90) as response, open(dest,"wb") as out:
        size=0
        while True:
            chunk=response.read(1024*1024)
            if not chunk:
                break
            size+=len(chunk)
            if size>MAX_DOWNLOAD:
                raise ValueError("Arquivo CVM excede limite de download")
            out.write(chunk)

def main():
    year=int(os.environ.get("CVM_FII_YEAR",str(date.today().year)))
    catalog=json.loads(CATALOG.read_text(encoding="utf-8"))
    url=official_resource(catalog,year)
    with tempfile.TemporaryDirectory() as folder:
        target=Path(folder)/"cvm.zip"
        download(url,target)
        records,files,rows=extract(target,year)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    payload={"schemaVersion":1,"source":"CVM - Informe Mensal Estruturado FII",
             "dataType":"monthly-fii-accounting","year":year,"sourceUrl":url,
             "coverage":{"funds":len(records),"filesWithRecognizedSchema":files,"observationsValidated":rows},
             "metrics":records,"limitations":"Sem código de negociação, cotações, dividendos ou DY; referencial contábil por CNPJ e competência."}
    tmp=OUTPUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(OUTPUT)
    print("FII CVM:",len(records),"fundos,",rows,"linhas validadas, período",year)

if __name__=="__main__":
    main()

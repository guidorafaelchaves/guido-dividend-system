#!/usr/bin/env python3
"""Reconcile a licensed, normalized B3 instrument snapshot against the FII catalog.

NO B3 website scraping. The input must be supplied from an authorized source.
A ticker seen in a snapshot is not proof of a trade, liquidity, or a current listing.
Only explicit, valid evidence changes the status; missing tickers stay unverified.
"""
import argparse
import csv
import hashlib
import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public/data/fii-universe.json"
OUTPUT = ROOT / "public/data/fii-b3-reconciliation.json"
REQUIRED = {"ticker", "isin", "instrument_type", "trading_status"}
TYPE_VALUES = {"FII", "FIAGRO"}
STATUS_VALUES = {"ACTIVE", "INACTIVE"}

def isin_valid(value):
    """ISO 6166 / Luhn check digit."""
    code = str(value or "").strip().upper()
    if not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}[0-9]", code):
        return False
    expanded = "".join(str(ord(c)-55) if c.isalpha() else c for c in code)
    digits = [int(d) for d in expanded]
    total = 0
    for index, digit in enumerate(reversed(digits)):
        if index % 2:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return total % 10 == 0

def validate_date(day):
    parsed = date.fromisoformat(day)
    if parsed > datetime.now(timezone.utc).date():
        raise ValueError("Data do snapshot futura")
    return parsed

def reconcile(catalog, csv_text, snapshot_date, source_name, rights_confirmed=False):
    if rights_confirmed is not True:
        raise PermissionError("Evidencia de direitos de processamento/publicacao ausente")
    validate_date(snapshot_date)
    if catalog.get("dataType") != "fii-ticker-cnpj-catalog":
        raise ValueError("Catalogo FII invalido")
    reader = csv.DictReader(csv_text.lstrip("\ufeff").splitlines())
    if not reader.fieldnames or not REQUIRED.issubset(reader.fieldnames):
        raise ValueError("CSV normalizado exige: ticker,isin,instrument_type,trading_status")
    by_ticker = {}
    examined = 0
    for row in reader:
        examined += 1
        ticker = str(row.get("ticker") or "").strip().upper()
        if not re.fullmatch(r"[A-Z]{4}11", ticker):
            continue
        instrument_type = str(row.get("instrument_type") or "").strip().upper()
        status = str(row.get("trading_status") or "").strip().upper()
        isin = str(row.get("isin") or "").strip().upper()
        if instrument_type not in TYPE_VALUES or status not in STATUS_VALUES or not isin_valid(isin):
            by_ticker.setdefault(ticker, []).append(None)
            continue
        by_ticker.setdefault(ticker, []).append((isin, instrument_type, status))

    results = []
    for item in catalog["records"]:
        ticker = item["ticker"]
        candidates = by_ticker.get(ticker, [])
        unique = set(candidates)
        entry = {"ticker": ticker, "assetClass": item.get("assetClass", "FII_CANDIDATE"),
                 "verificationStatus": "unverified"}
        if candidates and (None in unique or len(unique) != 1):
            entry["verificationStatus"] = "ambiguous"
        elif candidates:
            isin, kind, status = next(iter(unique))
            # Do not conflate FIAGRO and FII due to supplier misclassification.
            expected = "FIAGRO" if entry["assetClass"] == "FIAGRO" else "FII"
            if kind != expected:
                entry["verificationStatus"] = "class-conflict"
            else:
                entry.update(verificationStatus="observed-active" if status=="ACTIVE" else "observed-inactive",
                             isin=isin)
        results.append(entry)
    counts = {status: sum(row["verificationStatus"] == status for row in results)
              for status in ("observed-active", "observed-inactive", "unverified", "ambiguous", "class-conflict")}
    return {"schemaVersion": 1, "dataType": "fii-b3-reconciliation",
            "snapshotDate": snapshot_date, "sourceName": source_name,
            "rightsConfirmed": True, "catalogCount": len(results),
            "inputRowsExamined": examined, "coverage": counts,
            "statusDefinition": "Snapshot observation only; ACTIVE does not prove actual trading or positive liquidity.",
            "records": results}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path, help="CSV normalizado, obtido por via autorizada")
    parser.add_argument("--snapshot-date", required=True)
    parser.add_argument("--source-name", required=True)
    parser.add_argument("--rights-confirmed", action="store_true")
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if not args.rights_confirmed:
        parser.error("Exige --rights-confirmed e autorização real para transformar e publicar este snapshot.")
    raw = args.input.read_bytes()
    if not raw or len(raw)>32*1024*1024:
        raise ValueError("Arquivo de entrada vazio ou grande demais")
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    output = reconcile(catalog, raw.decode("utf-8-sig"), args.snapshot_date,
                       args.source_name, rights_confirmed=True)
    output["inputSha256"] = hashlib.sha256(raw).hexdigest()
    output["generatedAtUtc"] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.output.with_suffix(args.output.suffix + ".tmp")
    tmp.write_text(json.dumps(output, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    tmp.replace(args.output)
    print("Conciliação:", output["coverage"])

if __name__ == "__main__":
    main()

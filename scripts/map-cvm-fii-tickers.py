#!/usr/bin/env python3
"""Vincula ticker de FII a CNPJ da CVM usando CSV público CC BY 4.0.

Fonte cadastral: Lummios, https://developers.lummios.com.br/dados-abertos.html
Não utiliza a API paga nem infere correspondência por nome.
"""
import csv
import io
import json
import re
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
METRICS=ROOT/"public/data/cvm-fii-metrics.json"
OUTPUT=ROOT/"public/data/cvm-fii-by-ticker.json"
SOURCE="https://developers.lummios.com.br/dados/universo-ativos.csv"
ATTRIBUTION="Dados de identificação ticker/CNPJ: Lummios, CC BY 4.0 — https://developers.lummios.com.br/dados-abertos.html"

def normalize_cnpj(value):
    digits=re.sub(r"\D","",str(value or ""))
    if len(digits)!=14 or digits=="0"*14:
        return None
    # Não rejeitar CNPJs alfanuméricos hipotéticos, mas este dataset é numérico.
    def digit(seq):
        weights = ([5,4,3,2,9,8,7,6,5,4,3,2] if len(seq)==12 else
                   [6,5,4,3,2,9,8,7,6,5,4,3,2])
        remainder = sum(a*b for a,b in zip(seq,weights))%11
        return 0 if remainder<2 else 11-remainder
    v=[int(x) for x in digits]
    if digit(v[:12])!=v[12] or digit(v[:13])!=v[13]:
        return None
    return digits

def mapping(csv_text, metrics):
    reader=csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))
    if not reader.fieldnames or not {"ticker","cnpj","classe"}.issubset(reader.fieldnames):
        raise ValueError("Cabeçalho CSV da fonte de identificação não reconhecido")
    lookup={}
    conflicted=set()
    seen=set()
    for row in reader:
        if str(row.get("classe","")).strip().lower()!="fii":
            continue
        ticker=str(row.get("ticker","")).strip().upper()
        cnpj=normalize_cnpj(row.get("cnpj"))
        if not re.fullmatch(r"[A-Z]{4}11",ticker) or not cnpj:
            continue
        pair=(ticker,cnpj)
        if pair in seen:
            continue
        seen.add(pair)
        if ticker in lookup and lookup[ticker]!=cnpj:
            conflicted.add(ticker)
        else:
            lookup[ticker]=cnpj
    for ticker in conflicted:
        del lookup[ticker]
    by_cnpj={}
    for ticker,cnpj in lookup.items():
        by_cnpj.setdefault(cnpj,[]).append(ticker)
    # Um CNPJ pode ter múltiplas classes/cotas; evite assumir o mesmo VP/cota.
    ambiguous={cnpj for cnpj,tickers in by_cnpj.items() if len(tickers)>1}
    records=[]
    for metric in metrics:
        cnpj=normalize_cnpj(metric.get("cnpj"))
        if not cnpj or cnpj in ambiguous:
            continue
        tickers=by_cnpj.get(cnpj,[])
        if len(tickers)!=1:
            continue
        ticker=tickers[0]
        if metric.get("referenceDate") is None:
            continue
        record={"ticker":ticker,"cnpj":cnpj,"referenceDate":metric["referenceDate"]}
        for field in ("netAssets","units","holders","navReported","navCalculated"):
            if field in metric:
                record[field]=metric[field]
        records.append(record)
    records.sort(key=lambda r:r["ticker"])
    if len(records)!=len({r["ticker"] for r in records}):
        raise ValueError("Duplicidade de ticker no resultado")
    return records,{"tickerPairsValidated":len(lookup),"conflictingTickers":len(conflicted),"ambiguousCnpjs":len(ambiguous),
                    "fiisWithCvmMetrics":len(records),"cvmFundsUnmatched":len(metrics)-len(records)}

def main():
    payload=json.loads(METRICS.read_text(encoding="utf-8"))
    if payload.get("schemaVersion")!=1 or payload.get("dataType")!="monthly-fii-accounting":
        raise ValueError("Dados da CVM ausentes ou com esquema incompatível")
    req=urllib.request.Request(SOURCE,headers={"User-Agent":"GuidoDividendSystem/1.0"})
    with urllib.request.urlopen(req,timeout=45) as res:
        data=res.read(8*1024*1024+1)
    if len(data)>8*1024*1024:
        raise ValueError("CSV de identificação excede tamanho permitido")
    records,quality=mapping(data.decode("utf-8-sig"),payload["metrics"])
    if len(records)<30:
        raise ValueError("Cobertura muito pequena: não publicar mapeamento")
    result={"schemaVersion":1,"dataType":"monthly-fii-accounting-by-ticker",
            "accountingSource":"CVM, informes mensais FII",
            "identitySource":SOURCE,"attribution":ATTRIBUTION,
            "license":"CC BY 4.0 (somente identificação ticker/CNPJ Lummios)",
            "referenceYear":payload["year"],"coverage":quality,
            "records":records,
            "limitations":"Sem preço e sem dividendos. VPA exige validação do método e competência; ticker não é correspondência oficial B3."
    }
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    tmp=OUTPUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(OUTPUT)
    print("FIIs cruzados:",quality)

if __name__=="__main__":
    main()

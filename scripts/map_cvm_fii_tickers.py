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
import urllib.error
import time
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
    rows_scanned=0
    fii_rows=0
    rejected_identity=0
    for row in reader:
        rows_scanned += 1
        if str(row.get("classe","")).strip().lower()!="fii":
            continue
        fii_rows += 1
        ticker=str(row.get("ticker","")).strip().upper()
        cnpj=normalize_cnpj(row.get("cnpj"))
        if not re.fullmatch(r"[A-Z]{4}11",ticker) or not cnpj:
            rejected_identity += 1
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
        for field in ("netAssets","units","holders","navReported","navCalculated","navValidated"):
            if field in metric:
                record[field]=metric[field]
        records.append(record)
    records.sort(key=lambda r:r["ticker"])
    if len(records)!=len({r["ticker"] for r in records}):
        raise ValueError("Duplicidade de ticker no resultado")
    return records,{"csvRowsScanned":rows_scanned,"fiiRowsSeen":fii_rows,"rejectedIdentityRows":rejected_identity,"tickerPairsValidated":len(lookup),"conflictingTickers":len(conflicted),"ambiguousCnpjs":len(ambiguous),
                    "fiisWithCvmMetrics":len(records),"cvmFundsUnmatched":len(metrics)-len(records)}


def universe(csv_text):
    """Catalogo de identificacoes de FIIs sem dependencia de informe contabil CVM."""
    reader=csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))
    if not reader.fieldnames or not {"ticker","cnpj","classe"}.issubset(reader.fieldnames):
        raise ValueError("CSV de universo com colunas obrigatorias ausentes")
    tickers={}
    conflicts=set()
    for row in reader:
        if str(row.get("classe","")).strip().lower()!="fii":
            continue
        ticker=str(row.get("ticker","")).strip().upper()
        cnpj=normalize_cnpj(row.get("cnpj"))
        if not re.fullmatch(r"[A-Z]{4}11",ticker) or not cnpj:
            continue
        if ticker in tickers and tickers[ticker]!=cnpj:
            conflicts.add(ticker)
        else:
            tickers[ticker]=cnpj
    for ticker in conflicts:
        del tickers[ticker]
    return [{"ticker":t,"cnpj":c,"identityStatus":"third-party-catalog-unverified-b3"}
            for t,c in sorted(tickers.items())]

def main():
    payload=json.loads(METRICS.read_text(encoding="utf-8"))
    if payload.get("schemaVersion")!=1 or payload.get("dataType")!="monthly-fii-accounting":
        raise ValueError("Dados da CVM ausentes ou com esquema incompatível")
    req=urllib.request.Request(SOURCE,headers={"User-Agent":"Mozilla/5.0 (compatible; GuidoDividendSystem/1.0; public-licensed-dataset)","Accept":"text/csv,application/octet-stream;q=0.9,*/*;q=0.1"})
    data=None
    for attempt in range(1,4):
        try:
            with urllib.request.urlopen(req,timeout=45) as res:
                status=res.status
                content_type=res.headers.get("Content-Type","")
                data=res.read(8*1024*1024+1)
                print(f"Fonte cadastral: HTTP {status}, tipo {content_type}, {len(data)} bytes",flush=True)
            break
        except urllib.error.HTTPError as err:
            print(f"Tentativa {attempt}/3: HTTP {err.code} em {SOURCE}",flush=True)
            if err.code in (401,403,404):
                raise RuntimeError("Fonte cadastral indisponível ou acesso restrito: HTTP "+str(err.code)) from err
        except (urllib.error.URLError,TimeoutError) as err:
            print(f"Tentativa {attempt}/3: erro de rede: {err}",flush=True)
        if attempt<3:
            time.sleep(2*attempt)
    if data is None:
        raise RuntimeError("Falha no download da fonte cadastral após três tentativas")
    if len(data)>8*1024*1024:
        raise ValueError("CSV de identificação excede tamanho permitido")
    csv_text=data.decode("utf-8-sig")
    records,quality=mapping(csv_text,payload["metrics"])
    all_fiis=universe(csv_text)
    if len(all_fiis)<100:
        raise ValueError("Cobertura de FIIs muito pequena; preservar catalogo anterior")
    print("Diagnóstico de correspondência:", quality, flush=True)
    if len(records)<30:
        raise ValueError("Cobertura muito pequena (<30): não publicar mapeamento; verificar os CNPJs e a fonte CSV")
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
    universe_output=ROOT/"public/data/fii-universe.json"
    universe_payload={"schemaVersion":1,"dataType":"fii-ticker-cnpj-catalog","source":SOURCE,
        "attribution":ATTRIBUTION,"license":"CC BY 4.0",
        "count":len(all_fiis),"records":all_fiis,
        "limitations":"Identificacao cadastral de terceiro; nao comprova listagem ativa na B3. Sem precos, dividendos ou DY."}
    universe_tmp=universe_output.with_suffix(".json.tmp")
    universe_tmp.write_text(json.dumps(universe_payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    universe_tmp.replace(universe_output)
    print("FIIs no universo:",len(all_fiis))
    print("FIIs cruzados:",quality)

if __name__=="__main__":
    main()

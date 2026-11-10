#!/usr/bin/env python3
"""Normaliza rendimentos/amortizacoes de FIIs com evidencia documental autorizada.

O informe mensal CVM nao prova data-com, data de pagamento ou valor por cota.
Nao faz scraping nem gera historico a partir de VPA, caixa ou DY mensal.
"""
import argparse
import csv
import hashlib
import io
import json
import re
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
CATALOG=ROOT/"public/data/fii-universe.json"
OUT=ROOT/"public/data/fii-distributions.json"
FIELDS={"ticker","cnpj","kind","ex_date","payment_date","amount_per_unit",
        "announcement_date","source_document_id","source_url"}
KINDS={"RENDIMENTO","AMORTIZACAO"}

def valid_date(value):
    try:
        d=date.fromisoformat(value)
        return d if d.isoformat()==value else None
    except (ValueError,TypeError):
        return None

def normalize(catalog, raw, source_name, rights_confirmed=False, now=None):
    if rights_confirmed is not True:
        raise PermissionError("Publicacao requer direitos expressamente confirmados.")
    if catalog.get("dataType")!="fii-ticker-cnpj-catalog" or not isinstance(catalog.get("records"),list):
        raise ValueError("Catalogo de identificacao FII invalido")
    today=now or datetime.now(timezone.utc).date()
    lookup={r.get("ticker"):r.get("cnpj") for r in catalog["records"]}
    reader=csv.DictReader(io.StringIO(raw.lstrip("\ufeff")))
    if not reader.fieldnames or not FIELDS.issubset(reader.fieldnames):
        raise ValueError("CSV requer: "+",".join(sorted(FIELDS)))
    accepted={}
    rejected={}
    conflicts=set()
    examined=0
    for row in reader:
        examined+=1
        ticker=str(row.get("ticker") or "").strip().upper()
        cnpj=re.sub(r"\D","",str(row.get("cnpj") or ""))
        kind=str(row.get("kind") or "").strip().upper()
        ex=valid_date(str(row.get("ex_date") or "").strip())
        pay=valid_date(str(row.get("payment_date") or "").strip())
        announced=valid_date(str(row.get("announcement_date") or "").strip())
        docid=str(row.get("source_document_id") or "").strip()
        url=str(row.get("source_url") or "").strip()
        try:
            amount=Decimal(str(row.get("amount_per_unit") or "").strip())
        except InvalidOperation:
            amount=Decimal("-1")
        reason=None
        if not re.fullmatch(r"[A-Z]{4}11",ticker) or lookup.get(ticker)!=cnpj:
            reason="identity-mismatch"
        elif kind not in KINDS:
            reason="invalid-kind"
        elif not all((ex,pay,announced)) or announced>today or pay<ex or ex<announced:
            reason="invalid-chronology"
        elif not amount.is_finite() or amount<=0 or amount>Decimal("1000000") or -amount.as_tuple().exponent>8:
            reason="invalid-amount"
        elif not docid or len(docid)>160 or not re.fullmatch(r"[\w.:-]{4,160}",docid,re.UNICODE):
            reason="missing-document-id"
        else:
            parsed=urlparse(url)
            if parsed.scheme!="https" or not parsed.netloc or parsed.username or parsed.password:
                reason="invalid-document-url"
        if reason:
            rejected[reason]=rejected.get(reason,0)+1
            continue
        value=format(amount,"f")
        key=(ticker,kind,ex.isoformat(),pay.isoformat(),value)
        record={"ticker":ticker,"cnpj":cnpj,"kind":kind,"exDate":ex.isoformat(),
                "paymentDate":pay.isoformat(),"announcementDate":announced.isoformat(),
                "amountPerUnit":float(amount),"amountDecimal":value,
                "sourceDocumentId":docid,"sourceUrl":url,
                "verificationStatus":"document-linked-unverified-content"}
        if key in conflicts:continue
        prior=accepted.get(key)
        # Mesma parcela divulgada varias vezes com identificadores diferentes:
        # exige revisao, nao escolhe arbitrariamente uma versao.
        if prior and (prior["sourceDocumentId"]!=docid or prior["sourceUrl"]!=url):
            conflicts.add(key)
            del accepted[key]
        elif not prior:
            accepted[key]=record
    records=sorted(accepted.values(),key=lambda r:(r["ticker"],r["exDate"],r["paymentDate"],r["kind"]))
    return {"schemaVersion":1,"dataType":"fii-document-linked-distributions",
            "sourceName":source_name,"rightsConfirmed":True,
            "importedAtUtc":datetime.now(timezone.utc).isoformat(),
            "coverage":{"inputRows":examined,"accepted":len(records),
                        "rejectedByReason":rejected,"conflictingEconomicEvents":len(conflicts),
                        "tickers":len({r["ticker"] for r in records})},
            "limitations":"Identidade e links validados; conteudo do documento nao autenticado automaticamente. "
                          "Sem alegacao de dado oficial B3 ou CVM; nao implica distribuicao efetivada. "
                          "Amortizacao nao entra em dividend yield. Sem precos ou DY inferidos.",
            "records":records}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",required=True,type=Path)
    parser.add_argument("--source-name",required=True)
    parser.add_argument("--rights-confirmed",action="store_true")
    parser.add_argument("--catalog",type=Path,default=CATALOG)
    parser.add_argument("--output",type=Path,default=OUT)
    args=parser.parse_args()
    if not args.rights_confirmed:
        parser.error("Confirme direitos de processamento, armazenamento e publicacao.")
    raw=args.input.read_bytes()
    if not raw or len(raw)>16*1024*1024:
        raise ValueError("Arquivo vazio ou maior que 16 MiB")
    catalog=json.loads(args.catalog.read_text(encoding="utf-8"))
    result=normalize(catalog,raw.decode("utf-8-sig"),args.source_name,True)
    result["inputSha256"]=hashlib.sha256(raw).hexdigest()
    if not result["records"]:
        raise ValueError("Nenhum rendimento elegivel: snapshot anterior preservado.")
    args.output.parent.mkdir(parents=True,exist_ok=True)
    tmp=args.output.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(args.output)
    print(result["coverage"])

if __name__=="__main__":
    main()

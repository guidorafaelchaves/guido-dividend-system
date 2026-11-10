#!/usr/bin/env python3
"""Apply human document review to licensed FII distribution imports.

Review records are attestations of document inspection, not automated verification.
Only explicit approved rows matching all source fields become public events.
Cancellation/rejection tombstones persist and never become future dividends.
"""
import argparse
import csv
import io
import json
import re
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HISTORY=ROOT/"public/data/fii-distributions.json"
CATALOG=ROOT/"public/data/fii-universe.json"
REVIEWS=ROOT/"data/private/fii-distribution-reviews.csv"
OUT=ROOT/"public/data/fii-reviewed-events.json"
FIELDS={"ticker","cnpj","kind","ex_date","payment_date","amount_decimal",
        "source_document_id","decision","reviewer","reviewed_at","evidence_note"}
DECISIONS={"APPROVED","REJECTED","CANCELLED"}
KINDS={"RENDIMENTO","AMORTIZACAO"}

def day(s):
    try:
        value=date.fromisoformat(str(s))
        return value.isoformat() if value.isoformat()==str(s) else None
    except (ValueError,TypeError):
        return None

def identity(row):
    return (str(row.get("ticker","")).upper(),str(row.get("cnpj","")),
            str(row.get("kind","")).upper(),
            row.get("exDate") or row.get("ex_date"),
            row.get("paymentDate") or row.get("payment_date"),
            str(row.get("amountDecimal") or row.get("amount_decimal")),
            row.get("sourceDocumentId") or row.get("source_document_id"))

def review(history,catalog,csv_text,previous=None):
    if history.get("schemaVersion")!=1 or history.get("dataType")!="fii-document-linked-distributions" or history.get("rightsConfirmed") is not True:
        raise ValueError("Historico documental nao validado ou sem direitos confirmados")
    if catalog.get("dataType")!="fii-ticker-cnpj-catalog":
        raise ValueError("Catalogo FII invalido")
    cnpjs={r["ticker"]:r["cnpj"] for r in catalog.get("records",[])}
    source={}
    for record in history.get("records",[]):
        if record.get("verificationStatus")!="document-linked-unverified-content":
            continue
        key=identity(record)
        if key in source:
            raise ValueError("Duplicidade de identidade documental no historico")
        source[key]=record
    reader=csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))
    if not reader.fieldnames or not FIELDS.issubset(reader.fieldnames):
        raise ValueError("Planilha exige: "+",".join(sorted(FIELDS)))
    historical={}
    if previous:
        if previous.get("schemaVersion")!=1 or previous.get("dataType")!="fii-reviewed-events":
            raise ValueError("Revisoes anteriores incompatíveis")
        for x in previous.get("reviews",[]):
            historical[tuple(x["identity"])]=x
    newly_reviewed=0
    seen=set()
    for row in reader:
        key=identity(row)
        if key in seen:
            raise ValueError("A mesma parcela aparece duas vezes na planilha de revisao")
        seen.add(key)
        source_record=source.get(key)
        if source_record is None:
            raise ValueError("Revisao sem correspondencia exata no historico: "+repr(key))
        if cnpjs.get(key[0])!=key[1] or key[2] not in KINDS:
            raise ValueError("CNPJ ou especie incompatível")
        if row["decision"].strip().upper() not in DECISIONS:
            raise ValueError("Decisao deve ser APPROVED, REJECTED ou CANCELLED")
        decision=row["decision"].strip().upper()
        reviewer=str(row["reviewer"]).strip()
        reviewed_at=day(row["reviewed_at"].strip())
        note=str(row["evidence_note"]).strip()
        if not (3<=len(reviewer)<=120 and reviewed_at and
                reviewed_at<=datetime.now(timezone.utc).date().isoformat() and
                12<=len(note)<=600):
            raise ValueError("Revisor, data ou justificativa documental insuficiente")
        if not day(key[3]) or not day(key[4]):
            raise ValueError("Datas de provento invalidas")
        # Identity must be exact; a revision of value/date is a new document requiring
        # explicit cancellation of the old event and independent review of the new.
        previous_review=historical.get(key)
        if previous_review and previous_review["decision"]=="CANCELLED" and decision!="CANCELLED":
            raise ValueError("Evento cancelado nao pode ser reativado automaticamente")
        if previous_review and previous_review["decision"]=="REJECTED" and decision=="APPROVED":
            raise ValueError("Rejeicao nao pode virar aprovacao automaticamente")
        historical[key]={"identity":list(key),"decision":decision,"reviewer":reviewer,
                         "reviewedAt":reviewed_at,"evidenceNote":note,
                         "sourceUrl":source_record["sourceUrl"]}
        newly_reviewed+=1

    events=[]
    reviews=list(historical.values())
    for entry in reviews:
        if entry["decision"]!="APPROVED":
            continue
        key=tuple(entry["identity"])
        record=source.get(key)
        if record is None or cnpjs.get(key[0])!=key[1]:
            # Previously approved document absent from current authorized history:
            # fail closed, never republish stale/superseded approval.
            continue
        try:
            amount=Decimal(key[5])
        except (InvalidOperation,TypeError):
            continue
        if not amount.is_finite() or amount<=0:
            continue
        event_id="fii-reviewed:"+":".join((key[0],key[2],key[3],key[4],key[5],key[6]))
        events.append({"id":event_id,"ticker":key[0],"cnpj":key[1],
                       "kind":"rendimento" if key[2]=="RENDIMENTO" else "amortizacao",
                       "status":"confirmed-document","source":"human-reviewed-document",
                       "exDate":key[3],"paymentDate":key[4],"amount":float(amount),
                       "amountDecimal":key[5],"sourceDocumentId":key[6],
                       "sourceUrl":record["sourceUrl"],
                       "reviewedAt":entry["reviewedAt"],"reviewer":entry["reviewer"],
                       "verificationStatus":"human-reviewed-announcement",
                       "paymentSettlementVerified":False})
    events.sort(key=lambda x:(x["paymentDate"],x["ticker"],x["id"]))
    return {"schemaVersion":1,"dataType":"fii-reviewed-events",
            "generatedAtUtc":datetime.now(timezone.utc).isoformat(),
            "coverage":{"reviewed":len(reviews),"approved":len(events),
                        "rejected":sum(r["decision"]=="REJECTED" for r in reviews),
                        "cancelled":sum(r["decision"]=="CANCELLED" for r in reviews),
                        "newReviews":newly_reviewed},
            "method":"Human review with exact source-record match and persistent cancellation/rejection.",
            "limitations":"Aprovacao atesta conferencia do anuncio, nao liquidacao financeira. Sem DY inferido.",
            "events":events,"reviews":sorted(reviews,key=lambda r:tuple(r["identity"]))}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--reviews",type=Path,required=True)
    parser.add_argument("--history",type=Path,default=HISTORY)
    parser.add_argument("--catalog",type=Path,default=CATALOG)
    parser.add_argument("--output",type=Path,default=OUT)
    args=parser.parse_args()
    if not args.reviews.is_file():
        parser.error("Planilha de revisao nao encontrada; nenhuma aprovacao automatica.")
    previous=json.loads(args.output.read_text(encoding="utf-8")) if args.output.exists() else None
    result=review(json.loads(args.history.read_text(encoding="utf-8")),
                  json.loads(args.catalog.read_text(encoding="utf-8")),
                  args.reviews.read_text(encoding="utf-8-sig"),previous)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    tmp=args.output.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(args.output)
    print(result["coverage"])

if __name__=="__main__":
    main()

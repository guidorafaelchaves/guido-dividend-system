import unittest
from datetime import date
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from review_fii_distributions import review

class HumanReviewTests(unittest.TestCase):
    def setUp(self):
        self.catalog={"dataType":"fii-ticker-cnpj-catalog",
                      "records":[{"ticker":"MXRF11","cnpj":"97521225000125"}]}
        self.src={"ticker":"MXRF11","cnpj":"97521225000125","kind":"RENDIMENTO",
                  "exDate":"2026-10-15","paymentDate":"2026-10-25",
                  "amountDecimal":"0.10","sourceDocumentId":"DOC-1001",
                  "sourceUrl":"https://example.org/doc/1001",
                  "verificationStatus":"document-linked-unverified-content"}
        self.history={"schemaVersion":1,"dataType":"fii-document-linked-distributions",
                      "rightsConfirmed":True,"records":[self.src]}
        self.header="ticker,cnpj,kind,ex_date,payment_date,amount_decimal,source_document_id,decision,reviewer,reviewed_at,evidence_note\n"
        self.row="MXRF11,97521225000125,RENDIMENTO,2026-10-15,2026-10-25,0.10,DOC-1001,APPROVED,Revisor de Testes,2026-11-09,Documento original conferido manualmente\n"

    def test_no_approval_without_review(self):
        r=review(self.history,self.catalog,self.header)
        self.assertEqual(r["events"],[])

    def test_approved_event_keeps_source_and_no_settlement_claim(self):
        r=review(self.history,self.catalog,self.header+self.row)
        self.assertEqual(len(r["events"]),1)
        evt=r["events"][0]
        self.assertEqual(evt["status"],"confirmed-document")
        self.assertFalse(evt["paymentSettlementVerified"])
        self.assertEqual(evt["sourceDocumentId"],"DOC-1001")
        self.assertEqual(evt["amountDecimal"],"0.10")

    def test_rejection_and_cancellation_tombstone(self):
        approved=review(self.history,self.catalog,self.header+self.row)
        rejected=review(self.history,self.catalog,self.header+self.row.replace("APPROVED","CANCELLED"),approved)
        self.assertEqual(rejected["events"],[])
        self.assertEqual(rejected["coverage"]["cancelled"],1)
        with self.assertRaises(ValueError):
            review(self.history,self.catalog,self.header+self.row,rejected)

    def test_rejects_identity_mismatch_without_partial_publication(self):
        with self.assertRaises(ValueError):
            review(self.history,self.catalog,self.header+self.row.replace("0.10","0.15"))
        with self.assertRaises(ValueError):
            review(self.history,self.catalog,self.header+self.row.replace("97521225000125","00000000000000"))

    def test_approval_revoked_if_document_disappears(self):
        approved=review(self.history,self.catalog,self.header+self.row)
        disappeared={**self.history,"records":[]}
        result=review(disappeared,self.catalog,self.header,approved)
        self.assertEqual(result["events"],[])

    def test_no_automatic_reapproval_after_rejection(self):
        rejected=review(self.history,self.catalog,self.header+self.row.replace("APPROVED","REJECTED"))
        with self.assertRaises(ValueError):
            review(self.history,self.catalog,self.header+self.row,rejected)

if __name__=="__main__":
    unittest.main()

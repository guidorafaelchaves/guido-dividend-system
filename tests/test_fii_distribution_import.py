import unittest
from datetime import date
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from import_fii_distributions import normalize

class DistributionImportTests(unittest.TestCase):
    def setUp(self):
        self.catalog={"dataType":"fii-ticker-cnpj-catalog","records":[
            {"ticker":"MXRF11","cnpj":"97521225000125"},
            {"ticker":"HGLG11","cnpj":"11728688000147"}]}
        self.header="ticker,cnpj,kind,ex_date,payment_date,amount_per_unit,announcement_date,source_document_id,source_url\n"
        self.row="MXRF11,97521225000125,RENDIMENTO,2026-10-15,2026-10-25,0.10,2026-10-10,DOC-1001,https://example.org/doc/1001\n"

    def run_import(self, rows, rights=True):
        return normalize(self.catalog,self.header+rows,"Fixture autorizada",rights,date(2026,11,10))

    def test_keeps_rendimentos_separate_from_amortizacao(self):
        rows=self.row+self.row.replace("RENDIMENTO","AMORTIZACAO").replace("DOC-1001","DOC-1002").replace("/1001","/1002")
        result=self.run_import(rows)
        self.assertEqual(result["coverage"]["accepted"],2)
        self.assertEqual({r["kind"] for r in result["records"]},{"RENDIMENTO","AMORTIZACAO"})
        self.assertEqual({r["verificationStatus"] for r in result["records"]},{"document-linked-unverified-content"})

    def test_deduplicates_exact_and_quarantines_conflict(self):
        self.assertEqual(self.run_import(self.row+self.row)["coverage"]["accepted"],1)
        changed=self.row.replace("DOC-1001","DOC-1003").replace("/1001","/1003")
        out=self.run_import(self.row+changed)
        self.assertEqual(out["coverage"]["accepted"],0)
        self.assertEqual(out["coverage"]["conflictingEconomicEvents"],1)

    def test_rejects_mismatch_future_bad_urls_and_wrong_dates(self):
        mismatched=self.row.replace("97521225000125","00000000000000")
        future=self.row.replace("2026-10-10","2027-10-10")
        badurl=self.row.replace("https://example.org/doc/1001","http://example.org/doc/1001")
        chronology=self.row.replace("2026-10-25","2026-10-12")
        result=self.run_import(mismatched+future+badurl+chronology)
        self.assertEqual(result["coverage"]["accepted"],0)
        self.assertEqual(sum(result["coverage"]["rejectedByReason"].values()),4)

    def test_bars_inference_from_accounting_and_missing_docs(self):
        wrong_kind=self.row.replace("RENDIMENTO","VPA")
        no_doc=self.row.replace("DOC-1001","")
        self.assertEqual(self.run_import(wrong_kind+no_doc)["coverage"]["accepted"],0)

    def test_requires_rights(self):
        with self.assertRaises(PermissionError):
            self.run_import(self.row,False)

if __name__=="__main__":
    unittest.main()

import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from reconcile_b3_instruments import reconcile, isin_valid

def test_isin(base="BRMXRFCTF00"):
    # 11-character alphanumeric base; compute ISO 6166 check digit.
    for digit in "0123456789":
        candidate = base + digit
        if isin_valid(candidate):
            return candidate
    raise AssertionError("ISIN test generator failed")

class ReconciliationTests(unittest.TestCase):
    def setUp(self):
        self.isin = test_isin()
        self.catalog = {"dataType":"fii-ticker-cnpj-catalog","records":[
            {"ticker":"MXRF11","cnpj":"11222333000181","assetClass":"FII_CANDIDATE"},
            {"ticker":"SNAG11","cnpj":"11222333000181","assetClass":"FIAGRO"},
            {"ticker":"HGLG11","cnpj":"11222333000181","assetClass":"FII_CANDIDATE"},
        ]}

    def reconcile(self, body):
        return reconcile(self.catalog,
            "ticker,isin,instrument_type,trading_status\n" + body,
            "2026-11-09","Arquivo autorizado de teste",True)

    def test_does_not_autoverify_absent_instruments(self):
        data = self.reconcile(f"MXRF11,{self.isin},FII,ACTIVE\n")
        by_ticker = {x["ticker"]:x for x in data["records"]}
        self.assertEqual(by_ticker["MXRF11"]["verificationStatus"],"observed-active")
        self.assertEqual(by_ticker["HGLG11"]["verificationStatus"],"unverified")
        self.assertEqual(by_ticker["SNAG11"]["verificationStatus"],"unverified")

    def test_prevents_type_conflict(self):
        data = self.reconcile(f"SNAG11,{self.isin},FII,ACTIVE\n")
        self.assertEqual(data["records"][1]["verificationStatus"],"class-conflict")

    def test_rejects_malformed_and_conflicting_rows(self):
        data = self.reconcile(f"MXRF11,{self.isin},FII,ACTIVE\nMXRF11,{self.isin},FII,INACTIVE\n")
        self.assertEqual(data["records"][0]["verificationStatus"],"ambiguous")
        data = self.reconcile("MXRF11,BAD,FII,ACTIVE\n")
        self.assertEqual(data["records"][0]["verificationStatus"],"ambiguous")

    def test_rights_guard(self):
        with self.assertRaises(PermissionError):
            reconcile(self.catalog, "ticker,isin,instrument_type,trading_status\n",
                      "2026-11-09", "Fonte", False)

    def test_invalid_isin(self):
        self.assertFalse(isin_valid("BRINVALID000"))
        self.assertTrue(isin_valid(self.isin))

if __name__ == "__main__":
    unittest.main()

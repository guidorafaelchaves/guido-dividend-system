import tempfile
import unittest
import zipfile
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from refresh_cvm_fii import extract, canonical_cnpj, numeric, official_resource

class MonthlyFiiTests(unittest.TestCase):
    def test_parse_and_restatements(self):
        csv_text = ("CNPJ_FUNDO;DT_COMPTC;VL_PATRIM_LIQ;QT_COTAS;NR_COTST\n"
                    "12.345.678/0001-90;2026-05-31;1250,50;100;25\n"
                    "12.345.678/0001-90;2026-06-30;1300,00;100;30\n"
                    "12.345.678/0001-90;2026-06-30;1400,00;100;31\n"
                    "12.345.678/0001-90;2027-01-31;1500,00;100;35\n")
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"test.zip"
            with zipfile.ZipFile(path,"w") as z:
                z.writestr("inf_mensal_fii_geral_2026.csv",csv_text.encode("latin-1"))
            records,files,rows=extract(path,2026)
        self.assertEqual(files,1)
        self.assertEqual(rows,3)
        self.assertEqual(records[0]["referenceDate"],"2026-06-30")
        self.assertEqual(records[0]["netAssets"],1300)
        self.assertEqual(records[0]["navCalculated"],13)
        self.assertNotIn("ticker",records[0])

    def test_source_validation(self):
        catalog={"datasets":[{"id":"fii-doc-inf_mensal","resources":[{"url":"https://evil.example/inf_mensal_fii_2026.zip"}]}]}
        with self.assertRaises(ValueError):
            official_resource(catalog,2026)

    def test_numeric(self):
        self.assertEqual(numeric("1.234,56"),1234.56)
        self.assertIsNone(numeric("n/a"))
        self.assertIsNone(canonical_cnpj("invalid"))

if __name__=="__main__":
    unittest.main()

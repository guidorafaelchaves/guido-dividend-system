import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from map_cvm_fii_tickers import normalize_cnpj, mapping

class MappingTests(unittest.TestCase):
    def test_cnpj(self):
        self.assertIsNone(normalize_cnpj("00.000.000/0000-00"))
        self.assertIsNone(normalize_cnpj("12.345.678/0001-90"))
        self.assertEqual(normalize_cnpj("11.222.333/0001-81"),"11222333000181")

    def test_join_without_guessing(self):
        cnpj="11222333000181"
        csv_text=("ticker,cnpj,classe\n"
                  f"ABCD11,{cnpj},fii\n"
                  "XYZW11,00000000000000,fii\n"
                  f"ACAO3,{cnpj},acao\n")
        result,coverage=mapping(csv_text,[{"cnpj":cnpj,"referenceDate":"2026-09-01","netAssets":1200.0}])
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["ticker"],"ABCD11")
        self.assertNotIn("price",result[0])
        self.assertNotIn("dividendYield",result[0])

    def test_ambiguous_identity_is_excluded(self):
        cnpj="11222333000181"
        csv_text=("ticker,cnpj,classe\n"
                  f"ABCD11,{cnpj},fii\n"
                  f"EFGH11,{cnpj},fii\n")
        result,coverage=mapping(csv_text,[{"cnpj":cnpj,"referenceDate":"2026-09-01","netAssets":1200.0}])
        self.assertEqual(result,[])
        self.assertEqual(coverage["ambiguousCnpjs"],1)

if __name__=="__main__":
    unittest.main()

import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from map_cvm_fii_tickers import universe

class UniverseTests(unittest.TestCase):
    def test_independent_of_accounting_snapshot(self):
        cnpj="11222333000181"
        result=universe("ticker,cnpj,classe\nABCD11,"+cnpj+",fii\nACAO3,"+cnpj+",acao\n")
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["ticker"],"ABCD11")
        self.assertNotIn("price",result[0])
        self.assertNotIn("navCalculated",result[0])
        self.assertEqual(result[0]["assetClass"],"FII_CANDIDATE")

    def test_fiagro_is_not_mislabeled_fii(self):
        result=universe("ticker,cnpj,classe,nome,setor\\nABCD11,11222333000181,fii,FUNDO FIAGRO IMOBILIARIO,Outros\\n")
        self.assertEqual(result[0]["assetClass"],"FIAGRO")

    def test_conflicting_ticker_identity_is_quarantined(self):
        result=universe("ticker,cnpj,classe\nABCD11,11222333000181,fii\nABCD11,00000000000000,fii\n")
        self.assertEqual(len(result),1) # CNPJ invalido nao substitui registro valido

if __name__=="__main__":
    unittest.main()

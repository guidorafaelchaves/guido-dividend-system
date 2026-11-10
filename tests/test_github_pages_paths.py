import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from fix_github_pages_paths import transform

class PagesPathTests(unittest.TestCase):
    def test_html_root_assets_and_navigation(self):
        html='<link rel="stylesheet" href="/platform/portal.css"><a href="/">Inicio</a><a href="/ativos/?ticker=MXRF11">FII</a>'
        result=transform(Path('docs/ativos/index.html'),html)
        self.assertIn('href="/guido-dividend-system/platform/portal.css"',result)
        self.assertIn('href="/guido-dividend-system/"',result)
        self.assertIn('href="/guido-dividend-system/ativos/?ticker=MXRF11"',result)
        self.assertEqual(result,transform(Path('docs/index.html'),result))

    def test_js_only_urls_not_path_checks(self):
        original="""fetch('/data/fii-universe.json'); window.location.href='/ativos/?ticker=MXRF11'; if(path.includes('/ativos/')){}"""
        result=transform(Path('docs/platform/portal.js'),original)
        self.assertIn("fetch('/guido-dividend-system/data/fii-universe.json')",result)
        self.assertIn("href='/guido-dividend-system/ativos/?ticker=MXRF11'",result)
        self.assertIn("path.includes('/guido-dividend-system/ativos/')",result)
        self.assertEqual(transform(Path('docs/platform/portal.js'),result),result)

    def test_no_external_or_wrong_prefix_rewrites(self):
        text='<a href="https://www.gov.br">CVM</a><script src="//cdn.example.org/a.js"></script>'
        self.assertEqual(transform(Path('docs/index.html'),text),text)

if __name__=='__main__':
    unittest.main()

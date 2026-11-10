#!/usr/bin/env python3
"""Rebase GitHub Pages URLs for a repository hosted under /guido-dividend-system/."""
import argparse
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"
PREFIX="/guido-dividend-system"
ROOT_PATHS=("platform","data","ativos","calendario","mapa-da-renda",
"metodologia","sobre","sistema","admin","meu-painel","cadastro",
"entrar","favoritos","watchlist","minha-agenda","notificacoes",
"carteiras","conta","dashboard.html","admin.html","authService.js",
"configManager.js","memory-client.js","saasGatewayClient.js")
GROUP="|".join(re.escape(x) for x in ROOT_PATHS)
HTML_RE=re.compile(r"""(?P<attr>(?:href|src|action|poster)=["'])/(?P<path>(?:"""+GROUP+r""")(?=[/?"']))""")
HOME_RE=re.compile(r"""(?P<attr>href=["'])/(?P<end>["'])""")
JS_RE=re.compile(r"""(?P<quote>["'\x60])/(?P<path>(?:"""+GROUP+r""")(?=[/?'\x60"]))""")
CSS_RE=re.compile(r"""(?P<open>url\(["']?)/(?P<path>(?:"""+GROUP+r""")(?=[/?"']))""")

def transform(path,text):
    if path.suffix==".html":
        text=HTML_RE.sub(lambda m:m.group("attr")+PREFIX+"/"+m.group("path"),text)
        return HOME_RE.sub(lambda m:m.group("attr")+PREFIX+"/"+m.group("end"),text)
    if path.suffix==".js":
        return JS_RE.sub(lambda m:m.group("quote")+PREFIX+"/"+m.group("path"),text)
    if path.suffix==".css":
        return CSS_RE.sub(lambda m:m.group("open")+PREFIX+"/"+m.group("path"),text)
    return text

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()
    changed=[]
    for path in sorted(DOCS.rglob("*")):
        if path.suffix not in (".html",".js",".css") or not path.is_file():
            continue
        original=path.read_text(encoding="utf-8")
        corrected=transform(path,original)
        if corrected!=original:
            changed.append(str(path.relative_to(ROOT)))
            if not args.check:
                path.write_text(corrected,encoding="utf-8")
    print(("Paths needing prefix:" if args.check else "Paths corrected:"),len(changed))
    if changed:
        print(", ".join(changed))
    if args.check and changed:
        raise SystemExit(1)

if __name__=="__main__":
    main()

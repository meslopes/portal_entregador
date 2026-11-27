# -*- coding: utf-8 -*-
"""Varre chaves de storage nos arquivos do frontend (diagnóstico)."""
import glob

for a in glob.glob(r"portal-frontend\src\**\*.*", recursive=True):
    if not a.endswith((".js", ".jsx")):
        continue
    with open(a, encoding="utf-8", errors="replace") as f:
        for i, linha in enumerate(f, 1):
            if "Storage." in linha and ("Item(" in linha):
                nome = a.split("\\")[-1]
                print(f"{nome}:{i}  {linha.strip()[:120]}")

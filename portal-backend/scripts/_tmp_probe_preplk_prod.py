# -*- coding: utf-8 -*-
"""Sonda SOMENTE-LEITURA: prep_time_locked no ar em produção (2026-11-27)."""
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("MUV_API", "https://muvlog-api-890250693883.us-central1.run.app")


def req(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    mem = glob.glob(r"C:\Users\Dell\.local\share\mimocode\memory\projects\*\MEMORY.md")
    mem.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    pw = re.search(r"Mauro\d+", open(mem[0], encoding="utf-8").read()).group(0)
    s, login = req("POST", "/api/auth/login", {"email": "meslopes@gmail.com", "password": pw})
    tok = login.get("access_token")
    print("login super admin:", "OK" if tok else f"FALHOU {s}")

    s, r = req("GET", "/api/admin/establishments?per_page=1", token=tok)
    lista = r.get("establishments") or r.get("items") or []
    if lista:
        est = lista[0]
        print("estabelecimento:", "prep_time_locked" in est,
              "| preparation_minutes =", est.get("preparation_minutes"),
              "| locked =", est.get("prep_time_locked"))
    else:
        print("sem estabelecimentos para inspecionar s=", s)

    s, r = req("GET", "/api/route-settings/", token=tok)
    st = r.get("settings") or {}
    print("route-settings min_reroute_interval_min =", st.get("min_reroute_interval_min"))
    print("PASS" if lista and "prep_time_locked" in lista[0] else "FAIL")


if __name__ == "__main__":
    main()

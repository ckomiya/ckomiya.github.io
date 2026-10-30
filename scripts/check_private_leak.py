#!/usr/bin/env python3
"""Salvaguarda: falla si algún repo privado aparece en los archivos de datos que se van a commitear.

Uso: python scripts/check_private_leak.py data/data.json data/cache.json
Token: GH_STATS_TOKEN (o GH_TOKEN). Solo imprime CUÁNTAS coincidencias hubo, nunca los nombres,
para no exponerlos en el log del workflow. Si no puede verificar (red, token), también falla.
"""
import json
import os
import sys
import urllib.request

TOKEN = os.environ.get("GH_STATS_TOKEN") or os.environ.get("GH_TOKEN")
LOGIN = os.environ.get("GH_LOGIN", "ckomiya")


def private_repos():
    out, page = [], 1
    while True:
        req = urllib.request.Request(
            f"https://api.github.com/user/repos?per_page=100&page={page}&visibility=private&affiliation=owner,collaborator,organization_member",
            headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ckomiya-github-dashboard"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            chunk = json.load(resp)
        out.extend((r["name"], r["full_name"]) for r in chunk if r.get("private"))
        if len(chunk) < 100:
            return out
        page += 1


def strings(node):
    """Todas las cadenas del JSON: claves y valores."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield k
            yield from strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings(v)
    elif isinstance(node, str):
        yield node


def main(paths):
    if not TOKEN:
        sys.exit("Falta GH_STATS_TOKEN (o GH_TOKEN): no se puede verificar.")
    try:
        repos = private_repos()
    except Exception as e:  # sin la lista no se puede garantizar nada: se falla cerrado
        sys.exit(f"No se pudo obtener la lista de repos privados ({type(e).__name__}); se cancela por seguridad.")
    names = {n.lower() for n, _ in repos}
    fulls = {f.lower() for _, f in repos}
    hits = 0
    for path in paths:
        try:
            data = json.load(open(path, encoding="utf-8"))
        except FileNotFoundError:
            continue
        found = set()
        for s in strings(data):
            low = s.lower()
            # Coincidencia exacta con el nombre, o con "owner/nombre", o un segmento de ruta de URL igual al nombre.
            if low in names or low in fulls or any(f in low for f in fulls) or any(seg in names for seg in low.split("/")):
                found.add(low)
        hits += len(found)
    print(f"Repos privados verificados: {len(repos)}. Coincidencias en los datos: {hits}.")
    if hits:
        sys.exit("ERROR: hay datos de repos privados en los archivos a commitear; no se hace commit.")


if __name__ == "__main__":
    main(sys.argv[1:] or ["data/data.json", "data/cache.json"])

#!/usr/bin/env python3
"""Consulta la API de GitHub (REST + GraphQL) y genera data/data.json.

Solo usa la biblioteca estándar. Token: variable GH_STATS_TOKEN (o GH_TOKEN).

Garantías:
- Si falla una parte crítica (repos, calendario), NO se toca data.json.
- Si falla el tráfico de un repo, se conserva su histórico anterior.
- De los repos privados solo se guardan totales agregados (un número).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

LOGIN = os.environ.get("GH_LOGIN", "ckomiya")
TOKEN = os.environ.get("GH_STATS_TOKEN") or os.environ.get("GH_TOKEN")
OUT = Path(__file__).resolve().parent.parent / "data" / "data.json"
API = "https://api.github.com"
ACTIVE_DAYS = 30

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("America/Lima")
except Exception:  # sin tzdata (p. ej. Windows): Lima es UTC-5 todo el año
    TZ = timezone(timedelta(hours=-5), "America/Lima")

NOW = datetime.now(timezone.utc)
TODAY = NOW.astimezone(TZ).date()


class ApiError(Exception):
    pass


def request(method, url, body=None, retries=4):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ckomiya-github-dashboard",
    }
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp), resp.headers
        except urllib.error.HTTPError as e:
            h = e.headers
            if e.code in (403, 429) and (h.get("Retry-After") or h.get("X-RateLimit-Remaining") == "0"):
                wait = int(h.get("Retry-After") or max(0, int(h.get("X-RateLimit-Reset", 0)) - time.time()) + 2)
                if wait > 120:
                    raise ApiError(f"Límite de rate alcanzado; reinicia en {wait}s") from e
                print(f"  rate limit, esperando {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if e.code >= 500 and attempt < retries - 1:
                time.sleep(2 ** attempt * 2)
                continue
            raise ApiError(f"HTTP {e.code} en {method} {url}") from e
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 2)
                continue
            raise ApiError(f"Red: {e}") from e
    raise ApiError(f"Reintentos agotados: {url}")


def rest(path, params=""):
    return request("GET", f"{API}{path}{params}")[0]


def rest_paged(path, params=""):
    out, page = [], 1
    while True:
        chunk = rest(path, f"?per_page=100&page={page}{params}")
        out.extend(chunk)
        if len(chunk) < 100:
            return out
        page += 1


def graphql(query, variables):
    res, _ = request("POST", f"{API}/graphql", {"query": query, "variables": variables})
    if res.get("errors"):
        raise ApiError(f"GraphQL: {res['errors'][0].get('message')}")
    return res["data"]


GQL = """
query($login: String!, $ytd: DateTime!) {
  user(login: $login) {
    name
    cal: contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
    ytd: contributionsCollection(from: $ytd) {
      totalCommitContributions
    }
  }
}
"""


def load_previous():
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def week_start(d):
    return d - timedelta(days=d.weekday())


def streak(calendar):
    counts = dict(calendar)
    d, n = TODAY, 0
    if not counts.get(d.isoformat()):  # hoy aún sin actividad no corta la racha
        d -= timedelta(days=1)
    while counts.get(d.isoformat()):
        n += 1
        d -= timedelta(days=1)
    return n


def count_private_commits(all_repos, since, prev, warnings):
    """Suma (solo un número) mis commits en repos privados desde `since`.

    GraphQL no sirve: omite lo privado si el perfil no tiene activada la opción
    "Include private contributions". Nunca se imprime ni se guarda un nombre.
    """
    total = 0
    for r in all_repos:
        if not r["private"] or r["owner"]["login"].lower() != LOGIN.lower():
            continue
        if (r.get("pushed_at") or "") < since:
            continue
        try:
            total += len(rest_paged(f"/repos/{r['full_name']}/commits", f"&author={LOGIN}&since={since}"))
        except ApiError as e:
            if "409" in str(e):  # repo vacío
                continue
            warnings.append("commits privados: falló un repo; se conserva el total anterior")
            return prev.get("kpis", {}).get("private_commits_year", 0)
    return total


def main():
    if not TOKEN:
        sys.exit("Falta GH_STATS_TOKEN (o GH_TOKEN).")
    prev = load_previous()

    # --- Crítico: calendario y totales agregados (incluye actividad privada solo como número)
    ytd_from = datetime(TODAY.year, 1, 1, tzinfo=TZ).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    gq = graphql(GQL, {"login": LOGIN, "ytd": ytd_from})["user"]
    calendar = [[d["date"], d["contributionCount"]]
                for w in gq["cal"]["contributionCalendar"]["weeks"] for d in w["contributionDays"]
                if d["date"] <= TODAY.isoformat()]
    commits_year = gq["ytd"]["totalCommitContributions"]

    # --- Crítico: repos públicos propios, sin forks
    all_repos = rest_paged("/user/repos", "&affiliation=owner&sort=pushed")
    repos = [r for r in all_repos if not r["private"] and not r["fork"] and r["owner"]["login"].lower() == LOGIN.lower()]

    warnings = []
    private_commits = count_private_commits(all_repos, ytd_from, prev, warnings)

    since = (NOW - timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%SZ")
    weekly, hourly = {}, {}
    commits_30d = 0
    out_repos, traffic = [], prev.get("traffic", {}).get("repos", {})
    active_cutoff = NOW - timedelta(days=ACTIVE_DAYS)

    for r in repos:
        name, full = r["name"], r["full_name"]
        print(f"- {name}", file=sys.stderr)
        last_commit = None
        try:
            c = rest(f"/repos/{full}/commits", "?per_page=1")
            if c:
                last_commit = c[0]["commit"]["committer"]["date"]
        except ApiError as e:
            if "409" not in str(e):  # 409 = repo vacío
                warnings.append(f"{name}: último commit ({e})")
                last_commit = next((p["last_commit"] for p in prev.get("repos", []) if p["name"] == name), None)

        if r.get("pushed_at") and r["pushed_at"] >= since:
            try:
                for c in rest_paged(f"/repos/{full}/commits", f"&author={LOGIN}&since={since}"):
                    dt = datetime.fromisoformat(c["commit"]["author"]["date"].replace("Z", "+00:00")).astimezone(TZ)
                    ws = week_start(dt.date()).isoformat()
                    weekly[ws] = weekly.get(ws, 0) + 1
                    key = (dt.weekday(), dt.hour)
                    hourly[key] = hourly.get(key, 0) + 1
                    if dt.astimezone(timezone.utc) >= active_cutoff:
                        commits_30d += 1
            except ApiError as e:
                raise ApiError(f"Commits de {name}: {e}") from e  # sin esto las métricas quedarían sesgadas

        # --- Tráfico: acumulado diario, sin duplicar días (la fecha es la clave)
        hist = traffic.setdefault(name, {"views": {}, "clones": {}})
        for kind in ("views", "clones"):
            try:
                res = rest(f"/repos/{full}/traffic/{kind}")
                for p in res.get(kind, []):
                    hist[kind][p["timestamp"][:10]] = {"c": p["count"], "u": p["uniques"]}
            except ApiError as e:
                warnings.append(f"{name}: tráfico {kind} ({e})")

        status = "archivado" if r["archived"] else (
            "activo" if last_commit and datetime.fromisoformat(last_commit.replace("Z", "+00:00")) >= active_cutoff
            else "pausado")
        cutoff14 = (TODAY - timedelta(days=13)).isoformat()
        out_repos.append({
            "name": name,
            "description": r.get("description") or "",
            "url": r["html_url"],
            "homepage": r.get("homepage") or "",
            "language": r.get("language") or "",
            "stars": r["stargazers_count"],
            "open_issues": r["open_issues_count"],
            "archived": r["archived"],
            "status": status,
            "last_commit": last_commit,
            "views_14d": sum(v["c"] for d, v in hist["views"].items() if d >= cutoff14),
            "clones_14d": sum(v["c"] for d, v in hist["clones"].items() if d >= cutoff14),
        })

    # Conserva histórico solo de repos públicos actuales (si uno pasa a privado, se descarta)
    traffic = {k: v for k, v in traffic.items() if k in {r["name"] for r in repos}}
    days = sorted({d for h in traffic.values() for k in ("views", "clones") for d in h[k]})
    total = [{"date": d,
              "views": sum(h["views"].get(d, {}).get("c", 0) for h in traffic.values()),
              "clones": sum(h["clones"].get(d, {}).get("c", 0) for h in traffic.values())} for d in days]

    # semanas continuas (lunes) de los últimos 12 meses
    ws, weeks = week_start(TODAY - timedelta(days=364)), []
    while ws <= TODAY:
        weeks.append([ws.isoformat(), weekly.get(ws.isoformat(), 0)])
        ws += timedelta(days=7)

    out_repos.sort(key=lambda r: r["last_commit"] or "", reverse=True)
    data = {
        "generated_at": NOW.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "user": {"login": LOGIN, "name": gq.get("name") or LOGIN},
        "kpis": {
            "commits_30d": commits_30d,
            "commits_year": commits_year,
            "active_repos": sum(1 for r in out_repos if r["status"] == "activo"),
            "streak": streak(calendar),
            "public_repos": len(out_repos),
            "private_commits_year": private_commits,
        },
        "calendar": calendar,
        "weekly": weeks,
        "hourly": [[d, h, n] for (d, h), n in sorted(hourly.items())],
        "repos": out_repos,
        "traffic": {"repos": traffic, "total": total},
        "warnings": warnings,
    }
    OUT.parent.mkdir(exist_ok=True)
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(OUT)  # escritura atómica
    print(f"OK: {len(out_repos)} repos, {len(warnings)} avisos", file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except ApiError as e:
        sys.exit(f"ERROR: {e}. data.json no se modificó.")

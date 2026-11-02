#!/usr/bin/env python3
"""Consulta la API de GitHub (REST + GraphQL) y genera data/data.json.

Solo usa la biblioteca estándar. Token: variable GH_STATS_TOKEN (o GH_TOKEN).

Garantías:
- Si falla una parte crítica (repos, calendario), NO se toca data.json.
- Si falla el tráfico de un repo, se conserva su histórico anterior.
- De los repos privados solo se guardan totales agregados (un número).
"""
import bisect
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

LOGIN = os.environ.get("GH_LOGIN", "ckomiya")
TOKEN = os.environ.get("GH_STATS_TOKEN") or os.environ.get("GH_TOKEN")
OUT = Path(__file__).resolve().parent.parent / "data" / "data.json"
CACHE = OUT.with_name("cache.json")  # estado incremental: no lo lee la página
API = "https://api.github.com"
ACTIVE_DAYS = 30
SIZE_EDGES = [10, 50, 200, 1000]  # <10 · 10–49 · 50–199 · 200–999 · ≥1000 líneas
SIZE_LABELS = ["<10", "10–49", "50–199", "200–999", "≥1000"]
DETAIL_BUDGET = 1200   # commits a detallar por ejecución (1 petición c/u)
RATE_RESERVE = 800     # no gastar el último tramo del límite horario (5000)
STATS_ROUNDS = 5       # reintentos del 202 de code frequency

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("America/Lima")
except Exception:  # sin tzdata (p. ej. Windows): Lima es UTC-5 todo el año
    TZ = timezone(timedelta(hours=-5), "America/Lima")

NOW = datetime.now(timezone.utc)
TODAY = NOW.astimezone(TZ).date()


class ApiError(Exception):
    pass


STATE = {"requests": 0, "remaining": None}


def request(method, url, body=None, retries=4, with_status=False):
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
                STATE["requests"] += 1
                if resp.headers.get("X-RateLimit-Remaining"):
                    STATE["remaining"] = int(resp.headers["X-RateLimit-Remaining"])
                raw = resp.read()
                parsed = json.loads(raw) if raw.strip() else None  # 204 y 202 llegan sin cuerpo útil
                return (parsed, resp.headers, resp.status) if with_status else (parsed, resp.headers)
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
      restrictedContributionsCount
    }
  }
}
"""


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_previous():
    return load_json(OUT)


def write_json(path, obj):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)  # escritura atómica


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


# --- Commits históricos (incremental) y tamaño de commits ---------------------------

LOCKFILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json", "poetry.lock",
             "pipfile.lock", "composer.lock", "cargo.lock", "gemfile.lock", "go.sum", "uv.lock", "bun.lockb",
             "pubspec.lock", "mix.lock", "packages.lock.json"}
GENERATED_EXT = (".min.js", ".min.css", ".map", ".lock", ".csv", ".tsv", ".parquet", ".jsonl", ".ndjson",
                 ".xlsx", ".xls", ".sqlite", ".db", ".ipynb")
GENERATED_DIRS = ("node_modules/", "dist/", "build/", "vendor/", ".next/", "__pycache__/", "target/")


def is_generated(path):
    low = path.lower()
    base = low.rsplit("/", 1)[-1]
    if base in LOCKFILES or low.endswith(GENERATED_EXT):
        return True
    if low.startswith("data/") and low.endswith(".json"):  # data/data.json, data/cache.json…
        return True
    return low.startswith(GENERATED_DIRS) or any("/" + d in low for d in GENERATED_DIRS)


def new_commit_state():
    return {"cursor": None, "tail": [], "n": 0, "first": None, "last": None,
            "daily": {}, "hours": [0] * 24, "wd": [0] * 7, "sizes": [0] * 5, "pending": []}


def is_mine(c):
    """Commit cuyo autor (cuenta de GitHub) soy yo; excluye github-actions[bot] y cualquier otro bot.

    Un commit sin cuenta vinculada (author null) no se cuenta: no se puede atribuir a nadie.
    """
    a = c.get("author")
    return bool(a) and a.get("type") != "Bot" and (a.get("login") or "").lower() == LOGIN.lower()


def sync_commits(full, st):
    """Trae solo los commits míos posteriores al cursor y los suma al estado del repo.

    El cursor retrocede 2 días respecto al commit más nuevo y `tail` guarda los SHAs de esa
    ventana para no contar dos veces; así nunca se vuelve a pedir el historial antiguo.
    """
    params = f"&author={LOGIN}" + (f"&since={st['cursor']}" if st["cursor"] else "")
    try:
        found = rest_paged(f"/repos/{full}/commits", params)
    except ApiError as e:
        if "409" in str(e):  # repo vacío
            return
        raise
    known = set(st["tail"]) | set(st["pending"])
    fresh = [c for c in found if c["sha"] not in known and is_mine(c)]
    for c in fresh:
        dt = datetime.fromisoformat(c["commit"]["author"]["date"].replace("Z", "+00:00")).astimezone(TZ)
        st["n"] += 1
        st["daily"][dt.date().isoformat()] = st["daily"].get(dt.date().isoformat(), 0) + 1
        st["hours"][dt.hour] += 1
        st["wd"][dt.weekday()] += 1
        iso = dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        st["first"] = min(st["first"] or iso, iso)
        st["last"] = max(st["last"] or iso, iso)
        if len(c.get("parents", [])) < 2:  # los merges no miden trabajo real
            st["pending"].append(c["sha"])
    if found:
        newest = max(c["commit"]["committer"]["date"] for c in found)
        cursor = (datetime.fromisoformat(newest.replace("Z", "+00:00")) - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        st["cursor"] = max(st["cursor"] or cursor, cursor)
        st["tail"] = [c["sha"] for c in found if c["commit"]["committer"]["date"] >= st["cursor"]]


def size_commits(states, repo_names, warnings):
    """Mide líneas cambiadas (sin archivos generados) de los commits pendientes, con tope por ejecución."""
    done = errors = 0
    for name in repo_names:  # repos más recientes primero
        st = states[name]
        keep = []
        for i, sha in enumerate(st["pending"]):
            if done >= DETAIL_BUDGET or (STATE["remaining"] is not None and STATE["remaining"] < RATE_RESERVE) or errors >= 3:
                keep.extend(st["pending"][i:])
                break
            try:
                detail = rest(f"/repos/{st['full']}/commits/{sha}")
            except ApiError as e:
                if "HTTP 404" in str(e) or "HTTP 422" in str(e):  # commit ya inexistente (force-push)
                    continue
                errors += 1
                keep.append(sha)
                continue
            errors = 0
            done += 1
            lines = sum(f.get("changes", 0) for f in detail.get("files", []) if not is_generated(f["filename"]))
            if lines > 0:  # commit que solo toca archivos generados: no cuenta
                st["sizes"][bisect.bisect_right(SIZE_EDGES, lines)] += 1
        st["pending"] = keep
    left = sum(len(st["pending"]) for st in states.values())
    if left:
        warnings.append(f"tamaño de commits: {left} pendientes, se completan en próximas ejecuciones")
    return left


def fetch_code_frequency(repos, cf, warnings):
    """/stats/code_frequency responde 202 mientras GitHub calcula: reintenta con espera y,
    si no llega, conserva el dato anterior de ese repo."""
    pending = list(repos)
    for rnd in range(STATS_ROUNDS):
        still = []
        for r in pending:
            try:
                body, _, status = request("GET", f"{API}/repos/{r['full_name']}/stats/code_frequency", with_status=True)
            except ApiError as e:
                warnings.append(f"{r['name']}: líneas ({e})")
                continue
            if status == 202:
                still.append(r)
            else:
                cf[r["name"]] = [[w, a, abs(d)] for w, a, d in (body or []) if a or d]
        pending = still
        if not pending:
            return
        print(f"  code frequency: {len(pending)} repos calculándose (ronda {rnd + 1})", file=sys.stderr)
        time.sleep(10 * (rnd + 1))
    warnings.append(f"líneas: {len(pending)} repos sin calcular, se conserva el dato anterior")


def build_records(states):
    daily, hours, wd = {}, [0] * 24, [0] * 7
    for st in states.values():
        for d, n in st["daily"].items():
            daily[d] = daily.get(d, 0) + n
        hours = [a + b for a, b in zip(hours, st["hours"])]
        wd = [a + b for a, b in zip(wd, st["wd"])]
    total = sum(wd)
    if not total:
        return None
    best, run, prev_day = (0, None, None), 0, None
    for d in sorted(daily):
        cur = date.fromisoformat(d)
        run = run + 1 if prev_day and cur - prev_day == timedelta(days=1) else 1
        start = d if run == 1 else start
        if run > best[0]:
            best = (run, start, d)
        prev_day = cur
    top_day = max(daily.items(), key=lambda kv: (kv[1], kv[0]))
    weekend = wd[5] + wd[6]
    return {
        "total": total,
        "longest_streak": {"days": best[0], "start": best[1], "end": best[2]},
        "busiest_day": {"date": top_day[0], "count": top_day[1]},
        "top_hour": {"hour": hours.index(max(hours)), "count": max(hours)},
        "weekend_pct": round(100 * weekend / total),
    }


def last_private_day(days=30):
    """Último día con actividad en repos privados, solo la fecha (el token no ve esos repos).

    GraphQL da restrictedContributionsCount por rango sin revelar repos; se pide día por día
    (una sola consulta con alias) y se toma el más reciente con valor > 0. Cuenta contribuciones
    privadas (commits, PRs, reviews), no solo commits. Si falla, devuelve None.
    """
    try:
        ds = [TODAY - timedelta(days=i) for i in range(days)]
        def rng(d):
            ini = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
            return ini.strftime("%Y-%m-%dT%H:%M:%SZ"), (ini + timedelta(days=1) - timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        body = " ".join(f'd{i}: contributionsCollection(from: "{rng(d)[0]}", to: "{rng(d)[1]}") {{ restrictedContributionsCount }}'
                        for i, d in enumerate(ds))
        user = graphql("query($login: String!) { user(login: $login) { " + body + " } }", {"login": LOGIN})["user"]
        for i, d in enumerate(ds):
            if user[f"d{i}"]["restrictedContributionsCount"] > 0:
                return d.isoformat()
    except Exception as e:
        print(f"aviso: no se pudo obtener la actividad privada: {e}", file=sys.stderr)
    return None


def main():
    if not TOKEN:
        sys.exit("Falta GH_STATS_TOKEN (o GH_TOKEN).")
    prev = load_previous()
    cache = load_json(CACHE)
    states = cache.get("commits", {})
    code_freq = cache.get("code_freq", {})
    prev_langs = {p["name"]: p.get("languages", {}) for p in prev.get("repos", [])}

    # --- Crítico: calendario y totales agregados (incluye actividad privada solo como número)
    ytd_from = datetime(TODAY.year, 1, 1, tzinfo=TZ).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    gq = graphql(GQL, {"login": LOGIN, "ytd": ytd_from})["user"]
    calendar = [[d["date"], d["contributionCount"]]
                for w in gq["cal"]["contributionCalendar"]["weeks"] for d in w["contributionDays"]
                if d["date"] <= TODAY.isoformat()]
    commits_year = gq["ytd"]["totalCommitContributions"]
    # Contribuciones privadas del año: solo un número. GraphQL las agrega sin dar acceso a ningún repo
    # privado (sirve con un fine-grained token) y se suman a totalCommitContributions, que cuenta lo público.
    # Requiere "Include private contributions on my profile"; sin esa opción llega 0.
    private_commits = gq["ytd"]["restrictedContributionsCount"]

    # --- Crítico: repos públicos propios, sin forks
    all_repos = rest_paged("/user/repos", "&affiliation=owner&sort=pushed")
    repos = [r for r in all_repos if not r["private"] and not r["fork"] and r["owner"]["login"].lower() == LOGIN.lower()]

    warnings = []

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
            # Solo commits míos: los del bot (p. ej. el que actualiza data.json) no cuentan como actividad.
            c = [x for x in rest(f"/repos/{full}/commits", f"?per_page=30&author={LOGIN}") if is_mine(x)]
            if c:
                last_commit = c[0]["commit"]["committer"]["date"]
        except ApiError as e:
            if "409" not in str(e):  # 409 = repo vacío
                warnings.append(f"{name}: último commit ({e})")
                last_commit = next((p["last_commit"] for p in prev.get("repos", []) if p["name"] == name), None)

        if r.get("pushed_at") and r["pushed_at"] >= since:
            try:
                for c in rest_paged(f"/repos/{full}/commits", f"&author={LOGIN}&since={since}"):
                    if not is_mine(c):
                        continue
                    dt = datetime.fromisoformat(c["commit"]["author"]["date"].replace("Z", "+00:00")).astimezone(TZ)
                    ws = week_start(dt.date()).isoformat()
                    weekly[ws] = weekly.get(ws, 0) + 1
                    key = (dt.weekday(), dt.hour)
                    hourly[key] = hourly.get(key, 0) + 1
                    if dt.astimezone(timezone.utc) >= active_cutoff:
                        commits_30d += 1
            except ApiError as e:
                raise ApiError(f"Commits de {name}: {e}") from e  # sin esto las métricas quedarían sesgadas

        # --- Historial completo de mis commits (incremental) y lenguajes
        st = states.setdefault(name, new_commit_state())
        st["full"] = full
        try:
            sync_commits(full, st)
        except ApiError as e:
            warnings.append(f"{name}: historial de commits ({e}); se conserva lo anterior")
        try:
            languages = rest(f"/repos/{full}/languages") or {}
        except ApiError as e:
            warnings.append(f"{name}: lenguajes ({e})")
            languages = prev_langs.get(name, {})

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
        if name.lower() == LOGIN.lower():  # repo de perfil (solo README): sus commits cuentan, pero no es un proyecto
            continue
        out_repos.append({
            "name": name,
            "description": r.get("description") or "",
            "url": r["html_url"],
            "homepage": r.get("homepage") or "",
            "language": r.get("language") or "",
            "languages": languages,
            "created_at": r["created_at"],
            "commits": st["n"],
            "stars": r["stargazers_count"],
            "open_issues": r["open_issues_count"],
            "archived": r["archived"],
            "status": status,
            "last_commit": last_commit,
            "views_14d": sum(v["c"] for d, v in hist["views"].items() if d >= cutoff14),
            "clones_14d": sum(v["c"] for d, v in hist["clones"].items() if d >= cutoff14),
        })

    # Solo repos públicos actuales (si uno pasa a privado o se borra, su estado se descarta)
    current = [r["name"] for r in repos]
    states = {k: v for k, v in states.items() if k in current}
    commits_left = size_commits(states, current, warnings)
    fetch_code_frequency(repos, code_freq, warnings)
    code_freq = {k: v for k, v in code_freq.items() if k in current}
    cutoff_ts = (NOW - timedelta(days=365)).timestamp()
    lines = {}
    for rows in code_freq.values():
        for w, a, d in rows:
            if w >= cutoff_ts:
                x = lines.setdefault(w, [0, 0])
                x[0] += a
                x[1] += d
    lines_weekly = [[datetime.fromtimestamp(w, timezone.utc).date().isoformat(), a, d] for w, (a, d) in sorted(lines.items())]

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
    # Repo del último commit mío (sin bots); out_repos ya viene ordenado por last_commit.
    latest = next((r for r in out_repos if r["last_commit"]), None)
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
        "ultima_actividad_privada": last_private_day(),
        "ultimo_repo_activo": {"name": latest["name"], "fecha": latest["last_commit"], "url": latest["url"]} if latest else None,
        "calendar": calendar,
        "weekly": weeks,
        "hourly": [[d, h, n] for (d, h), n in sorted(hourly.items())],
        "repos": out_repos,
        "traffic": {"repos": traffic, "total": total},
        "records": build_records(states),
        "lines_weekly": lines_weekly,
        "commit_sizes": {"labels": SIZE_LABELS, "counts": [sum(st["sizes"][i] for st in states.values()) for i in range(5)],
                         "pending": commits_left},
        "warnings": warnings,
    }
    OUT.parent.mkdir(exist_ok=True)
    write_json(CACHE, {"commits": states, "code_freq": code_freq})
    write_json(OUT, data)
    print(f"OK: {len(out_repos)} repos, {len(warnings)} avisos, {STATE['requests']} peticiones, "
          f"límite restante {STATE['remaining']}", file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except ApiError as e:
        sys.exit(f"ERROR: {e}. data.json no se modificó.")

#!/usr/bin/env python3
"""Baixa escudos atuais da API e alinha nomes (ex.: ursinho → Data CFC)."""
from __future__ import annotations

import json
import math
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIELDS = ROOT / "client" / "public" / "shields"
CAL_PATH = ROOT / "server" / "calendario_2026.json"
ENGINE = ROOT / "server" / "lfg_engine.js"
OUT = ROOT / "client" / "public" / "data"
RECON = ROOT / "scripts" / "reconsolidar_rodada.py"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://cartolafc.globo.com/",
}

# ID -> nome atual no projeto (antes da atualização)
TEAM_IDS_OLD = {
    "ursinho pó ffc": 44801122,
    "CL11 FC": 13954852,
    "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202,
    "C.E. Olhodaguense": 500739,
    "Pepethinaikos": 131897,
    "jakte FC": 2731370,
    "BOTTONS CASCAVEL": 19989513,
    "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408,
    "S.E. BURROW LSU": 17898941,
    "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579,
    "Ronaldito": 6714,
    "Caximbobol FC": 44568116,
    "Everbary": 2184134,
    "Coringudo da Zn": 51044546,
    "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132,
    "Realdonatello": 50612459,
}


def get_json(url: str):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = s.replace("/", "_").replace(".", "").replace(" ", "_")
    s = re.sub(r"_+", "_", s)
    # remove acentos simples
    trans = str.maketrans("áàâãäéèêëíìîïóòôõöúùûüçñ", "aaaaaeeeeiiiiooooouuuucn")
    s = s.translate(trans)
    return re.sub(r"[^a-z0-9_]", "", s)


def pick_ext(url: str, content: bytes) -> str:
    head = content[:200].lstrip()
    if head.startswith(b"<svg") or b"<svg" in head[:100] or ".svg" in url:
        return ".svg"
    if content.startswith(b"\x89PNG") or ".png" in url:
        return ".png"
    return ".png"


def main():
    SHIELDS.mkdir(parents=True, exist_ok=True)
    rename_map = {}  # old_name -> new_name
    team_config = {}  # new_name -> {escudo}
    team_ids = {}  # new_name -> id

    print("Baixando escudos e nomes da API...\n")
    for old_name, tid in TEAM_IDS_OLD.items():
        data = get_json(f"https://api.cartola.globo.com/time/id/{tid}")
        time = data.get("time") or data
        new_name = time.get("nome") or old_name
        url = time.get("url_escudo_svg") or time.get("url_escudo_png")
        if not url:
            print(f"SEM ESCUDO: {old_name} ({tid})")
            continue

        content = download(url)
        ext = pick_ext(url, content)
        filename = f"{slugify(new_name)}{ext}"
        path = SHIELDS / filename
        path.write_bytes(content)

        escudo_path = f"/shields/{filename}"
        rename_map[old_name] = new_name
        team_config[new_name] = {"escudo": escudo_path}
        team_ids[new_name] = tid

        flag = "RENOMEADO" if new_name != old_name else "ok"
        print(f"[{flag}] {old_name!r} -> {new_name!r} | {filename} ({len(content)} bytes)")

    # Atualiza calendario
    cal = json.loads(CAL_PATH.read_text(encoding="utf-8"))
    changed_games = 0
    for rodada, jogos in cal.items():
        for j in jogos:
            for key in ("casa", "visitante"):
                old = j.get(key)
                if old in rename_map and rename_map[old] != old:
                    j[key] = rename_map[old]
                    changed_games += 1
    CAL_PATH.write_text(json.dumps(cal, ensure_ascii=False, indent=4), encoding="utf-8")
    print(f"\nCalendario: {changed_games} campos de nome atualizados.")

    # Reescreve TEAM_CONFIG / TEAM_IDS no engine
    cfg_lines = ["const TEAM_CONFIG = {"]
    for name, cfg in team_config.items():
        cfg_lines.append(f"    {json.dumps(name, ensure_ascii=False)}: {{ escudo: {json.dumps(cfg['escudo'])} }},")
    cfg_lines.append("};")

    ids_lines = ["const TEAM_IDS = {"]
    # compact like before but readable
    items = list(team_ids.items())
    for i in range(0, len(items), 3):
        chunk = items[i : i + 3]
        parts = [f"{json.dumps(n, ensure_ascii=False)}: {tid}" for n, tid in chunk]
        ids_lines.append("    " + ", ".join(parts) + ",")
    ids_lines.append("};")

    engine = ENGINE.read_text(encoding="utf-8")
    engine = re.sub(
        r"const TEAM_CONFIG = \{[\s\S]*?\};",
        "\n".join(cfg_lines),
        engine,
        count=1,
    )
    engine = re.sub(
        r"const TEAM_IDS = \{[\s\S]*?\};",
        "\n".join(ids_lines),
        engine,
        count=1,
    )
    ENGINE.write_text(engine, encoding="utf-8")
    print("server/lfg_engine.js atualizado.")

    # Atualiza reconsolidar_rodada.py se existir
    if RECON.exists():
        recon = RECON.read_text(encoding="utf-8")
        # TEAM_CONFIG block
        cfg_py = ["TEAM_CONFIG = {"]
        for name, cfg in team_config.items():
            cfg_py.append(f'    {json.dumps(name, ensure_ascii=False)}: {{"escudo": {json.dumps(cfg["escudo"])}}},')
        cfg_py.append("}")
        ids_py = ["TEAM_IDS = {"]
        for name, tid in team_ids.items():
            ids_py.append(f"    {json.dumps(name, ensure_ascii=False)}: {tid},")
        ids_py.append("}")
        recon = re.sub(r"TEAM_CONFIG = \{[\s\S]*?\n\}", "\n".join(cfg_py), recon, count=1)
        recon = re.sub(r"TEAM_IDS = \{[\s\S]*?\n\}", "\n".join(ids_py), recon, count=1)
        RECON.write_text(recon, encoding="utf-8")
        print("scripts/reconsolidar_rodada.py atualizado.")

    # Regenera /data a partir do calendario (tabela/stats)
    def normalize(name: str) -> str:
        return " ".join((name or "").lower().split())

    def standings(calendario, rodada_limite: int):
        tb = {
            t: {
                "nome": t,
                "escudo": team_config[t]["escudo"],
                "P": 0, "J": 0, "V": 0, "E": 0, "D": 0,
                "PF": 0, "PS": 0, "SP": 0, "history": [],
            }
            for t in team_config
        }
        for rkey, jogos in calendario.items():
            num = int("".join(ch for ch in rkey if ch.isdigit()) or 0)
            if num >= rodada_limite:
                continue
            for j in jogos:
                pc = float(j.get("placar_casa") or 0)
                pv = float(j.get("placar_visitante") or 0)
                if pc == 0 and pv == 0:
                    continue
                ck = next((k for k in tb if normalize(k) == normalize(j["casa"])), None)
                vk = next((k for k in tb if normalize(k) == normalize(j["visitante"])), None)
                if not ck or not vk:
                    continue
                c, v = tb[ck], tb[vk]
                c["J"] += 1; v["J"] += 1
                c["PF"] += pc; v["PF"] += pv
                c["PS"] += pv; v["PS"] += pc
                c["SP"] += pc - pv; v["SP"] += pv - pc
                if pc > pv:
                    c["V"] += 1; c["P"] += 3; v["D"] += 1
                    c["history"].append("W"); v["history"].append("L")
                elif pv > pc:
                    v["V"] += 1; v["P"] += 3; c["D"] += 1
                    v["history"].append("W"); c["history"].append("L")
                else:
                    c["E"] += 1; c["P"] += 1; v["E"] += 1; v["P"] += 1
                    c["history"].append("D"); v["history"].append("D")
        rows = [{**t, "PF": math.trunc(t["PF"]), "PS": math.trunc(t["PS"]), "SP": math.trunc(t["SP"])} for t in tb.values()]
        rows.sort(key=lambda x: (x["P"], x["V"], x["SP"]), reverse=True)
        return rows

    def enrich(calendario):
        out = {}
        for r, jogos in calendario.items():
            out[r] = []
            for j in jogos:
                casa = j["casa"]; vis = j["visitante"]
                out[r].append({
                    **j,
                    "escudo_casa": team_config.get(casa, {}).get("escudo"),
                    "escudo_visitante": team_config.get(vis, {}).get("escudo"),
                })
        return out

    status = get_json("https://api.cartola.globo.com/mercado/status")
    rodada_atual = status["rodada_atual"]
    tabela = standings(cal, rodada_atual)
    agora = datetime.now().astimezone().strftime("%H:%M")
    lider_p = tabela[0]["P"] if tabela else 1
    probs = sorted(
        [{"nome": t["nome"], "probTitulo": f"{t['P'] * 1.5:.1f}"} for t in tabela],
        key=lambda x: float(x["probTitulo"]),
        reverse=True,
    )
    z4 = sorted(
        [{"nome": t["nome"], "risk": f"{max(0, (1 - (t['P'] / lider_p)) * 100):.1f}"} for t in tabela],
        key=lambda x: float(x["risk"]),
        reverse=True,
    )[:5]

    # streaks
    win = {"count": 0, "teams": []}
    lose = {"count": 0, "teams": []}
    for t in tabela:
        cw = cwl = 0
        for h in reversed(t["history"]):
            if h == "W":
                cw += 1
            else:
                break
        for h in reversed(t["history"]):
            if h != "W":
                cwl += 1
            else:
                break
        if cw > win["count"]:
            win = {"count": cw, "teams": [t]}
        elif cw == win["count"] and cw > 0:
            win["teams"].append(t)
        if cwl > lose["count"]:
            lose = {"count": cwl, "teams": [t]}
        elif cwl == lose["count"] and cwl > 0:
            lose["teams"].append(t)

    estatisticas = {
        "streaks": {"win": win, "lose": lose},
        "probabilities": probs,
        "z4Risk": z4,
        "saf": None,
        "lastUpdate": agora,
    }
    meta = {
        "lastSyncAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "lastUpdate": agora,
        "rodada": rodada_atual,
        "live": status.get("status_mercado") == 2,
        "mercado_aberto": status.get("status_mercado") != 2,
        "syncOk": True,
        "houveMudanca": True,
        "renames": {k: v for k, v in rename_map.items() if k != v},
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "calendario.json").write_text(json.dumps(enrich(cal), ensure_ascii=False), encoding="utf-8")
    (OUT / "classificacao.json").write_text(json.dumps(tabela, ensure_ascii=False), encoding="utf-8")
    (OUT / "estatisticas.json").write_text(json.dumps(estatisticas, ensure_ascii=False), encoding="utf-8")
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nJSON publico regenerado. Lider: {tabela[0]['nome']} P={tabela[0]['P']} J={tabela[0]['J']}")
    print("Renomes:")
    for o, n in rename_map.items():
        if o != n:
            print(f"  - {o} => {n}")


if __name__ == "__main__":
    main()

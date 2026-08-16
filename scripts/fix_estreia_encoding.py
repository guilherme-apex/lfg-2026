#!/usr/bin/env python3
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
H = {"User-Agent": "Mozilla/5.0"}

req = urllib.request.Request(
    "https://api.cartola.globo.com/time/id/47686055", headers=H
)
with urllib.request.urlopen(req, timeout=60) as r:
    api = json.loads(r.read().decode("utf-8"))
correct = api["time"]["nome"]
print("API:", repr(correct), correct.encode("utf-8"))


def fix_estreia_key(text: str) -> str:
    return re.sub(r'"Estreia da Manh[^"]*Fc"', json.dumps(correct, ensure_ascii=False), text)


# engine
eng_path = ROOT / "server" / "lfg_engine.js"
eng = fix_estreia_key(eng_path.read_text(encoding="utf-8"))
eng_path.write_text(eng, encoding="utf-8")
print("engine Estreia keys:", re.findall(r"Estreia[^\"]+", eng))

# calendar
cal_path = ROOT / "server" / "calendario_2026.json"
cal = json.loads(cal_path.read_text(encoding="utf-8"))
fixed = 0
for jogos in cal.values():
    for j in jogos:
        for k in ("casa", "visitante"):
            if j[k].startswith("Estreia") and j[k] != correct:
                print("cal", repr(j[k]), "->", repr(correct))
                j[k] = correct
                fixed += 1
cal_path.write_text(json.dumps(cal, ensure_ascii=False, indent=4), encoding="utf-8")
print("calendar fixes", fixed)

cfg = dict(re.findall(r'"([^"]+)": \{ escudo: "([^"]+)"', eng))
print("cfg Estreia", [k for k in cfg if k.startswith("Estreia")])

# public calendario
pub_cal_path = ROOT / "client" / "public" / "data" / "calendario.json"
pub_cal = json.loads(pub_cal_path.read_text(encoding="utf-8"))
for jogos in pub_cal.values():
    for j in jogos:
        for k in ("casa", "visitante"):
            if isinstance(j.get(k), str) and j[k].startswith("Estreia") and j[k] != correct:
                j[k] = correct
        j["escudo_casa"] = cfg.get(j["casa"])
        j["escudo_visitante"] = cfg.get(j["visitante"])
pub_cal_path.write_text(json.dumps(pub_cal, ensure_ascii=False), encoding="utf-8")

# classificacao
cls_path = ROOT / "client" / "public" / "data" / "classificacao.json"
cls = json.loads(cls_path.read_text(encoding="utf-8"))
for t in cls:
    if t["nome"].startswith("Estreia") and t["nome"] != correct:
        t["nome"] = correct
    if t["nome"] in cfg:
        t["escudo"] = cfg[t["nome"]]
cls_path.write_text(json.dumps(cls, ensure_ascii=False), encoding="utf-8")

# estatisticas
est_path = ROOT / "client" / "public" / "data" / "estatisticas.json"
est = json.loads(est_path.read_text(encoding="utf-8"))
for key in ("probabilities", "z4Risk"):
    for row in est.get(key) or []:
        if row.get("nome", "").startswith("Estreia") and row["nome"] != correct:
            row["nome"] = correct
for side in ("win", "lose"):
    for t in ((est.get("streaks") or {}).get(side, {}) or {}).get("teams") or []:
        if t.get("nome", "").startswith("Estreia") and t["nome"] != correct:
            t["nome"] = correct
        if t.get("nome") in cfg:
            t["escudo"] = cfg[t["nome"]]
est_path.write_text(json.dumps(est, ensure_ascii=False), encoding="utf-8")

# reconsolidar + baixar
for rel in ("scripts/reconsolidar_rodada.py", "baixar_escudos.py"):
    p = ROOT / rel
    p.write_text(fix_estreia_key(p.read_text(encoding="utf-8")), encoding="utf-8")

print("done")

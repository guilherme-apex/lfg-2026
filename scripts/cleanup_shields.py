#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
engine = (ROOT / "server" / "lfg_engine.js").read_text(encoding="utf-8")
used = set(re.findall(r'escudo:\s*"(/shields/[^"]+)"', engine))
print("used:", sorted(used))
shields = ROOT / "client" / "public" / "shields"
for p in list(shields.iterdir()):
    if p.suffix.lower() not in {".svg", ".png"}:
        continue
    rel = f"/shields/{p.name}"
    if rel not in used:
        print("DELETE orphan", p.name)
        p.unlink()

m = re.search(r"const TEAM_IDS = \{([\s\S]*?)\};", engine)
names = re.findall(r'"([^"]+)":\s*\d+', m.group(1))
import json
lines = ",\n".join("    " + json.dumps(n, ensure_ascii=False) for n in names)
text = (ROOT / "baixar_escudos.py").read_text(encoding="utf-8")
text2 = re.sub(
    r"TIMES_PARA_BUSCAR = \[[\s\S]*?\]",
    "TIMES_PARA_BUSCAR = [\n" + lines + "\n]",
    text,
    count=1,
)
(ROOT / "baixar_escudos.py").write_text(text2, encoding="utf-8")
print("baixar_escudos updated", len(names), "teams")

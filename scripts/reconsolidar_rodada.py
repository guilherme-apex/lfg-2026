#!/usr/bin/env python3
"""One-off: reconsolida rodada alvo (rodada_atual-1) e regenera /data/*.json."""
from __future__ import annotations

import json
import math
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
CAL_PATH = SERVER / "calendario_2026.json"
OUT = ROOT / "client" / "public" / "data"

TEAM_CONFIG = {
    "Data CFC": {"escudo": "/shields/data_cfc.svg"},
    "CL11 FC": {"escudo": "/shields/cl11_fc.svg"},
    "Decc F.C": {"escudo": "/shields/decc_fc.svg"},
    "OPPURETTO FC10": {"escudo": "/shields/oppuretto_fc10.svg"},
    "C. E. Olhodaguense": {"escudo": "/shields/c_e_olhodaguense.svg"},
    "Pepethinaikos AC": {"escudo": "/shields/pepethinaikos_ac.svg"},
    "JAKTE FC": {"escudo": "/shields/jakte_fc.svg"},
    "BOTTONS CASCAVEL": {"escudo": "/shields/bottons_cascavel.svg"},
    "Wakanda_sport_club": {"escudo": "/shields/wakanda_sport_club.svg"},
    "S.C Milagroso": {"escudo": "/shields/sc_milagroso.svg"},
    "S.E. BURROW LSU": {"escudo": "/shields/se_burrow_lsu.svg"},
    "LUIGIONEL MESSI": {"escudo": "/shields/luigionel_messi.svg"},
    "Total 12 FC": {"escudo": "/shields/total_12_fc.svg"},
    "Ronaldito FC": {"escudo": "/shields/ronaldito_fc.svg"},
    "caximbobol FC": {"escudo": "/shields/caximbobol_fc.svg"},
    "Everbary": {"escudo": "/shields/everbary.svg"},
    "Coringudo da Zn": {"escudo": "/shields/coringudo_da_zn.svg"},
    "Estreia da Manhã Fc": {"escudo": "/shields/estreia_da_manha_fc.svg"},
    "ArroganTRI/PR": {"escudo": "/shields/arrogantri_pr.svg"},
    "Realdonatello": {"escudo": "/shields/realdonatello.svg"},
}

TEAM_IDS = {
    "Data CFC": 44801122,
    "CL11 FC": 13954852,
    "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202,
    "C. E. Olhodaguense": 500739,
    "Pepethinaikos AC": 131897,
    "JAKTE FC": 2731370,
    "BOTTONS CASCAVEL": 19989513,
    "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408,
    "S.E. BURROW LSU": 17898941,
    "LUIGIONEL MESSI": 45474101,
    "Total 12 FC": 363579,
    "Ronaldito FC": 6714,
    "caximbobol FC": 44568116,
    "Everbary": 2184134,
    "Coringudo da Zn": 51044546,
    "Estreia da Manhã Fc": 47686055,
    "ArroganTRI/PR": 8631132,
    "Realdonatello": 50612459,
}


def normalize(name: str) -> str:
    return " ".join((name or "").lower().split())


def get_json(url: str):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def consolidated_score(dados: dict) -> tuple[int, int]:
    pontos_totais = dados.get("pontos") or 0
    capitao_id = dados.get("capitao_id")
    pontos_cap = 0
    for a in dados.get("atletas") or []:
        if a.get("atleta_id") == capitao_id:
            pontos_cap = a.get("pontos_num") or 0
            break
    for sub in dados.get("substituicoes") or []:
        if sub.get("saiu", {}).get("atleta_id") == capitao_id:
            pontos_cap = sub.get("entrou", {}).get("pontos_num") or 0
    bonus = pontos_cap * 0.5
    normal = math.trunc(pontos_totais - bonus)
    capitao = math.trunc(pontos_cap)
    return normal, capitao


def fetch_scores(rodada: int) -> dict:
    scores = {}
    saf = []
    for name, tid in TEAM_IDS.items():
        url = f"https://api.cartola.globo.com/time/id/{tid}/{rodada}"
        try:
            dados = get_json(url)
            normal, capitao = consolidated_score(dados)
            scores[normalize(name)] = {"normal": normal, "capitao": capitao}
            saf.append(
                {
                    "nome": name,
                    "escudo": TEAM_CONFIG[name]["escudo"],
                    "patrimonio": dados.get("patrimonio") or 0,
                }
            )
            print(f"  {name}: {normal} (cap {capitao})")
        except Exception as e:
            print(f"  ERRO {name}: {e}")
    return scores, saf


def apply_scores(calendario, scores, rodada: int) -> bool:
    key = f"Rodada {rodada}"
    if key not in calendario:
        return False
    changed = False
    novos = []
    for jogo in calendario[key]:
        casa = scores.get(normalize(jogo["casa"]))
        vis = scores.get(normalize(jogo["visitante"]))
        if casa and vis:
            if (
                jogo.get("placar_casa") != casa["normal"]
                or jogo.get("placar_casa_capitao") != casa["capitao"]
                or jogo.get("placar_visitante") != vis["normal"]
                or jogo.get("placar_visitante_capitao") != vis["capitao"]
            ):
                changed = True
                jogo = {
                    **jogo,
                    "placar_casa": casa["normal"],
                    "placar_visitante": vis["normal"],
                    "placar_casa_capitao": casa["capitao"],
                    "placar_visitante_capitao": vis["capitao"],
                }
        novos.append(jogo)
    calendario[key] = novos
    return changed


def standings(calendario, rodada_limite: int):
    tb = {
        t: {
            "nome": t,
            "escudo": TEAM_CONFIG[t]["escudo"],
            "P": 0,
            "J": 0,
            "V": 0,
            "E": 0,
            "D": 0,
            "PF": 0,
            "PS": 0,
            "SP": 0,
            "history": [],
        }
        for t in TEAM_CONFIG
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
            c["J"] += 1
            v["J"] += 1
            c["PF"] += pc
            v["PF"] += pv
            c["PS"] += pv
            v["PS"] += pc
            c["SP"] += pc - pv
            v["SP"] += pv - pc
            if pc > pv:
                c["V"] += 1
                c["P"] += 3
                v["D"] += 1
                c["history"].append("W")
                v["history"].append("L")
            elif pv > pc:
                v["V"] += 1
                v["P"] += 3
                c["D"] += 1
                v["history"].append("W")
                c["history"].append("L")
            else:
                c["E"] += 1
                c["P"] += 1
                v["E"] += 1
                v["P"] += 1
                c["history"].append("D")
                v["history"].append("D")
    rows = []
    for t in tb.values():
        rows.append(
            {
                **t,
                "PF": math.trunc(t["PF"]),
                "PS": math.trunc(t["PS"]),
                "SP": math.trunc(t["SP"]),
            }
        )
    rows.sort(key=lambda x: (x["P"], x["V"], x["SP"]), reverse=True)
    return rows


def streaks(tabela):
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
    return {"win": win, "lose": lose}


def enrich(calendario):
    out = {}
    for r, jogos in calendario.items():
        out[r] = [
            {
                **j,
                "escudo_casa": TEAM_CONFIG.get(j["casa"], {}).get("escudo"),
                "escudo_visitante": TEAM_CONFIG.get(j["visitante"], {}).get("escudo"),
            }
            for j in jogos
        ]
    return out


def main():
    status = get_json("https://api.cartola.globo.com/mercado/status")
    rodada_atual = status["rodada_atual"]
    status_mercado = status["status_mercado"]
    alvo = rodada_atual if status_mercado == 2 else max(1, rodada_atual - 1)
    print(f"Cartola rodada={rodada_atual} status={status_mercado} -> consolidar Rodada {alvo}")

    calendario = json.loads(CAL_PATH.read_text(encoding="utf-8"))
    print(f"Antes R{alvo}: {calendario[f'Rodada {alvo}'][0]['casa']} "
          f"{calendario[f'Rodada {alvo}'][0]['placar_casa']}x{calendario[f'Rodada {alvo}'][0]['placar_visitante']}")

    scores, saf = fetch_scores(alvo)
    changed = apply_scores(calendario, scores, alvo)
    if changed:
        CAL_PATH.write_text(json.dumps(calendario, ensure_ascii=False, indent=4), encoding="utf-8")
        print("calendario_2026.json atualizado")
    else:
        print("Sem mudanca de placar")

    print(f"Depois R{alvo}: {calendario[f'Rodada {alvo}'][0]['casa']} "
          f"{calendario[f'Rodada {alvo}'][0]['placar_casa']}x{calendario[f'Rodada {alvo}'][0]['placar_visitante']}")

    tabela = standings(calendario, rodada_atual)
    agora = datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%H:%M")
    lider_p = tabela[0]["P"] if tabela else 1
    probs = sorted(
        [{"nome": t["nome"], "probTitulo": f"{t['P'] * 1.5:.1f}"} for t in tabela],
        key=lambda x: float(x["probTitulo"]),
        reverse=True,
    )
    z4 = sorted(
        [
            {
                "nome": t["nome"],
                "risk": f"{max(0, (1 - (t['P'] / lider_p)) * 100):.1f}",
            }
            for t in tabela
        ],
        key=lambda x: float(x["risk"]),
        reverse=True,
    )[:5]
    richest = sorted(saf, key=lambda x: x["patrimonio"], reverse=True)[0] if saf else None
    estatisticas = {
        "streaks": streaks(tabela),
        "probabilities": probs,
        "z4Risk": z4,
        "saf": richest,
        "lastUpdate": agora,
    }
    meta = {
        "lastSyncAt": datetime.utcnow().isoformat() + "Z",
        "lastUpdate": agora,
        "rodada": rodada_atual,
        "live": status_mercado == 2,
        "mercado_aberto": status_mercado != 2,
        "syncOk": True,
        "houveMudanca": changed,
        "backfill": [],
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "calendario.json").write_text(json.dumps(enrich(calendario), ensure_ascii=False), encoding="utf-8")
    (OUT / "classificacao.json").write_text(json.dumps(tabela, ensure_ascii=False), encoding="utf-8")
    (OUT / "estatisticas.json").write_text(json.dumps(estatisticas, ensure_ascii=False), encoding="utf-8")
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK lider={tabela[0]['nome']} P={tabela[0]['P']} J={tabela[0]['J']}")


if __name__ == "__main__":
    main()

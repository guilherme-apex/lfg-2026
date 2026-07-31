#!/usr/bin/env python3
import json, math, urllib.request
from datetime import datetime, timezone

H={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def get(u):
    r=urllib.request.Request(u, headers=H)
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())

TEAM={"ursinho pó ffc":44801122,"Pepethinaikos":131897,"Decc F.C":28437271,"CL11 FC":13954852}

status=get("https://api.cartola.globo.com/mercado/status")
rodada=status["rodada_atual"]
print("rodada",rodada,"status",status["status_mercado"])

scouts=get("https://api.cartola.globo.com/atletas/pontuados").get("atletas") or {}
print("scouts",len(scouts))

partidas=get(f"https://api.cartola.globo.com/partidas/{rodada}")["partidas"]
agora=datetime.now(timezone.utc)
clubes=set()
for p in partidas:
    dt=datetime.fromisoformat(p["partida_data"].replace("Z","+00:00"))
    if dt.timestamp()+120 < agora.timestamp():
        clubes.add(p["clube_casa_id"]); clubes.add(p["clube_visitante_id"])
print("clubes jogaram",len(clubes))

site=get("https://lfg-2026.vercel.app/data/calendario.json")
site_map={}
for j in site[f"Rodada {rodada}"]:
    site_map[j["casa"]]=j["placar_casa"]
    site_map[j["visitante"]]=j["placar_visitante"]

# replicate JS processarSubstituicoes closely
def calc(name, tid):
    d=get(f"https://api.cartola.globo.com/time/id/{tid}")
    caps=d.get("capitao_id"); luxo=d.get("reserva_luxo_id") or 0
    tpos={}
    for t in d.get("atletas") or []:
        sc=scouts.get(str(t["atleta_id"])) or scouts.get(t["atleta_id"])
        jogou=bool(sc); pts=(sc or {}).get("pontuacao") or 0
        ji=t["clube_id"] in clubes
        tpos.setdefault(t["posicao_id"],[]).append(dict(id=t["atleta_id"],pts=pts,jogou=jogou,ji=ji,cap=t["atleta_id"]==caps,preco=t.get("preco_num") or 0,ativo=True))
    entradas=[]
    for res in d.get("reservas") or []:
        sc=scouts.get(str(res["atleta_id"])) or scouts.get(res["atleta_id"])
        jogou=bool(sc); pts=(sc or {}).get("pontuacao") or 0
        if not jogou or pts<=0: continue
        lst=tpos.get(res["posicao_id"]); 
        if not lst: continue
        is_lux=res["atleta_id"]==luxo
        tem=any(x["ji"] and not x["jogou"] for x in lst)
        entrou=False; cap_h=False
        if is_lux and not tem:
            at=[x for x in lst if x["ativo"]]
            if at:
                pior=min(at,key=lambda x:(x["pts"], -x["cap"]))
                if pts>pior["pts"]:
                    pior["ativo"]=False; entrou=True; cap_h=pior["cap"]
        else:
            fan=[x for x in lst if x["ativo"] and not x["jogou"] and x["ji"]]
            if fan:
                fan.sort(key=lambda x:(not x["cap"],-x["preco"]))
                s=fan[0]; s["ativo"]=False; entrou=True; cap_h=s["cap"]
        if entrou: entradas.append(dict(pts=pts,cap_h=cap_h))
    tn=tc=0
    for lst in tpos.values():
        for t in lst:
            if t["ativo"]:
                p=math.trunc(t["pts"]); tn+=p; tc+=math.trunc(p*1.5) if t["cap"] else p
    for e in entradas:
        tn+=e["pts"]; tc+=e["pts"]*1.5 if e["cap_h"] else e["pts"]
    return math.trunc(tn), math.trunc(tc), d.get("pontos")

print(f"{'time':22} site  calc  api_pontos")
for n,tid in TEAM.items():
    nrm,cap,api=calc(n,tid)
    print(f"{n[:22]:22} {site_map.get(n,'?'):>4}  {nrm:>4}  {api}")

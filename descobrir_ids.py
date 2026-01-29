import requests
import json

# Lista dos seus times (exatamente como no sistema)
meus_times = [
    "ursinho pó ffc", "CL11 FC", "Decc F.C", "OPPURETTO FC10",
    "C.E. Olhodaguense", "Pepethinaikos", "jakte FC", "BOTTONS CASCAVEL",
    "Wakanda_sport_club", "S.C Milagroso", "S.E. BURROW LSU", "LUIGIONEL MESSI",
    "total 12 Fc", "Ronaldito", "Caximbobol FC", "Everbary",
    "Coringudo da Zn", "Estreia  da Manhã", "ArroganTRI/PR", "Realdonatello"
]

print("🕵️‍♂️ INICIANDO SCOUTING REPORT - BUSCANDO IDs...")
print("-" * 50)

mapa_ids = {}

for nome_time in meus_times:
    try:
        # Tenta buscar pelo nome na API pública
        url = f"https://api.cartola.globo.com/times?q={nome_time}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        resultados = response.json()
        
        found = False
        if resultados:
            # Pega o primeiro resultado (geralmente é o certo se o nome for único)
            # Mas vamos tentar bater o nome exato se possível
            melhor_match = resultados[0] 
            
            print(f"✅ {nome_time} -> ID: {melhor_match['time_id']} (Cartola: {melhor_match['nome_cartola']})")
            mapa_ids[nome_time] = melhor_match['time_id']
        else:
            print(f"❌ {nome_time} -> NÃO ENCONTRADO NA BUSCA AUTOMÁTICA.")
            mapa_ids[nome_time] = None

    except Exception as e:
        print(f"⚠️ Erro ao buscar {nome_time}: {e}")

print("-" * 50)
print("📋 COPIE O JSON ABAIXO PARA ME ENVIAR:")
print(json.dumps(mapa_ids, indent=4, ensure_ascii=False))
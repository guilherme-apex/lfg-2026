import json
import requests
import time
import math

# Mapeamento oficial dos IDs fornecido por você
TEAM_IDS = {
    "ursinho pó ffc": 44801122, "CL11 FC": 13954852, "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202, "C.E. Olhodaguense": 500739, "Pepethinaikos": 131897,
    "jakte FC": 2731370, "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408, "S.E. BURROW LSU": 17898941, "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579, "Ronaldito": 6714, "Caximbobol FC": 44568116,
    "Everbary": 2184134, "Coringudo da Zn": 51044546, "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132, "Realdonatello": 50612459
}

RODADA_ALVO = 4
ARQUIVO_JSON = 'calendario_2026.json'

def buscar_pontuacao_cartola(team_id, rodada):
    """Bate na API do Cartola e retorna as pontuações (Sem Capitão, Com Capitão) já truncadas."""
    url = f"https://api.cartola.globo.com/time/id/{team_id}/{rodada}"
    headers = {
        # O User-Agent evita que a API da Globo bloqueie a requisição achando que é um robô malicioso
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Verifica se a API respondeu com erro
        data = response.json()
        
        # A pontuação total (com o bônus do capitão já somado)
        pontos_com_capitao = data.get("pontos", 0.0)
        capitao_id = data.get("capitao_id")
        
        pontos_capitao_raw = 0.0
        
        # Busca os pontos base do capitão no array de atletas
        if "atletas" in data:
            for atleta in data["atletas"]:
                if atleta.get("atleta_id") == capitao_id:
                    pontos_capitao_raw = atleta.get("pontos_num", 0.0)
                    break
                    
        # A matemática: Total já tem 2x o capitão. Tirando 1x o capitão, temos a pontuação normal.
        pontos_sem_capitao = pontos_com_capitao - pontos_capitao_raw
        
        # Regra LFG: Truncar as casas decimais (ex: 85.9 -> 85)
        return int(pontos_sem_capitao), int(pontos_com_capitao)
        
    except Exception as e:
        print(f"⚠️ Erro ao buscar time ID {team_id}: {e}")
        return 0, 0

def atualizar_calendario():
    print(f"🔄 Iniciando atualização automática da Rodada {RODADA_ALVO}...\n")
    
    # 1. Carrega o calendário atual
    try:
        with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
            calendario = json.load(f)
    except FileNotFoundError:
        print(f"❌ Arquivo {ARQUIVO_JSON} não encontrado!")
        return

    rodada_key = f"Rodada {RODADA_ALVO}"
    if rodada_key not in calendario:
        print(f"❌ {rodada_key} não encontrada no arquivo JSON!")
        return

    # Cache local para não buscar o mesmo time 2x caso ele apareça duplicado (boa prática)
    cache_times = {}

    # 2. Varre os confrontos da Rodada 4
    for jogo in calendario[rodada_key]:
        time_casa = jogo['casa']
        time_visi = jogo['visitante']
        
        print(f"⚽ {time_casa} vs {time_visi}")

        # Busca dados do MANDANTE
        id_casa = TEAM_IDS.get(time_casa)
        if id_casa:
            if id_casa not in cache_times:
                cache_times[id_casa] = buscar_pontuacao_cartola(id_casa, RODADA_ALVO)
                time.sleep(0.3) # Pequena pausa para a API do Cartola não nos bloquear
            
            pts_casa_sem, pts_casa_com = cache_times[id_casa]
            jogo['placar_casa'] = pts_casa_sem
            jogo['placar_casa_capitao'] = pts_casa_com
            print(f"   -> Casa: {pts_casa_sem} (Sem Cap) | {pts_casa_com} (Com Cap)")
        else:
            print(f"   -> ⚠️ ID não encontrado para {time_casa}")
        
        # Busca dados do VISITANTE
        id_visi = TEAM_IDS.get(time_visi)
        if id_visi:
            if id_visi not in cache_times:
                cache_times[id_visi] = buscar_pontuacao_cartola(id_visi, RODADA_ALVO)
                time.sleep(0.3)
                
            pts_visi_sem, pts_visi_com = cache_times[id_visi]
            jogo['placar_visitante'] = pts_visi_sem
            jogo['placar_visitante_capitao'] = pts_visi_com
            print(f"   -> Visi: {pts_visi_sem} (Sem Cap) | {pts_visi_com} (Com Cap)")
        else:
            print(f"   -> ⚠️ ID não encontrado para {time_visi}")
            
        print("-" * 40)

    # 3. Salva os dados processados de volta no JSON
    with open(ARQUIVO_JSON, 'w', encoding='utf-8') as f:
        json.dump(calendario, f, indent=4, ensure_ascii=False)
        
    print("\n✅ Sucesso! O arquivo 'calendario_2026.json' foi atualizado. Só dar git push agora!")

if __name__ == "__main__":
    atualizar_calendario()
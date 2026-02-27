import json
import requests
import time
import math

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
# Caminho absoluto mantido
ARQUIVO_JSON = r'D:\Dev\Projeto_Cartola\lfg-2026-web\server\calendario_2026.json'

def buscar_pontuacao_cartola(team_id, rodada):
    url = f"https://api.cartola.globo.com/time/id/{team_id}/{rodada}"
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        pontos_com_capitao = data.get("pontos", 0.0)
        capitao_id = data.get("capitao_id")
        pontos_capitao_base = 0.0
        nome_capitao = "Desconhecido"

        for atleta in data.get("atletas", []):
            if atleta.get("atleta_id") == capitao_id:
                # Aqui a API entrega a pontuação BASE (1.0x)
                pontos_capitao_base = atleta.get("pontos_num", 0.0)
                nome_capitao = atleta.get("apelido", "Desconhecido")
                break

        # A MATEMÁTICA CORRETA:
        # Se a pontuação total tem 1.5x do capitão, e nós temos o valor de 1.0x,
        # O bônus extra que entrou na pontuação total é apenas os 0.5x.
        bonus_capitao = pontos_capitao_base * 0.5
        
        # Subtrai apenas o bônus, mantendo a pontuação base do capitão
        pontos_sem_capitao = pontos_com_capitao - bonus_capitao

        print(f"[{data.get('time', {}).get('nome', 'Time')}] Total: {pontos_com_capitao:.2f} | Capitao: {nome_capitao} ({pontos_capitao_base} pts base) | Bonus retirado: {bonus_capitao:.2f} | Result s/ cap: {pontos_sem_capitao:.2f}")

        return math.floor(pontos_sem_capitao), math.floor(pontos_com_capitao)

    except Exception as e:
        print(f"Erro ID {team_id}: {e}")
        return 0, 0

def atualizar_calendario():
    try:
        with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
            calendario = json.load(f)

        rodada_key = f"Rodada {RODADA_ALVO}"
        if rodada_key not in calendario:
            print("Rodada nao encontrada.")
            return

        cache_times = {}
        print("\n--- INICIANDO CALCULO COM A REGRA CORRETA (BONUS = 0.5x BASE) ---\n")

        for jogo in calendario[rodada_key]:
            time_casa = jogo['casa']
            time_visi = jogo['visitante']

            id_casa = TEAM_IDS.get(time_casa)
            if id_casa:
                if id_casa not in cache_times:
                    cache_times[id_casa] = buscar_pontuacao_cartola(id_casa, RODADA_ALVO)
                    time.sleep(0.3)
                jogo['placar_casa'] = cache_times[id_casa][0]
                jogo['placar_casa_capitao'] = cache_times[id_casa][1]

            id_visi = TEAM_IDS.get(time_visi)
            if id_visi:
                if id_visi not in cache_times:
                    cache_times[id_visi] = buscar_pontuacao_cartola(id_visi, RODADA_ALVO)
                    time.sleep(0.3)
                jogo['placar_visitante'] = cache_times[id_visi][0]
                jogo['placar_visitante_capitao'] = cache_times[id_visi][1]

        with open(ARQUIVO_JSON, 'w', encoding='utf-8') as f:
            json.dump(calendario, f, indent=4, ensure_ascii=False)
            
        print("\nArquivo JSON atualizado com sucesso e prontas para o GIT PUSH!")

    except Exception as e:
        print(f"Erro na execucao: {e}")

if __name__ == "__main__":
    atualizar_calendario()
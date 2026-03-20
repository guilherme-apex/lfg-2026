import requests

TEAM_IDS = {
    "ursinho pó ffc": 44801122, "CL11 FC": 13954852, "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202, "C.E. Olhodaguense": 500739, "Pepethinaikos": 131897,
    "jakte FC": 2731370, "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408, "S.E. BURROW LSU": 17898941, "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579, "Ronaldito": 6714, "Caximbobol FC": 44568116,
    "Everbary": 2184134, "Coringudo da Zn": 51044546, "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132, "Realdonatello": 50612459
}

RODADA = 7  # <--- MUDE AQUI QUAL RODADA VOCÊ QUER AUDITAR

def gerar_auditoria():
    print(f"\n🕵️‍♂️ Rodando a auditoria DEFINITIVA E CORRETA da Rodada {RODADA}...\n")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    resultados = []
    estatisticas_jogadores = {} 

    for nome_time, time_id in TEAM_IDS.items():
        try:
            url = f"https://api.cartola.globo.com/time/id/{time_id}/{RODADA}"
            resposta = requests.get(url, headers=headers)
            
            if resposta.status_code != 200:
                print(f"⚠️ Erro {resposta.status_code} ao puxar os dados de {nome_time}.")
                continue
                
            dados = resposta.json()
            
            # --- 1. LÓGICA DE AUDITORIA DO PLACAR DA LIGA ---
            pontos_totais_api = dados.get("pontos", 0.0)
            capitao_id = dados.get("capitao_id")
            pontos_capitao_base = 0.0
            
            atletas = dados.get("atletas", [])
            for atleta in atletas:
                if atleta.get("atleta_id") == capitao_id:
                    pontos_capitao_base = atleta.get("pontos_num", 0.0)
                    break
            
            substituicoes = dados.get("substituicoes", [])
            for sub in substituicoes:
                if sub.get("saiu", {}).get("atleta_id") == capitao_id:
                    pontos_capitao_base = sub.get("entrou", {}).get("pontos_num", 0.0)
                    break

            bonus_embutido = pontos_capitao_base * 0.5
            pontuacao_sem_bonus = pontos_totais_api - bonus_embutido
            pontuacao_real_liga = int(pontuacao_sem_bonus) 
            
            resultados.append({
                "time": nome_time,
                "pontos": pontuacao_real_liga
            })

            # --- 2. LÓGICA DE RASTREAMENTO DOS DESTAQUES E MAIS ESCALADOS ---
            time_final = {}
            
            # A. Coloca os 11 titulares originais na lista
            for atleta in dados.get("atletas", []):
                time_final[atleta["atleta_id"]] = {
                    "nome": atleta.get("apelido", "Desconhecido"),
                    "pontos": atleta.get("pontos_num", 0.0)
                }
            
            # B. Aplica as substituições (Tira quem saiu, bota o reserva que entrou)
            for sub in dados.get("substituicoes", []):
                id_saiu = sub.get("saiu", {}).get("atleta_id")
                id_entrou = sub.get("entrou", {}).get("atleta_id")
                
                if id_saiu in time_final:
                    del time_final[id_saiu] 
                
                entrou_obj = sub.get("entrou", {})
                time_final[id_entrou] = {
                    "nome": entrou_obj.get("apelido", "Desconhecido"),
                    "pontos": entrou_obj.get("pontos_num", 0.0)
                }
                
            # C. Contabiliza os 11 "sobreviventes" no Dicionário Global
            for id_jog, info in time_final.items():
                if id_jog not in estatisticas_jogadores:
                    estatisticas_jogadores[id_jog] = {
                        "nome": info["nome"],
                        "pontos": info["pontos"],
                        "escalacoes": 1
                    }
                else:
                    estatisticas_jogadores[id_jog]["escalacoes"] += 1

        except Exception as e:
            print(f"⚠️ Erro interno ao processar {nome_time}: {e}")

    # --- MONTAGEM DO RELATÓRIO FINAL PARA O WHATSAPP ---
    resultados.sort(key=lambda x: x['pontos'], reverse=True)

    print("🏆 *RESULTADOS DA RODADA* 🏆")
    print("--------------------------------")
    
    if resultados:
        mito = resultados[0]
        print(f"👑 *O MITO:* {mito['time']} destruiu com {mito['pontos']} pts!\n")
        
        for i, resultado in enumerate(resultados):
            posicao = f"{i + 1:02d}" 
            print(f"{posicao}º | {resultado['time']:<20} : {resultado['pontos']} pts")

    # --- BLOCO 1: MAIORES PONTUADORES ---
    lista_jogadores_pontos = list(estatisticas_jogadores.values())
    lista_jogadores_pontos.sort(key=lambda x: x["pontos"], reverse=True)

    print("\n🌟 *OS DESTAQUES DA RODADA* 🌟")
    print("Os maiores pontuadores contabilizados na nossa liga:\n")
    
    for i in range(min(5, len(lista_jogadores_pontos))):
        jog = lista_jogadores_pontos[i]
        times_texto = "time" if jog['escalacoes'] == 1 else "times"
        print(f"⚽ {jog['nome']} ({jog['pontos']} pts) -> Salvou {jog['escalacoes']} {times_texto}!")

    # --- BLOCO 2: OS MAIS ESCALADOS (TOP 3) ---
    # Ordena 1º pelo número de escalações, e 2º pelos pontos em caso de empate
    lista_jogadores_escalacoes = list(estatisticas_jogadores.values())
    lista_jogadores_escalacoes.sort(key=lambda x: (x["escalacoes"], x["pontos"]), reverse=True)

    print("\n🔥 *TOP 3: OS QUERIDINHOS DA GALERA* 🔥")
    print("Os jogadores que mais apareceram nos nossos times:\n")
    
    contador = 1
    for jog in lista_jogadores_escalacoes:
        if contador > 3:
            break
        # Só exibe se pelo menos 2 times escalaram (para não listar jogadores aleatórios)
        if jog['escalacoes'] > 1:
            print(f"📈 {contador}º {jog['nome']} -> Presente em {jog['escalacoes']} times!")
            contador += 1
        
    print("\n✅ Auditoria concluída. Pode copiar e colar no grupo.")

if __name__ == "__main__":
    gerar_auditoria()
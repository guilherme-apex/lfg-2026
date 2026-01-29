import json
import os

# --- 1. CONFIGURAÇÃO DA RODADA 1 (MANUAL) ---
# Nomes devem ser IDÊNTICOS ao server/index.js
confrontos_iniciais = [
    ("Decc F.C", "ursinho pó ffc"),
    ("BOTTONS CASCAVEL", "Caximbobol FC"),
    ("jakte FC", "Wakanda_sport_club"),
    ("LUIGIONEL MESSI", "C.E. Olhodaguense"),
    ("Pepethinaikos", "OPPURETTO FC10"),
    ("Estreia  da Manhã", "Everbary"),
    ("total 12 Fc", "Ronaldito"),
    ("CL11 FC", "S.C Milagroso"),
    ("Coringudo da Zn", "S.E. BURROW LSU"),
    ("ArroganTRI/PR", "Realdonatello")
]

def gerar_calendario_customizado(confrontos):
    # Separa quem joga em casa e fora na rodada 1
    times_casa = [p[0] for p in confrontos]
    times_visitante = [p[1] for p in confrontos]
    
    # Algoritmo do Círculo: Lista ordenada para rotação
    # [C1, C2, C3, C4... V4, V3, V2, V1]
    lista_ordenada = times_casa + times_visitante[::-1]
    
    n = len(lista_ordenada)
    num_rodadas = n - 1 # 19 rodadas (Turno)
    
    todas_rodadas = []

    print(f"🏀 Gerando tabela para {n} times...")

    # --- GERAÇÃO DO TURNO (1-19) ---
    for r in range(num_rodadas):
        rodada_atual = []
        for i in range(n // 2):
            t1 = lista_ordenada[i]
            t2 = lista_ordenada[n - 1 - i]
            
            # Na Rodada 1 (r=0), mantemos o mando original da lista manual
            # Nas outras, alternamos para equilibrar
            if r % 2 == 0:
                jogo = {
                    "casa": t1, 
                    "visitante": t2, 
                    "placar_casa": 0, "placar_visitante": 0,
                    "placar_casa_capitao": 0, "placar_visitante_capitao": 0
                }
            else:
                jogo = {
                    "casa": t2, 
                    "visitante": t1, 
                    "placar_casa": 0, "placar_visitante": 0,
                    "placar_casa_capitao": 0, "placar_visitante_capitao": 0
                }
            rodada_atual.append(jogo)
        
        todas_rodadas.append(rodada_atual)
        
        # Rotação (Fixa o primeiro, gira o resto)
        lista_ordenada = [lista_ordenada[0]] + [lista_ordenada[-1]] + lista_ordenada[1:-1]

    # --- MONTAGEM DO JSON ---
    calendario_final = {}

    # Turno
    for i, jogos in enumerate(todas_rodadas):
        calendario_final[f"Rodada {i+1}"] = jogos

    # Returno (Espelho)
    for i, jogos in enumerate(todas_rodadas):
        jogos_returno = []
        for jogo in jogos:
            jogos_returno.append({
                "casa": jogo["visitante"],
                "visitante": jogo["casa"],
                "placar_casa": 0, "placar_visitante": 0,
                "placar_casa_capitao": 0, "placar_visitante_capitao": 0
            })
        calendario_final[f"Rodada {i+1+19}"] = jogos_returno

    return calendario_final

# --- EXECUÇÃO ---
try:
    dados = gerar_calendario_customizado(confrontos_iniciais)
    
    # Caminho absoluto para garantir que salve na pasta certa
    # Salva na pasta server dentro de lfg-2026-web
    caminho = os.path.join("server", "calendario_2026.json")
    
    # Cria a pasta server se não existir (segurança)
    os.makedirs("server", exist_ok=True)

    with open(caminho, "w", encoding='utf-8') as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)

    print(f"✅ SUCESSO! Arquivo salvo em: {caminho}")

except Exception as e:
    print(f"❌ ERRO CRÍTICO: {e}")
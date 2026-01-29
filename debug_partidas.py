import requests
import json

print("🕵️‍♂️ INVESTIGANDO AS PARTIDAS DA RODADA 1...")
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

try:
    # 1. PEGAR LISTA DE JOGOS
    url_rodada = "https://api.cartola.globo.com/partidas/1"
    print(f"📡 Acessando: {url_rodada}")
    
    resp = requests.get(url_rodada, headers=headers)
    dados = resp.json()
    partidas = dados.get('partidas', [])
    
    print(f"✅ Encontrei {len(partidas)} partidas na Rodada 1.")
    
    if len(partidas) > 0:
        # Pega a primeira partida para analisar
        jogo = partidas[0]
        print(f"\n🏟️ Analisando Jogo: {jogo['clube_casa_id']} vs {jogo['clube_visitante_id']}")
        print(f"   Placar: {jogo.get('placar_oficial_mandante')} x {jogo.get('placar_oficial_visitante')}")
        
        # Tenta achar URL de detalhes da partida (Se existir)
        # O Cartola as vezes esconde o scout aqui
        print("\n🔍 Procurando scouts dentro do objeto da partida...")
        
        # Imprime chaves para vermos se tem algo como 'atletas' ou 'scout'
        print(f"   Chaves disponíveis no jogo: {list(jogo.keys())}")
        
        if 'aproveitamento_mandante' in jogo:
             print("   ⚠️ Achei estatísticas de time, mas precisamos de ATLETAS.")

except Exception as e:
    print(f"❌ Erro: {e}")

print("-" * 30)
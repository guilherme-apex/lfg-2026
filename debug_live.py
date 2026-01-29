import requests
import json

print("🕵️‍♂️ INICIANDO ANÁLISE FORENSE DA API...")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# 1. VERIFICAR STATUS DO MERCADO
try:
    status = requests.get('https://api.cartola.globo.com/mercado/status', headers=headers).json()
    rodada_atual = status['rodada_atual']
    print(f"📅 O Cartola diz que estamos na Rodada: {rodada_atual}")
    print(f"📊 Status do Mercado: {status['status_mercado']} (1=Aberto, 2=Fechado)")
except:
    print("❌ Falha ao buscar status.")
    rodada_atual = 1

print("-" * 30)

# 2. TESTAR AS GAVETAS DE PONTUAÇÃO
urls_teste = [
    ("GAVETA 1 (Genérica)", "https://api.cartola.globo.com/atletas/pontuados"),
    (f"GAVETA 2 (Rodada {rodada_atual})", f"https://api.cartola.globo.com/atletas/pontuados/{rodada_atual}"),
    (f"GAVETA 3 (Rodada {rodada_atual - 1})", f"https://api.cartola.globo.com/atletas/pontuados/{rodada_atual - 1}")
]

for nome, url in urls_teste:
    print(f"\n📂 Testando {nome}...")
    try:
        resp = requests.get(url, headers=headers)
        dados = resp.json()
        
        # O endpoint pode retornar lista ou dicionário
        qtd = len(dados) if dados else 0
        print(f"   >>> Encontrei {qtd} atletas pontuados aqui.")
        
        # Vamos tentar achar o Alan Patrick (Se ele pontuou, tem que estar aqui)
        # OBS: Não temos o ID dele fácil aqui, mas vamos ver se a lista está cheia
        if qtd > 10:
            print("   ✅ ESTA PARECE SER A GAVETA CERTA!")
            # Imprime um exemplo pra gente ver a cara do dado
            chaves = list(dados.keys())
            exemplo_id = chaves[0]
            print(f"   Exemplo de dado: ID {exemplo_id} -> {dados[exemplo_id]}")
            
    except Exception as e:
        print(f"   ❌ Erro ou Vazio: {e}")

print("\n" + "-" * 30)
import requests
import json

print("🕵️‍♂️ INVESTIGANDO DADOS DE MERCADO (PLAN C)...")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

try:
    # Endpoint que lista TODOS os atletas e suas estatísticas recentes
    url = "https://api.cartola.globo.com/atletas/mercado"
    print(f"📡 Acessando: {url}")
    
    resp = requests.get(url, headers=headers)
    dados = resp.json()
    atletas = dados.get('atletas', [])
    
    print(f"✅ Encontrei {len(atletas)} atletas no banco de dados do mercado.")
    
    # Vamos procurar os jogadores do CL11 FC que você mencionou
    # IDs conhecidos (ou nomes aproximados)
    alvos = ["Canobbio", "Alan Patrick", "Borré", "Mastriani", "Pablo"]
    
    encontrados = 0
    for atleta in atletas:
        apelido = atleta.get('apelido', 'Desconhecido')
        
        # Se o nome do atleta estiver na nossa lista de alvos
        if any(alvo.lower() in apelido.lower() for alvo in alvos):
            print(f"\n👤 Atleta: {apelido} (ID: {atleta['atleta_id']})")
            print(f"   💰 Preço: C$ {atleta.get('preco_num')}")
            print(f"   📊 Média: {atleta.get('media_num')}")
            print(f"   🎯 ÚLTIMA PONTUAÇÃO: {atleta.get('pontos_num')}") # AQUI ESTÁ O OURO
            print(f"   🆔 Clube ID: {atleta.get('clube_id')}")
            encontrados += 1
            
    if encontrados == 0:
        print("\n❌ Não achei nenhum dos atletas alvo. O mercado pode estar totalmente fechado/vazio.")

except Exception as e:
    print(f"❌ Erro: {e}")

print("-" * 30)
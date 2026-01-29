import requests
import json

# ID do CL11 FC (Carlos Carvalho)
TIME_ID = 13954852 

print(f"🕵️‍♂️ INVESTIGANDO O TIME ID: {TIME_ID}...")
print("-" * 50)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

try:
    # 1. Busca os dados do time
    url_time = f"https://api.cartola.globo.com/time/id/{TIME_ID}"
    res = requests.get(url_time, headers=headers)
    dados = res.json()

    # 2. Verifica atletas
    atletas = dados.get('atletas', [])
    pontos_total_api = dados.get('pontos', 0)

    print(f"Nome do Time: {dados.get('time', {}).get('nome', 'N/A')}")
    print(f"Cartoleiro: {dados.get('time', {}).get('nome_cartola', 'N/A')}")
    print(f"Pontuação TOTAL que a API diz: {pontos_total_api}")
    print(f"Atletas Escalados: {len(atletas)}")
    print("-" * 50)

    if len(atletas) == 0:
        print("⚠️ ALERTA: A lista de atletas está VAZIA!")
        print("Motivo provável: O mercado está ABERTO e este time ainda não escalou para a próxima rodada.")
    else:
        print("📋 ESCALAÇÃO E PONTOS (Do arquivo do time):")
        for atleta in atletas:
            apelido = atleta.get('apelido', 'Desconhecido')
            pontos = atleta.get('pontos_num', 0)
            status_id = atleta.get('status_id', 0) # 7 = Provável, 2 = Dúvida...
            print(f"- {apelido:<20} | Pontos: {pontos} | Status: {status_id}")

    print("-" * 50)
    
    # 3. Verifica Parciais Gerais
    print("🌍 VERIFICANDO PARCIAIS GERAIS (LIVE)...")
    url_parciais = "https://api.cartola.globo.com/atletas/pontuados"
    res_parciais = requests.get(url_parciais, headers=headers)
    parciais = res_parciais.json()
    
    qtd_parciais = len(parciais) if parciais else 0
    print(f"Total de jogadores pontuando no Brasil AGORA: {qtd_parciais}")
    
    # Tenta cruzar
    if len(atletas) > 0 and qtd_parciais > 0:
        print("\n⚔️ CRUZAMENTO DE DADOS:")
        for atleta in atletas:
            atleta_id = str(atleta['atleta_id'])
            if atleta_id in parciais:
                nota = parciais[atleta_id].get('pontuacao', 0)
                print(f"✅ MATCH! {atleta['apelido']} está nas parciais com {nota} pontos.")
            else:
                pass # Não poluir

except Exception as e:
    print(f"❌ ERRO: {e}")
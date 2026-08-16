import requests
import os

# --- CONFIGURAÇÃO ---
PASTA_DESTINO = "./client/public/shields"

# LISTA ATUALIZADA (19 TIMES)
TIMES_PARA_BUSCAR = [
    "Data CFC",
    "CL11 FC",
    "Decc F.C",
    "OPPURETTO FC10",
    "C. E. Olhodaguense",
    "Pepethinaikos AC",
    "JAKTE FC",
    "BOTTONS CASCAVEL",
    "Wakanda_sport_club",
    "S.C Milagroso",
    "S.E. BURROW LSU",
    "LUIGIONEL MESSI",
    "Total 12 FC",
    "Ronaldito FC",
    "caximbobol FC",
    "Everbary",
    "Coringudo da Zn",
    "Estreia da Manhã Fc",
    "ArroganTRI/PR",
    "Realdonatello"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://cartolafc.globo.com/"
}

if not os.path.exists(PASTA_DESTINO):
    os.makedirs(PASTA_DESTINO)

print(f"🔍 Iniciando busca para {len(TIMES_PARA_BUSCAR)} times...\n")

for nome_time in TIMES_PARA_BUSCAR:
    print(f"🏀 Buscando: {nome_time}...")
    
    try:
        url_busca = f"https://api.cartola.globo.com/times?q={nome_time}"
        resp_busca = requests.get(url_busca, headers=HEADERS)
        
        if resp_busca.status_code != 200:
            print(f"❌ Erro na API (Status {resp_busca.status_code})")
            continue

        resultados = resp_busca.json()
        
        time_encontrado = None
        if resultados:
            for t in resultados:
                if t['nome'].lower() == nome_time.lower():
                    time_encontrado = t
                    break
            if not time_encontrado:
                time_encontrado = resultados[0]
        
        if time_encontrado:
            url_escudo = time_encontrado.get('url_escudo_svg') or time_encontrado.get('url_escudo_png')
            
            if url_escudo:
                # Análise de extensão
                img_response = requests.get(url_escudo, headers=HEADERS)
                conteudo = img_response.content
                
                extensao_final = ".txt"
                if conteudo.strip().startswith(b'<svg') or b'<svg' in conteudo[:100] or ".svg" in url_escudo:
                    extensao_final = ".svg"
                    tipo = "VETOR (SVG)"
                elif conteudo.startswith(b'\x89PNG') or ".png" in url_escudo:
                    extensao_final = ".png"
                    tipo = "IMAGEM (PNG)"
                else:
                    extensao_final = ".png" # Fallback
                    tipo = "DESCONHECIDO"

                # Nome do arquivo sanitizado
                nome_limpo = nome_time.lower().replace(" ", "_").replace(".", "")
                nome_arquivo = f"{nome_limpo}{extensao_final}"
                caminho_final = os.path.join(PASTA_DESTINO, nome_arquivo)
                
                with open(caminho_final, 'wb') as handler:
                    handler.write(conteudo)
                
                print(f"✅ SUCESSO! Salvo: {nome_arquivo}")
            else:
                print(f"⚠️  Time sem escudo público.")
        else:
            print(f"❌ Time não encontrado.")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    print("-" * 30)

print("\n🚀 Concluído! Verifique a pasta client/public/shields")
const fs = require('fs');

const TEAM_IDS = {
    "ursinho pó ffc": 44801122, "CL11 FC": 13954852, "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202, "C.E. Olhodaguense": 500739, "Pepethinaikos": 131897,
    "jakte FC": 2731370, "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408, "S.E. BURROW LSU": 17898941, "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579, "Ronaldito": 6714, "Caximbobol FC": 44568116,
    "Everbary": 2184134, "Coringudo da Zn": 51044546, "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132, "Realdonatello": 50612459
};

const RODADA_ALVO = 4;
// Lembre-se de manter o caminho absoluto ou rodar dentro da pasta server!
const ARQUIVO_JSON = 'calendario_2026.json';

async function buscarPontuacaoCartola(teamId, rodada) {
    const url = `https://api.cartola.globo.com/time/id/${teamId}/${rodada}`;
    const headers = {
        "User-Agent": "Mozilla/5.0"
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Erro HTTP");
        
        const data = await response.json();
        
        const pontosComCapitao = data.pontos || 0.0;
        const capitaoId = data.capitao_id; 
        let pontosCapitaoMultiplicados = 0.0;
        
        if (data.atletas) {
            const capitao = data.atletas.find(a => a.atleta_id === capitaoId);
            if (capitao) {
                // A API entrega a pontuação do capitão já multiplicada por 1.5x
                pontosCapitaoMultiplicados = capitao.pontos_num || 0.0;
            }
        }
        
        // MATEMÁTICA CORRETA (REGRA 1.5x):
        // Se a pontuação dele é 1.5x, o "bônus" irreal que ele deu ao time é de 0.5x.
        // Dividir a pontuação atual por 3 nos dá exatamente o valor desse bônus extra.
        const bonusCapitao = pontosCapitaoMultiplicados / 3;
        
        // Tiramos apenas o bônus, mantendo a pontuação base do jogador no time
        const pontosSemCapitao = pontosComCapitao - bonusCapitao;
        
        // Truncar para remover casas decimais
        return [Math.floor(pontosSemCapitao), Math.floor(pontosComCapitao)];
    } catch (error) {
        console.log(`Erro ao buscar ID ${teamId}: ${error.message}`);
        return [0, 0];
    }
}

async function atualizarCalendario() {
    try {
        const fileData = fs.readFileSync(ARQUIVO_JSON, 'utf-8');
        const calendario = JSON.parse(fileData);
        const rodadaKey = `Rodada ${RODADA_ALVO}`;

        if (!calendario[rodadaKey]) return;

        const cacheTimes = {};
        console.log(`\n🔄 RECALCULANDO RODADA ${RODADA_ALVO} COM A NOVA REGRA 1.5x...\n`);

        for (let jogo of calendario[rodadaKey]) {
            const timeCasa = jogo.casa;
            const timeVisi = jogo.visitante;

            // CASA
            const idCasa = TEAM_IDS[timeCasa];
            if (idCasa) {
                if (!cacheTimes[idCasa]) {
                    cacheTimes[idCasa] = await buscarPontuacaoCartola(idCasa, RODADA_ALVO);
                    await new Promise(r => setTimeout(r, 300));
                }
                const [ptsCasaSem, ptsCasaCom] = cacheTimes[idCasa];
                jogo.placar_casa = ptsCasaSem;
                jogo.placar_casa_capitao = ptsCasaCom;
            }

            // VISITANTE
            const idVisi = TEAM_IDS[timeVisi];
            if (idVisi) {
                if (!cacheTimes[idVisi]) {
                    cacheTimes[idVisi] = await buscarPontuacaoCartola(idVisi, RODADA_ALVO);
                    await new Promise(r => setTimeout(r, 300));
                }
                const [ptsVisiSem, ptsVisiCom] = cacheTimes[idVisi];
                jogo.placar_visitante = ptsVisiSem;
                jogo.placar_visitante_capitao = ptsVisiCom;
            }
            
            console.log(`⚽ ${timeCasa} (${jogo.placar_casa} | ${jogo.placar_casa_capitao}) vs (${jogo.placar_visitante} | ${jogo.placar_visitante_capitao}) ${timeVisi}`);
        }

        fs.writeFileSync(ARQUIVO_JSON, JSON.stringify(calendario, null, 4), 'utf-8');
        console.log("\n✅ Atualização corrigida salva com sucesso no calendário!");

    } catch (error) {
        console.error("Erro geral:", error);
    }
}

atualizarCalendario();
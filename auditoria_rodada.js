const axios = require('axios');

const TEAM_IDS = {
    "ursinho pó ffc": 44801122, "CL11 FC": 13954852, "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202, "C.E. Olhodaguense": 500739, "Pepethinaikos": 131897,
    "jakte FC": 2731370, // ID CORRIGIDO!
    "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408, "S.E. BURROW LSU": 17898941, "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579, "Ronaldito": 6714, "Caximbobol FC": 44568116,
    "Everbary": 2184134, "Coringudo da Zn": 51044546, "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132, "Realdonatello": 50612459
};

const headers = { "User-Agent": "Mozilla/5.0" };
const RODADA = 3;

async function conferirPontuacoes() {
    console.log(`\n🕵️‍♂️ Rodando a auditoria DEFINITIVA E CORRETA da Rodada ${RODADA}...\n`);
    
    let resultados = [];

    for (const [nomeTime, id] of Object.entries(TEAM_IDS)) {
        try {
            const res = await axios.get(`https://api.cartola.globo.com/time/id/${id}/${RODADA}`, { headers });
            const timeInfo = res.data;
            
            // 1. Pega a pontuação oficial EXATA que está no site (já com banco de reservas processado)
            const pontuacaoOficialSite = timeInfo.pontos;
            
            // 2. Acha o capitão e a pontuação crua dele
            const capitaoId = timeInfo.capitao_id;
            const atletas = timeInfo.atletas || [];
            const capitao = atletas.find(a => a.atleta_id === capitaoId);
            const pontosCruCapitao = capitao ? capitao.pontos_num : 0;

            // 3. O bônus do capitão no Cartola é 50% da pontuação dele (multiplicador 1.5x)
            const bonusCapitao = pontosCruCapitao * 0.5;

            // 4. Subtrai apenas o bônus para ter a pontuação limpa para a liga
            const pontuacaoRealLiga = pontuacaoOficialSite - bonusCapitao;

            resultados.push({
                time: nomeTime,
                pontos: pontuacaoRealLiga
            });

        } catch (error) {
            console.log(`⚠️ Erro ao puxar os dados do time ${nomeTime}.`);
        }
    }

    // Ordena do maior pro menor
    resultados.sort((a, b) => b.pontos - a.pontos);

    console.log("📊 PONTUAÇÕES OFICIAIS (SEM O BÔNUS DO CAPITÃO):");
    resultados.forEach((resultado, index) => {
        console.log(`${index + 1}º | ${resultado.time}: ${resultado.pontos.toFixed(2)} pts`);
    });
    console.log("\n✅ Auditoria concluída com sucesso.");
}

conferirPontuacoes();
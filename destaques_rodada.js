const axios = require('axios');

const TEAM_IDS = {
    "ursinho pó ffc": 44801122, "CL11 FC": 13954852, "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202, "C.E. Olhodaguense": 500739, "Pepethinaikos": 131897,
    "jakte FC": 3708232, "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408, "S.E. BURROW LSU": 17898941, "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579, "Ronaldito": 6714, "Caximbobol FC": 44568116,
    "Everbary": 2184134, "Coringudo da Zn": 51044546, "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132, "Realdonatello": 50612459
};

const headers = { "User-Agent": "Mozilla/5.0" };
const RODADA = 3;

async function buscarDestaques() {
    console.log(`⏳ Garimpando os box scores da Rodada ${RODADA}...\n`);
    
    let todosJogadores = {};

    for (const [nomeTime, id] of Object.entries(TEAM_IDS)) {
        try {
            // Busca o time na rodada específica
            const res = await axios.get(`https://api.cartola.globo.com/time/id/${id}/${RODADA}`, { headers });
            const atletas = res.data.atletas || [];
            
            atletas.forEach(atleta => {
                // Filtra quem fez mais de zero
                if (atleta.pontos_num > 0) {
                    if (!todosJogadores[atleta.atleta_id]) {
                        todosJogadores[atleta.atleta_id] = {
                            nome: atleta.apelido,
                            pontos: atleta.pontos_num,
                            times: []
                        };
                    }
                    // Adiciona o time que escalou o cara
                    todosJogadores[atleta.atleta_id].times.push(nomeTime);
                }
            });
        } catch (error) {
            console.log(`⚠️ Erro ao ler o time ${nomeTime}.`);
        }
    }

    // Ordena do maior pro menor pontuador
    const ranking = Object.values(todosJogadores)
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 5); // Pega só os 5 monstros da rodada

    console.log("🔥 TOP 5 JOGADORES DA RODADA E QUEM ESCALOU 🔥\n");
    ranking.forEach((jog, index) => {
        console.log(`${index + 1}º - ${jog.nome}: ${jog.pontos} pontos`);
        console.log(`    Visão de jogo de: ${jog.times.join(', ')}\n`);
    });
}

buscarDestaques();
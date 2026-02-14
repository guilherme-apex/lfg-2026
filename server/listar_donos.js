const axios = require('axios');

// Seus times configurados
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

async function buscarDonos() {
    console.log("⏳ Buscando cartoleiros... Aguarde...\n");
    console.log("TIME;DONO (CARTOLEIRO)"); // Cabeçalho pronto pro Excel
    console.log("--------------------------------");

    // Transforma os IDs em um array para percorrer
    const times = Object.entries(TEAM_IDS);

    for (const [nomeChave, id] of times) {
        try {
            const response = await axios.get(`https://api.cartola.globo.com/time/id/${id}`, { headers });
            const time = response.data.time;
            
            // time.nome = Nome do Time Oficial
            // time.nome_cartola = Nome do Dono (Cartoleiro)
            console.log(`${time.nome};${time.nome_cartola}`);
            
        } catch (error) {
            console.log(`${nomeChave};[ERRO AO BUSCAR]`);
        }
    }
    console.log("\n✅ Fim da lista! Copie e cole no Excel (Dados > Texto para Colunas > Separador: Ponto e Vírgula)");
}

buscarDonos();
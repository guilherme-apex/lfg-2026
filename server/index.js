const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// --- 1. MAPEAMENTO DE IDs (CONFIRMADO) ---
const TEAM_IDS = {
    "ursinho pó ffc": 44801122,
    "CL11 FC": 13954852,
    "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202,
    "C.E. Olhodaguense": null, // <--- COLOQUE O ID AQUI SE DESCOBRIU!
    "Pepethinaikos": 131897,
    "jakte FC": 3708232,
    "BOTTONS CASCAVEL": 19989513,
    "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408,
    "S.E. BURROW LSU": 17898941,
    "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579,
    "Ronaldito": 6714,
    "Caximbobol FC": 44568116,
    "Everbary": 2184134,
    "Coringudo da Zn": 51044546,
    "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132,
    "Realdonatello": 50612459
};

// Configuração Visual
const TEAM_CONFIG = {
    "ursinho pó ffc": { escudo: "/shields/ursinho_pó_ffc.svg" },
    "CL11 FC": { escudo: "/shields/cl11_fc.svg" },
    "Decc F.C": { escudo: "/shields/decc_fc.svg" },
    "OPPURETTO FC10": { escudo: "/shields/oppuretto_fc10.svg" },
    "C.E. Olhodaguense": { escudo: "/shields/olho.png" },
    "Pepethinaikos": { escudo: "/shields/pepethinaikos.svg" },
    "jakte FC": { escudo: "/shields/jakte_fc.svg" },
    "BOTTONS CASCAVEL": { escudo: "/shields/bottons_cascavel.svg" },
    "Wakanda_sport_club": { escudo: "/shields/wakanda_sport_club.svg" },
    "S.C Milagroso": { escudo: "/shields/sc_milagroso.svg" },
    "S.E. BURROW LSU": { escudo: "/shields/se_burrow_lsu.svg" },
    "LUIGIONEL MESSI": { escudo: "/shields/luigionel_messi.svg" },
    "total 12 Fc": { escudo: "/shields/total_12_fc.svg" },
    "Ronaldito": { escudo: "/shields/ronaldito.svg" },
    "Caximbobol FC": { escudo: "/shields/caximbobol_fc.svg" },
    "Everbary": { escudo: "/shields/everbary.svg" },
    "Coringudo da Zn": { escudo: "/shields/coringudo_da_zn.svg" },
    "Estreia  da Manhã": { escudo: "/shields/estreia__da_manhã.svg" },
    "ArroganTRI/PR": { escudo: "/shields/arrogantri.svg" },
    "Realdonatello": { escudo: "/shields/realdonatello.svg" }
};

const DATA_FILE = path.join(__dirname, 'calendario_2026.json');
const CACHE_DURATION = 2 * 60 * 1000; // Cache reduzido para 2 min (Para pegar parciais rápido)
let apiCache = { saf: null, scores: {}, lastUpdate: 0 };

// --- ROBÔ DE PARCIAIS (A MÁGICA ACONTECE AQUI) ---
async function fetchCartolaData() {
    const now = Date.now();
    
    // Se cache é recente, usa ele
    if (now - apiCache.lastUpdate < CACHE_DURATION && apiCache.saf) {
        console.log("♻️ Usando Cache (Parciais)");
        return apiCache;
    }

    console.log("🌍 BUSCANDO DADOS REAIS DO CARTOLA...");
    const headers = { "User-Agent": "Mozilla/5.0" };

    try {
        // 1. Buscar PARCIAIS GERAIS (Feed de Pontos ao Vivo)
        // Esse endpoint retorna { "atleta_id": { pontuacao: 5.5, ... }, ... }
        let parciais = {};
        try {
            const parciaisRes = await axios.get('https://api.cartola.globo.com/atletas/pontuados', { headers });
            parciais = parciaisRes.data;
            console.log(`📡 Feed de Parciais recebido! Jogadores pontuando: ${Object.keys(parciais).length}`);
        } catch (e) {
            console.warn("⚠️ Parciais indisponíveis (Mercado pode estar aberto ou API instável). Usando zero.");
        }

        // 2. Buscar STATUS (Rodada)
        let rodadaAtual = 1;
        try {
            const statusRes = await axios.get('https://api.cartola.globo.com/mercado/status', { headers });
            rodadaAtual = statusRes.data.rodada_atual;
        } catch (e) {}

        let safResults = [];
        let scoreMap = {};

        // 3. Cruzar dados para cada time
        const promises = Object.keys(TEAM_IDS).map(async (timeName) => {
            const id = TEAM_IDS[timeName];
            if (!id) return; // Se não tem ID, pula

            try {
                // Busca a escalação do time
                const timeRes = await axios.get(`https://api.cartola.globo.com/time/id/${id}`, { headers, timeout: 5000 });
                const timeData = timeRes.data;
                const atletas = timeData.atletas || [];

                // --- CÁLCULO DA PONTUAÇÃO (CRUZAMENTO) ---
                let somaPontosRaiz = 0;
                let somaPontosComCapitao = 0;

                atletas.forEach(atleta => {
                    const atletaId = atleta.atleta_id;
                    let pontosAtleta = 0;

                    // Tenta pegar do FEED AO VIVO (Prioridade)
                    if (parciais[atletaId]) {
                        pontosAtleta = parciais[atletaId].pontuacao || 0;
                    } 
                    // Se não tiver no feed (ainda não jogou ou rodada fechada), tenta pegar do time
                    else if (atleta.pontos_num) {
                        pontosAtleta = atleta.pontos_num;
                    }

                    // Soma Raiz (Sem capitão)
                    somaPontosRaiz += pontosAtleta;

                    // Soma Com Capitão (Lógica simples: se for capitão, x1.5)
                    // Nota: A API de parciais já manda o valor cru, precisamos aplicar a regra se quisermos
                    if (timeData.capitao_id === atletaId) {
                        somaPontosComCapitao += (pontosAtleta * 1.5);
                    } else {
                        somaPontosComCapitao += pontosAtleta;
                    }
                });

                // Regra da Liga: Math.floor (Sem decimais)
                const oficialFinal = Math.floor(somaPontosRaiz);
                const comCapitaoFinal = parseFloat(somaPontosComCapitao.toFixed(2)); // Mantém decimal pra visualização

                // Salva Dados
                scoreMap[timeName] = {
                    oficial: oficialFinal,
                    comCapitao: comCapitaoFinal
                };

                safResults.push({
                    nome: timeName,
                    escudo: TEAM_CONFIG[timeName].escudo,
                    patrimonio: timeData.patrimonio || 0,
                    cartoleiro: timeData.time.nome_cartola || "-"
                });

            } catch (error) {
                console.error(`❌ Erro time ${timeName}: ${error.message}`);
                safResults.push({ nome: timeName, escudo: TEAM_CONFIG[timeName].escudo, patrimonio: 0, cartoleiro: "-" });
            }
        });

        await Promise.all(promises);

        apiCache = { 
            saf: safResults, 
            scores: scoreMap, 
            rodadaAtual: rodadaAtual,
            lastUpdate: now 
        };

        return apiCache;

    } catch (e) {
        console.error("Erro geral no fetch:", e);
        return apiCache;
    }
}

// --- ATUALIZAR JSON ---
async function syncScoresWithCalendar() {
    try {
        const realData = await fetchCartolaData();
        const rodadaKey = `Rodada ${realData.rodadaAtual}`;

        if (!fs.existsSync(DATA_FILE)) return;
        
        let calendario = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        if (calendario[rodadaKey]) {
            console.log(`🔄 Atualizando placares da ${rodadaKey} com PARCIAIS...`);
            
            calendario[rodadaKey] = calendario[rodadaKey].map(jogo => {
                const casaData = realData.scores[jogo.casa];
                const visitData = realData.scores[jogo.visitante];

                if (casaData && visitData) {
                    return {
                        ...jogo,
                        placar_casa: casaData.oficial,
                        placar_visitante: visitData.oficial,
                        placar_casa_capitao: casaData.comCapitao, 
                        placar_visitante_capitao: visitData.comCapitao
                    };
                }
                return jogo;
            });

            fs.writeFileSync(DATA_FILE, JSON.stringify(calendario, null, 4));
        }
    } catch (e) {
        console.error("⚠️ Erro Sync:", e);
    }
}

// --- ROTAS (IGUAIS AO ANTERIOR) ---
app.get('/api/calendario', async (req, res) => {
    try {
        await syncScoresWithCalendar(); 
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        let calendario = JSON.parse(rawData);
        // Injeta escudos
        for (const rodada in calendario) {
            calendario[rodada] = calendario[rodada].map(jogo => ({
                ...jogo,
                escudo_casa: TEAM_CONFIG[jogo.casa] ? TEAM_CONFIG[jogo.casa].escudo : null,
                escudo_visitante: TEAM_CONFIG[jogo.visitante] ? TEAM_CONFIG[jogo.visitante].escudo : null
            }));
        }
        res.json(calendario);
    } catch (e) { res.status(500).json({}); }
});

app.get('/api/classificacao', (req, res) => {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(calculateStandings(JSON.parse(rawData)));
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/estatisticas', async (req, res) => {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const tabela = calculateStandings(JSON.parse(rawData));
        const advStats = calculateAdvancedStats(tabela); 
        const realData = await fetchCartolaData();
        const richest = realData.saf ? realData.saf.sort((a, b) => b.patrimonio - a.patrimonio)[0] : null;

        res.json({ streaks: advStats.streaks, probabilities: advStats.probabilities, saf: richest });
    } catch (e) { res.json({ streaks: null, probabilities: [], saf: null }); }
});

// --- FUNÇÕES AUXILIARES (REPETIR AS DE CÁLCULO AQUI) ---
// (Mantenha as funções calculateStandings e calculateAdvancedStats que você já tem no arquivo)
function calculateStandings(calendario) {
    let tabela = {};
    Object.keys(TEAM_CONFIG).forEach(time => {
        tabela[time] = {
            nome: time, escudo: TEAM_CONFIG[time].escudo,
            P: 0, J: 0, V: 0, E: 0, D: 0, PF: 0, PS: 0, SP: 0, history: []
        };
    });
    const rodadas = Object.keys(calendario).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
    rodadas.forEach(rodada => {
        calendario[rodada].forEach(jogo => {
            if (parseInt(jogo.placar_casa) === 0 && parseInt(jogo.placar_visitante) === 0) return;
            if (!tabela[jogo.casa] || !tabela[jogo.visitante]) return;
            const timeCasa = tabela[jogo.casa];
            const timeVis = tabela[jogo.visitante];
            const pc = parseInt(jogo.placar_casa);
            const pv = parseInt(jogo.placar_visitante);
            timeCasa.J++; timeVis.J++;
            timeCasa.PF += pc; timeVis.PF += pv;
            timeCasa.PS += pv; timeVis.PS += pc;
            timeCasa.SP += (pc - pv); timeVis.SP += (pv - pc);
            if (pc > pv) { timeCasa.V++; timeCasa.P += 3; timeVis.D++; timeCasa.history.push('W'); timeVis.history.push('L'); }
            else if (pv > pc) { timeVis.V++; timeVis.P += 3; timeCasa.D++; timeVis.history.push('W'); timeCasa.history.push('L'); }
            else { timeCasa.E++; timeCasa.P += 1; timeVis.E++; timeVis.P += 1; timeCasa.history.push('D'); timeVis.history.push('D'); }
        });
    });
    return Object.values(tabela).sort((a, b) => b.P - a.P || b.V - a.V || b.SP - a.SP);
}

function calculateAdvancedStats(tabelaArray) {
    let maxWinStreak = 0, maxLoseStreak = 0;
    tabelaArray.forEach(time => {
        let currentW = 0, bestW = 0, currentL = 0, bestL = 0;
        time.history.forEach(res => {
            if (res === 'W') { currentW++; currentL = 0; }
            else if (res === 'L') { currentL++; currentW = 0; }
            else { currentW = 0; currentL = 0; }
            if (currentW > bestW) bestW = currentW;
            if (currentL > bestL) bestL = currentL;
        });
        time.bestWinStreak = bestW;
        time.bestLoseStreak = bestL;
        if (bestW > maxWinStreak) maxWinStreak = bestW;
        if (bestL > maxLoseStreak) maxLoseStreak = bestL;
    });
    const totalPontos = tabelaArray.reduce((acc, t) => acc + t.P, 0);
    const probabilities = tabelaArray.map(t => {
        let prob = totalPontos === 0 ? (100 / tabelaArray.length) : (Math.pow(t.P + 1, 2) / tabelaArray.reduce((acc, x) => acc + Math.pow(x.P + 1, 2), 0) * 100);
        return { nome: t.nome, probTitulo: prob.toFixed(1) };
    }).sort((a, b) => b.probTitulo - a.probTitulo);
    return { streaks: { win: { count: maxWinStreak, teams: tabelaArray.filter(t => t.bestWinStreak === maxWinStreak && maxWinStreak > 0) }, lose: { count: maxLoseStreak, teams: tabelaArray.filter(t => t.bestLoseStreak === maxLoseStreak && maxLoseStreak > 0) } }, probabilities };
}

app.get('/', (req, res) => {
    res.send("🏀 API LFG 2026 está ON FIRE! O servidor está funcionando.");
});

app.listen(PORT, () => {
    console.log(`🔥 Backend LFG rodando na porta ${PORT}`);
});
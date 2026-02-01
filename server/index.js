const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'calendario_2026.json');
const headers = { "User-Agent": "Mozilla/5.0" };

// Mapeamento de Escudos
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

// IDs para buscar SAF
const TEAM_IDS = {
    "ursinho pó ffc": 44801122, "CL11 FC": 13954852, "Decc F.C": 28437271,
    "OPPURETTO FC10": 45956202, "C.E. Olhodaguense": 500739, "Pepethinaikos": 131897,
    "jakte FC": 3708232, "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
    "S.C Milagroso": 2104408, "S.E. BURROW LSU": 17898941, "LUIGIONEL MESSI": 45474101,
    "total 12 Fc": 363579, "Ronaldito": 6714, "Caximbobol FC": 44568116,
    "Everbary": 2184134, "Coringudo da Zn": 51044546, "Estreia  da Manhã": 47686055,
    "ArroganTRI/PR": 8631132, "Realdonatello": 50612459
};

const normalize = (name) => name?.toLowerCase().replace(/\s+/g, ' ').trim();

// Cache de SAF para não travar o load
let cachedSaf = [];

// Função que busca dados de SAF (Patrimônio)
async function updateSafData() {
    console.log("💰 Atualizando dados financeiros (SAF)...");
    const requests = Object.entries(TEAM_IDS).map(async ([nome, id]) => {
        try {
            // Busca dados gerais do time (independente de rodada)
            const r = await axios.get(`https://api.cartola.globo.com/time/id/${id}`, { headers });
            return {
                nome: nome,
                escudo: TEAM_CONFIG[nome]?.escudo,
                patrimonio: r.data.patrimonio || 0,
                cartoleiro: r.data.time?.nome_cartola || "-"
            };
        } catch (e) { return null; }
    });

    const results = await Promise.all(requests);
    cachedSaf = results.filter(item => item !== null);
    console.log(`✅ SAF Atualizada: ${cachedSaf.length} times processados.`);
}

// Atualiza SAF ao iniciar
updateSafData();

// --- ROTA 1: CALENDÁRIO (COM ESCUDOS INJETADOS) ---
app.get('/api/calendario', (req, res) => {
    try {
        const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        
        // Injeta os escudos dinamicamente
        for (const r in rawData) {
            rawData[r] = rawData[r].map(jogo => ({
                ...jogo,
                escudo_casa: TEAM_CONFIG[jogo.casa]?.escudo,
                escudo_visitante: TEAM_CONFIG[jogo.visitante]?.escudo
            }));
        }
        res.json(rawData);
    } catch (e) {
        res.status(500).json({});
    }
});

// --- ROTA 2: CLASSIFICAÇÃO ---
app.get('/api/classificacao', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(calculateStandings(data));
});

// --- ROTA 3: ESTATÍSTICAS (CALCULADAS) ---
app.get('/api/estatisticas', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const tabela = calculateStandings(data);
    
    // Cálculo de Probabilidade (Share de Pontos)
    // Soma total de pontos quadrados para dar peso exponencial aos líderes
    const totalPointsSq = tabela.reduce((acc, t) => acc + Math.pow(t.P, 2), 0) || 1;
    
    const probs = tabela.map(t => ({ 
        nome: t.nome, 
        // Fórmula: (Pontos do time^2 / Total de Pontos^2) * 100
        probTitulo: ((Math.pow(t.P, 2) / totalPointsSq) * 100).toFixed(1)
    })).sort((a,b) => b.probTitulo - a.probTitulo);

    // Maior Patrimônio
    const richest = cachedSaf.sort((a,b) => b.patrimonio - a.patrimonio)[0];

    res.json({ 
        streaks: calculateStreaks(tabela), 
        probabilities: probs, 
        saf: richest 
    });
});

// Lógica de Tabela (Códigos corrigidos para W/D/L)
function calculateStandings(calendario) {
    let tb = {};
    Object.keys(TEAM_CONFIG).forEach(t => tb[t] = { nome: t, escudo: TEAM_CONFIG[t].escudo, P:0, J:0, V:0, E:0, D:0, PF:0, PS:0, SP:0, history:[] });

    Object.keys(calendario).forEach(r => {
        calendario[r].forEach(j => {
            // Pula jogo não realizado (0-0)
            if (j.placar_casa === 0 && j.placar_visitante === 0) return;

            const c = tb[Object.keys(tb).find(k => normalize(k) === normalize(j.casa))];
            const v = tb[Object.keys(tb).find(k => normalize(k) === normalize(j.visitante))];
            
            if (!c || !v) return;

            const pc = parseFloat(j.placar_casa), pv = parseFloat(j.placar_visitante);
            c.J++; v.J++; c.PF+=pc; v.PF+=pv; c.PS+=pv; v.PS+=pc; c.SP+=(pc-pv); v.SP+=(pv-pc);

            // IMPORTANTE: Frontend espera 'W' (Win), 'L' (Loss), 'D' (Draw) para as cores certas!
            if (pc > pv) { 
                c.V++; c.P+=3; v.D++; 
                c.history.push('W'); v.history.push('L'); 
            } else if (pv > pc) { 
                v.V++; v.P+=3; c.D++; 
                v.history.push('W'); c.history.push('L'); 
            } else { 
                c.E++; c.P++; v.E++; v.P++; 
                c.history.push('D'); v.history.push('D'); 
            }
        });
    });
    return Object.values(tb).sort((a,b) => b.P - a.P || b.V - a.V || b.SP - a.SP);
}

// Lógica de Sequências
function calculateStreaks(tabela) {
    let winStreak = { count: 0, teams: [] };
    let loseStreak = { count: 0, teams: [] };

    tabela.forEach(t => {
        let currentW = 0;
        let currentL = 0;
        // Conta de trás pra frente
        for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] === 'W') { currentW++; currentL = 0; }
            else if (t.history[i] === 'L') { currentL++; currentW = 0; }
            else { break; }
        }

        if (currentW > winStreak.count) { winStreak.count = currentW; winStreak.teams = [t]; }
        else if (currentW === winStreak.count && currentW > 0) { winStreak.teams.push(t); }

        if (currentL > loseStreak.count) { loseStreak.count = currentL; loseStreak.teams = [t]; }
        else if (currentL === loseStreak.count && currentL > 0) { loseStreak.teams.push(t); }
    });

    return { win: winStreak, lose: loseStreak };
}

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 LFG Final Server Rodando na Porta ${PORT}`));
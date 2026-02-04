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

// --- VARIÁVEIS GLOBAIS ---
let MEMORY_CACHE = null;
let GLOBAL_STATUS = {
    rodada_atual: 1,
    mercado_aberto: true 
};

// --- CONFIGURAÇÕES ---
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
let cachedSaf = [];

// --- ROBÔ DE CÁLCULO DUPLO (CAPITÃO X NORMAL) ---
async function fetchCartolaData() {
    try {
        const statusRes = await axios.get('https://api.cartola.globo.com/mercado/status', { headers });
        const { rodada_atual, status_mercado } = statusRes.data;
        
        const isAoVivo = status_mercado === 2;
        const rodadaAlvo = isAoVivo ? rodada_atual : rodada_atual - 1;

        GLOBAL_STATUS.rodada_atual = rodada_atual;
        GLOBAL_STATUS.mercado_aberto = !isAoVivo;

        console.log(`📡 Cartola: Rodada ${rodadaAlvo} | Modo: ${isAoVivo ? 'AO VIVO 🔴' : 'Consolidado 🟢'}`);

        let scoreMap = {};
        let mapPontuados = {};
        
        if (isAoVivo) {
            try {
                const rScouts = await axios.get('https://api.cartola.globo.com/atletas/pontuados', { headers });
                mapPontuados = rScouts.data.atletas || {}; 
                console.log(`📊 Scouts carregados: ${Object.keys(mapPontuados).length} atletas.`);
            } catch (e) { console.log("⚠️ Erro nos scouts."); }
        }

        const promises = Object.keys(TEAM_IDS).map(async (timeName) => {
            const id = TEAM_IDS[timeName];
            try {
                const url = isAoVivo 
                    ? `https://api.cartola.globo.com/time/id/${id}`
                    : `https://api.cartola.globo.com/time/id/${id}/${rodadaAlvo}`;
                
                const r = await axios.get(url, { headers });
                
                // CÁLCULO DUPLO
                let pontosNormal = 0; // Soma simples (1x)
                let pontosCapitao = 0; // Soma com bônus (1.5x)

                if (isAoVivo) {
                    const atletasDoTime = r.data.atletas || [];
                    const capitaoId = r.data.capitao_id;

                    atletasDoTime.forEach(atleta => {
                        const idAtleta = atleta.atleta_id;
                        const dadosLive = mapPontuados[idAtleta]; 
                        if (dadosLive) {
                            let pts = dadosLive.pontuacao || 0;
                            
                            // Normal: Soma direta
                            pontosNormal += pts;
                            
                            // Capitão: Aplica regra 1.5x se for o homem
                            if (idAtleta === capitaoId) {
                                pontosCapitao += (pts * 1.5);
                            } else {
                                pontosCapitao += pts;
                            }
                        }
                    });
                    
                    // Remove decimais para visualização limpa no ao vivo
                    pontosNormal = Math.trunc(pontosNormal);
                    pontosCapitao = Math.trunc(pontosCapitao);
                    
                    if (pontosCapitao > 0) process.stdout.write(`[${timeName.substring(0,3)}:${pontosCapitao}] `);

                } else {
                    // Consolidado
                    pontosNormal = r.data.pontos || 0; // O Cartola geralmente entrega o oficial (com capitão) aqui
                    pontosCapitao = r.data.pontos || 0; 
                    cachedSaf.push({ nome: timeName, escudo: TEAM_CONFIG[timeName]?.escudo, patrimonio: r.data.patrimonio || 0 });
                }

                if (isAoVivo || pontosNormal > 0) {
                    scoreMap[normalize(timeName)] = { 
                        normal: pontosNormal, 
                        capitao: pontosCapitao 
                    };
                }
            } catch (e) { }
        });

        await Promise.all(promises);
        console.log("\n✅ Dados Processados.");
        return { scores: scoreMap, rodadaSincronizada: rodadaAlvo };
    } catch (e) { return { scores: {}, rodadaSincronizada: null }; }
}

async function syncAll() {
    if (!MEMORY_CACHE && fs.existsSync(DATA_FILE)) {
        MEMORY_CACHE = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }

    const { scores, rodadaSincronizada } = await fetchCartolaData();
    if (!rodadaSincronizada || !MEMORY_CACHE) return;

    let houveMudanca = false;

    for (const rKey in MEMORY_CACHE) {
        const numRodada = parseInt(rKey.replace(/\D/g, ''));
        if (numRodada !== rodadaSincronizada) continue;

        MEMORY_CACHE[rKey] = MEMORY_CACHE[rKey].map(jogo => {
            const casa = scores[normalize(jogo.casa)];
            const vis = scores[normalize(jogo.visitante)];

            if (casa && vis) {
                houveMudanca = true;
                return { 
                    ...jogo, 
                    // PREENCHE OS DOIS CAMPOS AGORA:
                    placar_casa: casa.normal, 
                    placar_visitante: vis.normal,
                    placar_casa_capitao: casa.capitao,
                    placar_visitante_capitao: vis.capitao
                };
            }
            return jogo;
        });
    }

    if (houveMudanca) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(MEMORY_CACHE, null, 4));
        console.log("💾 MEMÓRIA ATUALIZADA E BACKUP SALVO!");
    }
}

syncAll();

// --- ROTAS ---
app.get('/api/calendario', async (req, res) => {
    console.log("⚡ Servindo dados da RAM...");
    await syncAll();
    
    const dataToSend = JSON.parse(JSON.stringify(MEMORY_CACHE)); 
    for (const r in dataToSend) {
        dataToSend[r] = dataToSend[r].map(jogo => ({
            ...jogo,
            escudo_casa: TEAM_CONFIG[jogo.casa]?.escudo,
            escudo_visitante: TEAM_CONFIG[jogo.visitante]?.escudo
        }));
    }
    res.json(dataToSend);
});

app.get('/api/classificacao', (req, res) => {
    res.json(calculateStandings(MEMORY_CACHE || JSON.parse(fs.readFileSync(DATA_FILE))));
});

app.get('/api/estatisticas', (req, res) => {
    const data = MEMORY_CACHE || JSON.parse(fs.readFileSync(DATA_FILE));
    const tabela = calculateStandings(data);
    const probs = tabela.map(t => ({ nome: t.nome, probTitulo: (t.P * 1.5).toFixed(1) })).sort((a,b) => b.probTitulo - a.probTitulo);
    const richest = cachedSaf.length > 0 ? cachedSaf.sort((a,b) => b.patrimonio - a.patrimonio)[0] : null;
    res.json({ streaks: calculateStreaks(tabela), probabilities: probs, saf: richest });
});

// --- FUNÇÕES MATEMÁTICAS ---

function calculateStandings(calendario) {
    if (!calendario) return [];
    let tb = {};
    Object.keys(TEAM_CONFIG).forEach(t => tb[t] = { nome: t, escudo: TEAM_CONFIG[t].escudo, P:0, J:0, V:0, E:0, D:0, PF:0, PS:0, SP:0, history:[] });

    const rodadaIgnorada = GLOBAL_STATUS.mercado_aberto ? 999 : GLOBAL_STATUS.rodada_atual;

    Object.keys(calendario).forEach(r => {
        const numRodada = parseInt(r.replace(/\D/g, ''));
        if (numRodada >= rodadaIgnorada) return;

        calendario[r].forEach(j => {
            if (j.placar_casa === 0 && j.placar_visitante === 0) return;
            const c = tb[Object.keys(tb).find(k => normalize(k) === normalize(j.casa))];
            const v = tb[Object.keys(tb).find(k => normalize(k) === normalize(j.visitante))];
            if (!c || !v) return;

            // Usa o placar padrão (NORMAL) para a tabela
            const pc = parseFloat(j.placar_casa), pv = parseFloat(j.placar_visitante);
            c.J++; v.J++; c.PF+=pc; v.PF+=pv; c.PS+=pv; v.PS+=pc; c.SP+=(pc-pv); v.SP+=(pv-pc);
            if (pc > pv) { c.V++; c.P+=3; v.D++; c.history.push('W'); v.history.push('L'); }
            else if (pv > pc) { v.V++; v.P+=3; c.D++; v.history.push('W'); c.history.push('L'); }
            else { c.E++; c.P++; v.E++; v.P++; c.history.push('D'); v.history.push('D'); }
        });
    });
    return Object.values(tb).sort((a,b) => b.P - a.P || b.V - a.V || b.SP - a.SP);
}

function calculateStreaks(tabela) {
    let win = { count: 0, teams: [] }, lose = { count: 0, teams: [] };
    tabela.forEach(t => {
        let cw = 0, cl = 0;
        for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] === 'W') { cw++; cl = 0; } else if (t.history[i] === 'L') { cl++; cw = 0; } else break;
        }
        if (cw > win.count) { win.count = cw; win.teams = [t]; } else if (cw === win.count && cw > 0) win.teams.push(t);
        if (cl > lose.count) { lose.count = cl; lose.teams = [t]; } else if (cl === lose.count && cl > 0) lose.teams.push(t);
    });
    return { win, lose };
}

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 LFG FINAL (Captain Fix) Rodando na Porta ${PORT}`));
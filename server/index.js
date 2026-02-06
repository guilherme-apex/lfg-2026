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
let GLOBAL_STATUS = { rodada_atual: 1, mercado_aberto: true };

// --- CONFIGURAÇÕES DE ESCUDOS ---
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

// --- ROBÔ DE CÁLCULO ---
async function fetchCartolaData() {
    try {
        const statusRes = await axios.get('https://api.cartola.globo.com/mercado/status', { headers });
        const { rodada_atual, status_mercado } = statusRes.data;
        
        const isAoVivo = status_mercado === 2;
        const rodadaAlvo = isAoVivo ? rodada_atual : rodada_atual - 1;

        GLOBAL_STATUS.rodada_atual = rodada_atual;
        GLOBAL_STATUS.mercado_aberto = !isAoVivo;

        console.log(`📡 Cartola: Rodada ${rodadaAlvo} | Modo: ${isAoVivo ? 'AO VIVO (Automático)' : 'Consolidado'}`);

        let scoreMap = {};
        let mapPontuados = {};
        let clubesJaJogaram = new Set();

        if (isAoVivo) {
            try {
                const rScouts = await axios.get('https://api.cartola.globo.com/atletas/pontuados', { headers });
                mapPontuados = rScouts.data.atletas || {}; 

                const rPartidas = await axios.get(`https://api.cartola.globo.com/partidas/${rodadaAlvo}`, { headers });
                const partidas = rPartidas.data.partidas || [];
                
                const agora = new Date();

                partidas.forEach(p => {
                    const dataJogo = new Date(p.partida_data);
                    // Buffer de segurança de 2 minutos
                    const bufferTempo = 2 * 60 * 1000; 
                    
                    if ((dataJogo.getTime() + bufferTempo) < agora.getTime()) {
                        clubesJaJogaram.add(p.clube_casa_id);
                        clubesJaJogaram.add(p.clube_visitante_id);
                    }
                });

                console.log(`🕒 ${clubesJaJogaram.size} clubes com jogos iniciados (+2min).`);

            } catch (e) { console.log("⚠️ Erro nos dados."); }
        }

        const promises = Object.keys(TEAM_IDS).map(async (timeName) => {
            const id = TEAM_IDS[timeName];
            try {
                const url = isAoVivo 
                    ? `https://api.cartola.globo.com/time/id/${id}`
                    : `https://api.cartola.globo.com/time/id/${id}/${rodadaAlvo}`;
                
                const r = await axios.get(url, { headers });
                
                let resultado = { normal: 0, capitao: 0 };

                if (isAoVivo) {
                    // Pega o ID do Luxo direto da API
                    const idLuxoAutomatico = r.data.reserva_luxo_id || 0;
                    
                    resultado = processarSubstituicoes(r.data, mapPontuados, timeName, clubesJaJogaram, idLuxoAutomatico);
                } else {
                    resultado.normal = r.data.pontos || 0;
                    resultado.capitao = r.data.pontos || 0; 
                    cachedSaf.push({ nome: timeName, escudo: TEAM_CONFIG[timeName]?.escudo, patrimonio: r.data.patrimonio || 0 });
                }

                if (isAoVivo || resultado.normal > 0) {
                    scoreMap[normalize(timeName)] = { 
                        normal: resultado.normal, 
                        capitao: resultado.capitao 
                    };
                }
            } catch (e) { }
        });

        await Promise.all(promises);
        console.log("\n✅ Dados Processados.");
        return { scores: scoreMap, rodadaSincronizada: rodadaAlvo };
    } catch (e) { return { scores: {}, rodadaSincronizada: null }; }
}

// --- CÉREBRO DA SUBSTITUIÇÃO (COM LUXO AUTOMÁTICO) ---
function processarSubstituicoes(timeData, mapPontuados, timeName, clubesJaJogaram, idLuxoAPI) {
    const titulares = timeData.atletas || [];
    const reservas = timeData.reservas || [];
    const capitaoId = timeData.capitao_id;

    let titularesPorPosicao = {};
    
    titulares.forEach(t => {
        const scout = mapPontuados[t.atleta_id];
        const jogou = !!scout; 
        const pts = scout ? (scout.pontuacao || 0) : 0;
        
        // Jogo iniciou?
        const jogoIniciou = clubesJaJogaram.has(t.clube_id);

        if (!titularesPorPosicao[t.posicao_id]) titularesPorPosicao[t.posicao_id] = [];
        
        titularesPorPosicao[t.posicao_id].push({
            id: t.atleta_id,
            posicao: t.posicao_id,
            pts: pts,
            jogou: jogou,
            jogoIniciou: jogoIniciou, 
            isCapitao: t.atleta_id === capitaoId,
            ativo: true 
        });
    });

    reservas.forEach(reserva => {
        const scout = mapPontuados[reserva.atleta_id];
        const jogou = !!scout;
        const pts = scout ? (scout.pontuacao || 0) : 0;
        
        // Se reserva não jogou ou negativou, nem tentamos
        if (!jogou || pts < 0) return;

        const listaTitulares = titularesPorPosicao[reserva.posicao_id];
        if (!listaTitulares) return;

        // VERIFICAÇÃO AUTOMÁTICA: O ID bate com o que a API mandou?
        const isLuxo = (reserva.atleta_id === idLuxoAPI);

        if (isLuxo) {
            // REGRA DO LUXO
            let piorTitular = null;
            let menorNota = 999;
            
            listaTitulares.forEach(t => {
                // Só considera titular cujo jogo JÁ INICIOU.
                if (t.ativo && t.jogoIniciou && t.pts < menorNota) {
                    menorNota = t.pts;
                    piorTitular = t;
                }
            });

            if (piorTitular && pts > piorTitular.pts) {
                piorTitular.ativo = false; 
                reserva.entrouNoLugarDe = piorTitular;
                reserva.pts = pts; 
            }

        } else {
            // REGRA PADRÃO (MORTAIS):
            const titularFantasma = listaTitulares.find(t => t.ativo && !t.jogou && t.jogoIniciou);
            
            if (titularFantasma) {
                titularFantasma.ativo = false; 
                reserva.entrouNoLugarDe = titularFantasma;
                reserva.pts = pts;
            }
        }
    });

    let totalNormal = 0;
    let totalCapitao = 0;

    // Somas Finais
    Object.values(titularesPorPosicao).flat().forEach(t => {
        if (t.ativo) {
            totalNormal += t.pts;
            totalCapitao += t.isCapitao ? (t.pts * 1.5) : t.pts;
        }
    });

    reservas.forEach(r => {
        if (r.entrouNoLugarDe) {
            totalNormal += r.pts;
            if (r.entrouNoLugarDe.isCapitao) {
                totalCapitao += (r.pts * 1.5);
            } else {
                totalCapitao += r.pts;
            }
        }
    });

    totalNormal = Math.trunc(totalNormal);
    totalCapitao = Math.trunc(totalCapitao);

    if (totalCapitao > 0) process.stdout.write(`[${timeName.substring(0,3)}:${totalCapitao}] `);

    return { normal: totalNormal, capitao: totalCapitao };
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

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 LFG FINAL (Auto Luxo + Time Lock) Rodando na Porta ${PORT}`));
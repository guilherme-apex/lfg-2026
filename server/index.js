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
        // Se mercado fechado (1), queremos a rodada que acabou de acontecer (atual).
        // Se mercado aberto (2), queremos a rodada que está rolando (atual) ou a anterior?
        // Ajuste fino: Se status=1 (fechado), rodada_atual é a próxima. Então queremos a anterior.
        const rodadaAlvo = isAoVivo ? rodada_atual : rodada_atual - 1;

        GLOBAL_STATUS.rodada_atual = rodada_atual;
        GLOBAL_STATUS.mercado_aberto = !isAoVivo;

        console.log(`📡 Cartola: Rodada Alvo ${rodadaAlvo} | Modo: ${isAoVivo ? 'AO VIVO' : 'CONSOLIDADO'}`);

        let scoreMap = {};
        let mapPontuados = {};
        let clubesJaJogaram = new Set();

        // 1. Prepara dados auxiliares (Scouts e Partidas)
        if (isAoVivo) {
            try {
                const rScouts = await axios.get('https://api.cartola.globo.com/atletas/pontuados', { headers });
                mapPontuados = rScouts.data.atletas || {}; 

                const rPartidas = await axios.get(`https://api.cartola.globo.com/partidas/${rodadaAlvo}`, { headers });
                const partidas = rPartidas.data.partidas || [];
                
                const agora = new Date();
                partidas.forEach(p => {
                    if ((new Date(p.partida_data).getTime() + 120000) < agora.getTime()) {
                        clubesJaJogaram.add(p.clube_casa_id);
                        clubesJaJogaram.add(p.clube_visitante_id);
                    }
                });
            } catch (e) { console.log("⚠️ Erro nos scouts ao vivo."); }
        } else {
            // Em modo consolidado, todos os jogos já aconteceram.
            // Não precisamos de scouts globais pois usaremos os dados internos do time.
            // Mas precisamos popular clubesJaJogaram como "todos" para a lógica funcionar.
            // Hack: Deixamos o Set vazio, e na função assumimos que se não é ao vivo, jogoIniciou = true.
        }

        // 2. Processa cada time
        const promises = Object.keys(TEAM_IDS).map(async (timeName) => {
            const id = TEAM_IDS[timeName];
            try {
                // Se consolidado, precisamos buscar no endpoint histórico: /time/id/ID/RODADA
                // Se ao vivo, endpoint padrão: /time/id/ID
                const url = isAoVivo 
                    ? `https://api.cartola.globo.com/time/id/${id}`
                    : `https://api.cartola.globo.com/time/id/${id}/${rodadaAlvo}`;
                
                const r = await axios.get(url, { headers });
                
                // MUDANÇA CRÍTICA: Sempre usamos a função de cálculo manual
                // para remover o bônus do capitão, mesmo em rodadas passadas.
                const idLuxoAuto = r.data.reserva_luxo_id || 0;
                const resultado = processarSubstituicoes(r.data, mapPontuados, timeName, clubesJaJogaram, idLuxoAuto, isAoVivo);

                if (!isAoVivo) {
                    cachedSaf.push({ nome: timeName, escudo: TEAM_CONFIG[timeName]?.escudo, patrimonio: r.data.patrimonio || 0 });
                }

                scoreMap[normalize(timeName)] = { 
                    normal: resultado.normal, 
                    capitao: resultado.capitao 
                };
            } catch (e) { 
                console.log(`Erro ao ler time ${timeName}: ${e.message}`);
            }
        });

        await Promise.all(promises);
        console.log("\n✅ Dados Processados com Sucesso.");
        return { scores: scoreMap, rodadaSincronizada: rodadaAlvo };
    } catch (e) { return { scores: {}, rodadaSincronizada: null }; }
}

// --- CÉREBRO DA SUBSTITUIÇÃO E CÁLCULO ---
    function processarSubstituicoes(timeData, mapPontuados, timeName, clubesJaJogaram, idLuxoAPI, isAoVivo) {
    const titulares = timeData.atletas || [];
    const reservas = timeData.reservas || [];
    const capitaoId = timeData.capitao_id;

    let titularesPorPosicao = {};
    
    // 1. Organiza Titulares e identifica status
    titulares.forEach(t => {
        let pts = 0;
        let jogou = false;

        if (isAoVivo) {
            const scout = mapPontuados[t.atleta_id];
            jogou = !!scout;
            pts = scout ? (scout.pontuacao || 0) : 0;
        } else {
            pts = t.pontos_num || 0;
            // No consolidado, assumimos que todos jogaram inicialmente, 
            // a menos que a pontuação seja exatamente 0.00 E não tenha scout (difícil saber sem scout detalhado).
            // Mas para segurança do consolidado, confiamos no pontos_num.
            jogou = true; 
        }
        
        // Se não é ao vivo, assumimos que o jogo já aconteceu
        const jogoIniciou = isAoVivo ? clubesJaJogaram.has(t.clube_id) : true;

        if (!titularesPorPosicao[t.posicao_id]) titularesPorPosicao[t.posicao_id] = [];
        
        titularesPorPosicao[t.posicao_id].push({
            id: t.atleta_id,
            posicao: t.posicao_id,
            pts: pts,
            jogou: jogou,
            jogoIniciou: jogoIniciou, 
            isCapitao: t.atleta_id === capitaoId,
            preco: t.preco_num || 0, // Importante para critério de desempate
            ativo: true 
        });
    });

    // 2. Processa Reservas
    reservas.forEach(reserva => {
        let pts = 0;
        let jogou = false;

        if (isAoVivo) {
            const scout = mapPontuados[reserva.atleta_id];
            jogou = !!scout;
            pts = scout ? (scout.pontuacao || 0) : 0;
        } else {
            pts = reserva.pontos_num || 0;
            // No consolidado, verifica se pontuou diferente de 0 para considerar que jogou
            jogou = pts !== 0; 
        }

        // REGRA 2.9: "A substituição não acontecerá caso o reserva faça pontuação nula (0) ou negativa (<0)."
        // O código anterior permitia 0. Agora barramos <= 0.
        if ((!jogou || pts <= 0) && isAoVivo) return; 

        const listaTitulares = titularesPorPosicao[reserva.posicao_id];
        if (!listaTitulares) return;

        // Verifica regra do Luxo (cancelada se alguém não jogou)
        const isLuxo = (reserva.atleta_id === idLuxoAPI);
        const temTitularNaoJogou = listaTitulares.some(t => t.jogoIniciou && !t.jogou);

        if (isLuxo && (isAoVivo ? !temTitularNaoJogou : true)) {
            // --- REGRA DE LUXO ---
            // Substitui o pior em campo, se o reserva for melhor.
            let piorTitular = null;
            let menorNota = 999;
            
            listaTitulares.forEach(t => {
                // Desempate Luxo: "Se um dos jogadores for capitão, ele será substituído primeiro"
                // Aqui damos prioridade inversa (queremos achar o PIOR). 
                // Se notas iguais, a regra diz priorizar capitão para SAIR (ser substituído).
                if (t.ativo) {
                    if (t.pts < menorNota) {
                        menorNota = t.pts;
                        piorTitular = t;
                    } else if (t.pts === menorNota) {
                        // Empate na pior nota: Se o atual é capitão, ele vira o alvo preferencial
                        if (t.isCapitao) piorTitular = t;
                    }
                }
            });

            // Só troca se a nota do reserva for MAIOR (estritamente maior)
            if (piorTitular && pts > piorTitular.pts) {
                piorTitular.ativo = false; 
                reserva.entrouNoLugarDe = piorTitular;
                reserva.pts = pts; 
            }

        } else if (isAoVivo) {
            // --- REGRA PADRÃO (Banco Normal) ---
            // Substitui quem não jogou.
            
            // REGRA 2.9.1 - Critério de Desempate para quem sai:
            // 1. Capitão
            // 2. Maior Valor (implementado simplificado)
            
            // Filtra os fantasmas (quem não jogou)
            const fantasmas = listaTitulares.filter(t => t.ativo && !t.jogou && t.jogoIniciou);
            
            if (fantasmas.length > 0) {
                // Ordena para saber quem sai primeiro
                fantasmas.sort((a, b) => {
                    if (a.isCapitao) return -1; // Capitão sai primeiro (para passar a faixa)
                    if (b.isCapitao) return 1;
                    return b.preco - a.preco; // Critério: Maior valor sai primeiro
                });

                const titularSaindo = fantasmas[0];
                titularSaindo.ativo = false;
                reserva.entrouNoLugarDe = titularSaindo;
                reserva.pts = pts;
            }
        }
    });

    // 3. Soma Final (Com Herança de Capitão)
    let totalNormal = 0;
    let totalCapitao = 0;

    Object.values(titularesPorPosicao).flat().forEach(t => {
        if (t.ativo) {
            totalNormal += t.pts; 
            // Se ele é capitão E está ativo, multiplica
            totalCapitao += t.isCapitao ? (t.pts * 1.5) : t.pts; 
        }
    });

    reservas.forEach(r => {
        if (r.entrouNoLugarDe) {
            totalNormal += r.pts;
            
            // REGRA 2.9.1: "se seu capitão não jogar, a braçadeira é passada para o reserva"
            // Verificamos se quem saiu era o capitão.
            if (r.entrouNoLugarDe.isCapitao) {
                totalCapitao += (r.pts * 1.5); // Reserva herda a faixa e o bônus
            } else {
                totalCapitao += r.pts;
            }
        }
    });

    // Arredondamento final
    totalNormal = Math.trunc(totalNormal);
    totalCapitao = Math.trunc(totalCapitao);

    if (totalCapitao > 0) process.stdout.write(`[${timeName.substring(0,3)}:${totalNormal}] `);

    return { normal: totalNormal, capitao: totalCapitao };
}

async function syncAll() {
    if (!MEMORY_CACHE && fs.existsSync(DATA_FILE)) {
        MEMORY_CACHE = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }

    const { scores, rodadaSincronizada } = await fetchCartolaData();
    if (!rodadaSincronizada) return; // Se der erro, aborta

    // Se não temos cache, iniciamos
    if (!MEMORY_CACHE) MEMORY_CACHE = {};

    let houveMudanca = false;

    // Garante que o objeto da rodada existe
    const rodadaKey = `Rodada ${rodadaSincronizada}`;
    
    // IMPORTANTE: Se a rodada não existir no cache OU se estamos forçando atualização
    // Como mudamos a lógica (1.5x -> 1.0x), precisamos forçar a atualização dos valores antigos.
    // O jeito mais seguro é: Se temos scores novos, atualizamos os jogos.
    
    if (MEMORY_CACHE[rodadaKey]) {
        MEMORY_CACHE[rodadaKey] = MEMORY_CACHE[rodadaKey].map(jogo => {
            const casa = scores[normalize(jogo.casa)];
            const vis = scores[normalize(jogo.visitante)];

            if (casa && vis) {
                // Verifica se os valores mudaram (agora sem capitão deve ser menor)
                if (jogo.placar_casa !== casa.normal || jogo.placar_casa_capitao !== casa.capitao) {
                    houveMudanca = true;
                    return { 
                        ...jogo, 
                        placar_casa: casa.normal, 
                        placar_visitante: vis.normal,
                        placar_casa_capitao: casa.capitao,
                        placar_visitante_capitao: vis.capitao
                    };
                }
            }
            return jogo;
        });
    }

    if (houveMudanca) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(MEMORY_CACHE, null, 4));
        console.log("💾 MEMÓRIA ATUALIZADA (Lógica 1x aplicada)!");
    }
}

// syncAll(); // TRAVA DE SEGURANÇA: Usando apenas o JSON local corrigido se necessário, ou descomente para atualizar

// --- ROTAS ---
app.get('/api/calendario', async (req, res) => {
    console.log("⚡ Servindo dados...");
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
    
    // 1. Probabilidade de Título
    const probs = tabela.map(t => ({ 
        nome: t.nome, 
        probTitulo: (t.P * 1.5).toFixed(1) 
    })).sort((a,b) => b.probTitulo - a.probTitulo);

    // 2. Probabilidade de Rebaixamento
    // Lógica: Comparação com a média ou distância do líder. Aqui usaremos distância do líder invertida.
    const liderP = tabela[0]?.P || 1;
    const z4Risk = tabela.map(t => {
        let risco = ((1 - (t.P / liderP)) * 100).toFixed(1);
        if (risco < 0) risco = 0;
        return { nome: t.nome, risk: risco };
    }).sort((a,b) => b.risk - a.risk).slice(0, 5); // Top 5 maiores riscos

    // 3. Rico
    const richest = cachedSaf.length > 0 ? cachedSaf.sort((a,b) => b.patrimonio - a.patrimonio)[0] : null;
    
    // 4. Timestamp
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    res.json({ 
        streaks: calculateStreaks(tabela), 
        probabilities: probs, 
        z4Risk: z4Risk,
        saf: richest,
        lastUpdate: agora 
    });
});

function calculateStandings(calendario) {
    if (!calendario) return [];
    let tb = {};
    Object.keys(TEAM_CONFIG).forEach(t => tb[t] = { nome: t, escudo: TEAM_CONFIG[t].escudo, P:0, J:0, V:0, E:0, D:0, PF:0, PS:0, SP:0, history:[] });
    const rodadaIgnorada = GLOBAL_STATUS.mercado_aberto ? 999 : GLOBAL_STATUS.rodada_atual;

    Object.keys(calendario).forEach(r => {
        const numRodada = parseInt(r.replace(/\D/g, ''));
        // Se mercado está aberto para rodada 3, rodadaIgnorada é 3. Então processamos 1 e 2.
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
    
    return Object.values(tb).map(time => ({
        ...time,
        PF: Math.trunc(time.PF), 
        PS: Math.trunc(time.PS), 
        SP: Math.trunc(time.SP)  
    })).sort((a,b) => b.P - a.P || b.V - a.V || b.SP - a.SP);
}

function calculateStreaks(tabela) {
    // win: Sequência de Vitórias (Apenas 'W')
    // lose: Seca de Vitórias (Contamos 'L' e 'D' como jejum)
    
    let win = { count: 0, teams: [] };
    let lose = { count: 0, teams: [] }; 

    tabela.forEach(t => {
        let cw = 0; // Contador de Vitórias
        let cwl = 0; // Contador de "Sem Vencer" (Winless)

        // 1. Calcula Sequência de Vitórias (Pura)
        for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] === 'W') {
                cw++;
            } else {
                break; // Se empatou ou perdeu, acabou a sequência de vitórias
            }
        }

        // 2. Calcula Seca de Vitórias (Jejum)
        // A lógica é: Enquanto NÃO FOR VITÓRIA, a seca aumenta.
        for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] !== 'W') { // Se for 'L' (Derrota) ou 'D' (Empate)
                cwl++;
            } else {
                break; // Se ganhou, acabou a seca
            }
        }

        // Atualiza o Recorde de Vitórias
        if (cw > win.count) { 
            win.count = cw; 
            win.teams = [t]; 
        } else if (cw === win.count && cw > 0) { 
            win.teams.push(t); 
        }

        // Atualiza o Recorde de Seca
        if (cwl > lose.count) { 
            lose.count = cwl; 
            lose.teams = [t]; 
        } else if (cwl === lose.count && cwl > 0) { 
            lose.teams.push(t); 
        }
    });

    return { win, lose };
}

app.listen(PORT, '0.0.0.0', () => console.log(`🔥 LFG SERVER (Lógica 1x Corrigida) Rodando na Porta ${PORT}`));
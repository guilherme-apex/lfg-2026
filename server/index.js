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
    "jakte FC": 2731370, "BOTTONS CASCAVEL": 19989513, "Wakanda_sport_club": 11829580,
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
        
        let isAoVivo = status_mercado === 2;
        let rodadaAlvo = (status_mercado === 1) ? rodada_atual - 1 : rodada_atual;

        GLOBAL_STATUS.rodada_atual = rodada_atual;
        GLOBAL_STATUS.mercado_aberto = !isAoVivo;

        // --- 🚨 SISTEMA SÊNIOR DE AUTO-CURA (SELF-HEALING) 🚨 ---
        // Evita que rodadas fiquem zeradas se o servidor do Render dormir
        if (MEMORY_CACHE) {
            // Procura da Rodada 1 até a última rodada que já terminou
            for (let r = 1; r < rodada_atual; r++) {
                const rKey = `Rodada ${r}`;
                if (MEMORY_CACHE[rKey] && MEMORY_CACHE[rKey].length > 0) {
                    const primeiroJogo = MEMORY_CACHE[rKey][0];
                    // Se a rodada já passou mas os placares estão zerados, o robô volta no tempo!
                    if (primeiroJogo.placar_casa === 0 && primeiroJogo.placar_visitante === 0) {
                        rodadaAlvo = r;
                        isAoVivo = false; // Rodadas perdidas sempre são tratadas como consolidadas
                        console.log(`🚑 AUTO-CURA ATIVADA: Resgatando a ${rKey} que ficou para trás!`);
                        break; // Resgata uma rodada por vez para não sobrecarregar a Globo
                    }
                }
            }
        }
        // --- FIM DO SISTEMA DE AUTO-CURA ---

        console.log(`📡 Cartola: Rodada Alvo ${rodadaAlvo} | Modo: ${isAoVivo ? 'AO VIVO' : 'CONSOLIDADO'}`);

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
                    if ((new Date(p.partida_data).getTime() + 120000) < agora.getTime()) {
                        clubesJaJogaram.add(p.clube_casa_id);
                        clubesJaJogaram.add(p.clube_visitante_id);
                    }
                });
            } catch (e) { console.log("⚠️ Erro nos scouts ao vivo."); }
        }

        const promises = Object.keys(TEAM_IDS).map(async (timeName) => {
            const id = TEAM_IDS[timeName];
            try {
                const url = isAoVivo 
                    ? `https://api.cartola.globo.com/time/id/${id}`
                    : `https://api.cartola.globo.com/time/id/${id}/${rodadaAlvo}`;
                
                const customHeaders = { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
                };

                const r = await axios.get(url, { headers: customHeaders });
                const dados = r.data;
                
                let normal = 0;
                let capitao = 0;

                if (!isAoVivo) {
                    const pontosTotaisAPI = dados.pontos || 0;
                    const capitaoId = dados.capitao_id;
                    let pontosCapitaoBase = 0;
                    
                    if (dados.atletas) {
                        const cap = dados.atletas.find(a => a.atleta_id === capitaoId);
                        if (cap) pontosCapitaoBase = cap.pontos_num || 0;
                    }
                    
                    if (dados.substituicoes) {
                        dados.substituicoes.forEach(sub => {
                            if (sub.saiu.atleta_id === capitaoId) {
                                pontosCapitaoBase = sub.entrou.pontos_num || 0;
                            }
                        });
                    }

                    const bonusEmbutido = pontosCapitaoBase * 0.5;
                    const ptsReaisComDecimais = pontosTotaisAPI - bonusEmbutido;

                    normal = Math.trunc(ptsReaisComDecimais);
                    capitao = Math.trunc(pontosCapitaoBase);

                } else {
                    const idLuxoAuto = dados.reserva_luxo_id || 0;
                    const resultado = processarSubstituicoes(dados, mapPontuados, timeName, clubesJaJogaram, idLuxoAuto, isAoVivo);
                    normal = resultado.normal;
                    capitao = resultado.capitao;
                }

                if (!isAoVivo) {
                    cachedSaf.push({ nome: timeName, escudo: TEAM_CONFIG[timeName]?.escudo, patrimonio: dados.patrimonio || 0 });
                }

                scoreMap[normalize(timeName)] = { 
                    normal: normal, 
                    capitao: capitao 
                };
            } catch (e) { 
                console.log(`Erro ao ler time ${timeName}: ${e.message}`);
            }
        });

        await Promise.all(promises);
        console.log("\n✅ Dados Processados com Sucesso.");
        return { scores: scoreMap, rodadaSincronizada: rodadaAlvo };
    } catch (e) { 
        return { scores: {}, rodadaSincronizada: null }; 
    }
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
        // Truncamos cada atleta individualmente para seguir a regra de "Inteiro Puro"
        const ptsTruncados = Math.trunc(t.pts); 
        totalNormal += ptsTruncados; 
        totalCapitao += t.isCapitao ? Math.trunc(ptsTruncados * 1.5) : ptsTruncados; 
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
    // 1. Garante que temos o cache inicial
    if (!MEMORY_CACHE && fs.existsSync(DATA_FILE)) {
        MEMORY_CACHE = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }

    // 2. Busca os dados novos da API
    const { scores, rodadaSincronizada } = await fetchCartolaData();
    if (!rodadaSincronizada) return; 

    if (!MEMORY_CACHE) MEMORY_CACHE = {};

    let houveMudanca = false;

    // --- AQUI ESTAVA O ERRO: DEFINIÇÃO PRECISA VIR ANTES DO USO ---
    const rodadaKey = `Rodada ${rodadaSincronizada}`;
    const isRodadaPassada = rodadaSincronizada < GLOBAL_STATUS.rodada_atual;

    if (MEMORY_CACHE[rodadaKey]) {
        MEMORY_CACHE[rodadaKey] = MEMORY_CACHE[rodadaKey].map(jogo => {
            const casa = scores[normalize(jogo.casa)];
            const vis = scores[normalize(jogo.visitante)];

            if (casa && vis) {
                // TRAVA DE SEGURANÇA: Se for rodada passada e já tiver placar, ignora a API
                if (isRodadaPassada && (jogo.placar_casa > 0 || jogo.placar_visitante > 0)) {
                    return jogo; 
                }

                // Verifica se houve mudança nos pontos (agora usando a lógica de inteiros)
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
        console.log(`💾 Snapshot salvo: ${rodadaKey} atualizada.`);
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

app.get('/api/classificacao', async (req, res) => {
    // CORREÇÃO SÊNIOR: Agora a tabela obrigatoriamente espera os placares atualizarem!
    await syncAll(); 
    res.json(calculateStandings(MEMORY_CACHE || JSON.parse(fs.readFileSync(DATA_FILE))));
});

app.get('/api/estatisticas', async (req, res) => {
    // CORREÇÃO SÊNIOR: Estatísticas também esperam a atualização.
    await syncAll(); 
    const data = MEMORY_CACHE || JSON.parse(fs.readFileSync(DATA_FILE));
    const tabela = calculateStandings(data);
    
    // 1. Probabilidade de Título
    const probs = tabela.map(t => ({ 
        nome: t.nome, 
        probTitulo: (t.P * 1.5).toFixed(1) 
    })).sort((a,b) => b.probTitulo - a.probTitulo);

    // 2. Probabilidade de Rebaixamento
    const liderP = tabela[0]?.P || 1;
    const z4Risk = tabela.map(t => {
        let risco = ((1 - (t.P / liderP)) * 100).toFixed(1);
        if (risco < 0) risco = 0;
        return { nome: t.nome, risk: risco };
    }).sort((a,b) => b.risk - a.risk).slice(0, 5); 

    // 3. Rico
    const richest = cachedSaf.length > 0 ? cachedSaf.sort((a,b) => b.patrimonio - a.patrimonio)[0] : null;
    
    // 4. Timestamp
    const agora = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

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
    
    // REGRA SÊNIOR: Trava a tabela para atualizar APENAS quando a rodada acaba de verdade.
    // O Cartola só muda a rodada_atual quando o mercado abre para a próxima (apuração finalizada).
    const rodadaLimite = GLOBAL_STATUS.rodada_atual;

    Object.keys(calendario).forEach(r => {
        const numRodada = parseInt(r.replace(/\D/g, ''));
        
        // Ignora qualquer rodada que seja igual ou maior que a atual.
        // Isso garante que a tabela não sofra mutações ao vivo.
        if (numRodada >= rodadaLimite) return;

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
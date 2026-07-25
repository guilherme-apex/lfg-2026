const axios = require('axios');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, 'calendario_2026.json');
const headers = { 'User-Agent': 'Mozilla/5.0' };

const TEAM_CONFIG = {
    'ursinho pó ffc': { escudo: '/shields/ursinho_pó_ffc.svg' },
    'CL11 FC': { escudo: '/shields/cl11_fc.svg' },
    'Decc F.C': { escudo: '/shields/decc_fc.svg' },
    'OPPURETTO FC10': { escudo: '/shields/oppuretto_fc10.svg' },
    'C.E. Olhodaguense': { escudo: '/shields/olho.png' },
    'Pepethinaikos': { escudo: '/shields/pepethinaikos.svg' },
    'jakte FC': { escudo: '/shields/jakte_fc.svg' },
    'BOTTONS CASCAVEL': { escudo: '/shields/bottons_cascavel.svg' },
    'Wakanda_sport_club': { escudo: '/shields/wakanda_sport_club.svg' },
    'S.C Milagroso': { escudo: '/shields/sc_milagroso.svg' },
    'S.E. BURROW LSU': { escudo: '/shields/se_burrow_lsu.svg' },
    'LUIGIONEL MESSI': { escudo: '/shields/luigionel_messi.svg' },
    'total 12 Fc': { escudo: '/shields/total_12_fc.svg' },
    'Ronaldito': { escudo: '/shields/ronaldito.svg' },
    'Caximbobol FC': { escudo: '/shields/caximbobol_fc.svg' },
    'Everbary': { escudo: '/shields/everbary.svg' },
    'Coringudo da Zn': { escudo: '/shields/coringudo_da_zn.svg' },
    'Estreia  da Manhã': { escudo: '/shields/estreia__da_manhã.svg' },
    'ArroganTRI/PR': { escudo: '/shields/arrogantri.svg' },
    'Realdonatello': { escudo: '/shields/realdonatello.svg' }
};

const TEAM_IDS = {
    'ursinho pó ffc': 44801122, 'CL11 FC': 13954852, 'Decc F.C': 28437271,
    'OPPURETTO FC10': 45956202, 'C.E. Olhodaguense': 500739, 'Pepethinaikos': 131897,
    'jakte FC': 2731370, 'BOTTONS CASCAVEL': 19989513, 'Wakanda_sport_club': 11829580,
    'S.C Milagroso': 2104408, 'S.E. BURROW LSU': 17898941, 'LUIGIONEL MESSI': 45474101,
    'total 12 Fc': 363579, 'Ronaldito': 6714, 'Caximbobol FC': 44568116,
    'Everbary': 2184134, 'Coringudo da Zn': 51044546, 'Estreia  da Manhã': 47686055,
    'ArroganTRI/PR': 8631132, 'Realdonatello': 50612459
};

const normalize = (name) => name?.toLowerCase().replace(/\s+/g, ' ').trim();

function loadCalendario() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveCalendario(calendario) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(calendario, null, 4));
}

function processarSubstituicoes(timeData, mapPontuados, timeName, clubesJaJogaram, idLuxoAPI, isAoVivo) {
    const titulares = timeData.atletas || [];
    const reservas = timeData.reservas || [];
    const capitaoId = timeData.capitao_id;

    let titularesPorPosicao = {};

    titulares.forEach(t => {
        let pts = 0;
        let jogou = false;

        if (isAoVivo) {
            const scout = mapPontuados[t.atleta_id];
            jogou = !!scout;
            pts = scout ? (scout.pontuacao || 0) : 0;
        } else {
            pts = t.pontos_num || 0;
            jogou = true;
        }

        const jogoIniciou = isAoVivo ? clubesJaJogaram.has(t.clube_id) : true;

        if (!titularesPorPosicao[t.posicao_id]) titularesPorPosicao[t.posicao_id] = [];

        titularesPorPosicao[t.posicao_id].push({
            id: t.atleta_id,
            posicao: t.posicao_id,
            pts: pts,
            jogou: jogou,
            jogoIniciou: jogoIniciou,
            isCapitao: t.atleta_id === capitaoId,
            preco: t.preco_num || 0,
            ativo: true
        });
    });

    reservas.forEach(reserva => {
        let pts = 0;
        let jogou = false;

        if (isAoVivo) {
            const scout = mapPontuados[reserva.atleta_id];
            jogou = !!scout;
            pts = scout ? (scout.pontuacao || 0) : 0;
        } else {
            pts = reserva.pontos_num || 0;
            jogou = pts !== 0;
        }

        if ((!jogou || pts <= 0) && isAoVivo) return;

        const listaTitulares = titularesPorPosicao[reserva.posicao_id];
        if (!listaTitulares) return;

        const isLuxo = (reserva.atleta_id === idLuxoAPI);
        const temTitularNaoJogou = listaTitulares.some(t => t.jogoIniciou && !t.jogou);

        if (isLuxo && (isAoVivo ? !temTitularNaoJogou : true)) {
            let piorTitular = null;
            let menorNota = 999;

            listaTitulares.forEach(t => {
                if (t.ativo) {
                    if (t.pts < menorNota) {
                        menorNota = t.pts;
                        piorTitular = t;
                    } else if (t.pts === menorNota) {
                        if (t.isCapitao) piorTitular = t;
                    }
                }
            });

            if (piorTitular && pts > piorTitular.pts) {
                piorTitular.ativo = false;
                reserva.entrouNoLugarDe = piorTitular;
                reserva.pts = pts;
            }
        } else if (isAoVivo) {
            const fantasmas = listaTitulares.filter(t => t.ativo && !t.jogou && t.jogoIniciou);

            if (fantasmas.length > 0) {
                fantasmas.sort((a, b) => {
                    if (a.isCapitao) return -1;
                    if (b.isCapitao) return 1;
                    return b.preco - a.preco;
                });

                const titularSaindo = fantasmas[0];
                titularSaindo.ativo = false;
                reserva.entrouNoLugarDe = titularSaindo;
                reserva.pts = pts;
            }
        }
    });

    let totalNormal = 0;
    let totalCapitao = 0;

    Object.values(titularesPorPosicao).flat().forEach(t => {
        if (t.ativo) {
            const ptsTruncados = Math.trunc(t.pts);
            totalNormal += ptsTruncados;
            totalCapitao += t.isCapitao ? Math.trunc(ptsTruncados * 1.5) : ptsTruncados;
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

    if (totalCapitao > 0) process.stdout.write(`[${timeName.substring(0, 3)}:${totalNormal}] `);

    return { normal: totalNormal, capitao: totalCapitao };
}

async function fetchCartolaData(calendario) {
    try {
        const statusRes = await axios.get('https://api.cartola.globo.com/mercado/status', { headers });
        const { rodada_atual, status_mercado } = statusRes.data;

        let isAoVivo = status_mercado === 2;
        let rodadaAlvo = (status_mercado === 1) ? rodada_atual - 1 : rodada_atual;

        // Auto-cura: resgata rodada passada com placar zerado
        if (calendario) {
            for (let r = 1; r < rodada_atual; r++) {
                const rKey = `Rodada ${r}`;
                if (calendario[rKey] && calendario[rKey].length > 0) {
                    const primeiroJogo = calendario[rKey][0];
                    if (primeiroJogo.placar_casa === 0 && primeiroJogo.placar_visitante === 0) {
                        rodadaAlvo = r;
                        isAoVivo = false;
                        console.log(`AUTO-CURA: Resgatando a ${rKey}`);
                        break;
                    }
                }
            }
        }

        console.log(`Cartola: Rodada Alvo ${rodadaAlvo} | Modo: ${isAoVivo ? 'AO VIVO' : 'CONSOLIDADO'}`);

        let scoreMap = {};
        let mapPontuados = {};
        let clubesJaJogaram = new Set();
        const safList = [];

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
            } catch (e) {
                console.log('Erro nos scouts ao vivo.');
            }
        }

        const customHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        const promises = Object.keys(TEAM_IDS).map(async (timeName) => {
            const id = TEAM_IDS[timeName];
            try {
                const url = isAoVivo
                    ? `https://api.cartola.globo.com/time/id/${id}`
                    : `https://api.cartola.globo.com/time/id/${id}/${rodadaAlvo}`;

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
                    const resultado = processarSubstituicoes(
                        dados, mapPontuados, timeName, clubesJaJogaram, idLuxoAuto, isAoVivo
                    );
                    normal = resultado.normal;
                    capitao = resultado.capitao;
                }

                if (!isAoVivo) {
                    safList.push({
                        nome: timeName,
                        escudo: TEAM_CONFIG[timeName]?.escudo,
                        patrimonio: dados.patrimonio || 0
                    });
                }

                scoreMap[normalize(timeName)] = { normal, capitao };
            } catch (e) {
                console.log(`Erro ao ler time ${timeName}: ${e.message}`);
            }
        });

        await Promise.all(promises);
        console.log('\nDados processados com sucesso.');

        return {
            scores: scoreMap,
            rodadaSincronizada: rodadaAlvo,
            rodada_atual,
            isAoVivo,
            mercado_aberto: !isAoVivo,
            safList
        };
    } catch (e) {
        console.log(`Falha ao buscar Cartola: ${e.message}`);
        return {
            scores: {},
            rodadaSincronizada: null,
            rodada_atual: null,
            isAoVivo: false,
            mercado_aberto: true,
            safList: []
        };
    }
}

function applyScores(calendario, scores, rodadaSincronizada, rodadaAtual) {
    const rodadaKey = `Rodada ${rodadaSincronizada}`;
    const isRodadaPassada = rodadaSincronizada < rodadaAtual;
    let houveMudanca = false;

    if (!calendario[rodadaKey]) return { calendario, houveMudanca };

    calendario[rodadaKey] = calendario[rodadaKey].map(jogo => {
        const casa = scores[normalize(jogo.casa)];
        const vis = scores[normalize(jogo.visitante)];

        if (casa && vis) {
            if (isRodadaPassada && (jogo.placar_casa > 0 || jogo.placar_visitante > 0)) {
                return jogo;
            }

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

    return { calendario, houveMudanca };
}

function calculateStandings(calendario, rodadaLimite) {
    if (!calendario) return [];
    const limite = rodadaLimite || 999;
    let tb = {};
    Object.keys(TEAM_CONFIG).forEach(t => {
        tb[t] = {
            nome: t, escudo: TEAM_CONFIG[t].escudo,
            P: 0, J: 0, V: 0, E: 0, D: 0, PF: 0, PS: 0, SP: 0, history: []
        };
    });

    Object.keys(calendario).forEach(r => {
        const numRodada = parseInt(r.replace(/\D/g, ''), 10);
        if (numRodada >= limite) return;

        calendario[r].forEach(j => {
            if (j.placar_casa === 0 && j.placar_visitante === 0) return;
            const c = tb[Object.keys(tb).find(k => normalize(k) === normalize(j.casa))];
            const v = tb[Object.keys(tb).find(k => normalize(k) === normalize(j.visitante))];
            if (!c || !v) return;

            const pc = parseFloat(j.placar_casa);
            const pv = parseFloat(j.placar_visitante);
            c.J++; v.J++;
            c.PF += pc; v.PF += pv;
            c.PS += pv; v.PS += pc;
            c.SP += (pc - pv); v.SP += (pv - pc);

            if (pc > pv) {
                c.V++; c.P += 3; v.D++;
                c.history.push('W'); v.history.push('L');
            } else if (pv > pc) {
                v.V++; v.P += 3; c.D++;
                v.history.push('W'); c.history.push('L');
            } else {
                c.E++; c.P++; v.E++; v.P++;
                c.history.push('D'); v.history.push('D');
            }
        });
    });

    return Object.values(tb).map(time => ({
        ...time,
        PF: Math.trunc(time.PF),
        PS: Math.trunc(time.PS),
        SP: Math.trunc(time.SP)
    })).sort((a, b) => b.P - a.P || b.V - a.V || b.SP - a.SP);
}

function calculateStreaks(tabela) {
    let win = { count: 0, teams: [] };
    let lose = { count: 0, teams: [] };

    tabela.forEach(t => {
        let cw = 0;
        let cwl = 0;

        for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] === 'W') cw++;
            else break;
        }

        for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] !== 'W') cwl++;
            else break;
        }

        if (cw > win.count) {
            win.count = cw;
            win.teams = [t];
        } else if (cw === win.count && cw > 0) {
            win.teams.push(t);
        }

        if (cwl > lose.count) {
            lose.count = cwl;
            lose.teams = [t];
        } else if (cwl === lose.count && cwl > 0) {
            lose.teams.push(t);
        }
    });

    return { win, lose };
}

function enrichCalendario(calendario) {
    const dataToSend = JSON.parse(JSON.stringify(calendario));
    for (const r in dataToSend) {
        dataToSend[r] = dataToSend[r].map(jogo => ({
            ...jogo,
            escudo_casa: TEAM_CONFIG[jogo.casa]?.escudo,
            escudo_visitante: TEAM_CONFIG[jogo.visitante]?.escudo
        }));
    }
    return dataToSend;
}

function buildEstatisticas(tabela, safList) {
    const probs = tabela.map(t => ({
        nome: t.nome,
        probTitulo: (t.P * 1.5).toFixed(1)
    })).sort((a, b) => b.probTitulo - a.probTitulo);

    const liderP = tabela[0]?.P || 1;
    const z4Risk = tabela.map(t => {
        let risco = ((1 - (t.P / liderP)) * 100).toFixed(1);
        if (risco < 0) risco = 0;
        return { nome: t.nome, risk: risco };
    }).sort((a, b) => b.risk - a.risk).slice(0, 5);

    const richest = safList.length > 0
        ? [...safList].sort((a, b) => b.patrimonio - a.patrimonio)[0]
        : null;

    const agora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

    return {
        streaks: calculateStreaks(tabela),
        probabilities: probs,
        z4Risk,
        saf: richest,
        lastUpdate: agora
    };
}

/**
 * Sync Cartola -> calendario_2026.json and return snapshot payloads for static hosting.
 */
async function runSync() {
    let calendario = loadCalendario();
    const fetched = await fetchCartolaData(calendario);

    let syncOk = false;
    let houveMudanca = false;

    if (fetched.rodadaSincronizada) {
        const applied = applyScores(
            calendario,
            fetched.scores,
            fetched.rodadaSincronizada,
            fetched.rodada_atual
        );
        calendario = applied.calendario;
        houveMudanca = applied.houveMudanca;
        if (houveMudanca) {
            saveCalendario(calendario);
            console.log(`Snapshot salvo: Rodada ${fetched.rodadaSincronizada}`);
        }
        syncOk = true;
    } else {
        console.log('Usando snapshot local (Cartola indisponivel).');
    }

    const rodadaLimite = fetched.rodada_atual || inferRodadaLimite(calendario);
    const tabela = calculateStandings(calendario, rodadaLimite);
    const estatisticas = buildEstatisticas(tabela, fetched.safList || []);
    const nowIso = new Date().toISOString();

    return {
        calendario: enrichCalendario(calendario),
        classificacao: tabela,
        estatisticas,
        meta: {
            lastSyncAt: nowIso,
            lastUpdate: estatisticas.lastUpdate,
            rodada: rodadaLimite,
            live: !!fetched.isAoVivo,
            mercado_aberto: fetched.mercado_aberto !== false,
            syncOk,
            houveMudanca
        }
    };
}

function inferRodadaLimite(calendario) {
    const nums = Object.keys(calendario || {})
        .map(k => parseInt(k.replace(/\D/g, ''), 10))
        .filter(n => !Number.isNaN(n));
    if (!nums.length) return 1;
    // Se não temos status da API, libera tabela até a última rodada com placar
    let lastComPlacar = 0;
    for (const n of nums.sort((a, b) => a - b)) {
        const jogos = calendario[`Rodada ${n}`] || [];
        const temPlacar = jogos.some(j => j.placar_casa > 0 || j.placar_visitante > 0);
        if (temPlacar) lastComPlacar = n;
    }
    return lastComPlacar + 1;
}

function writePublicData(outDir, snapshot) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'calendario.json'), JSON.stringify(snapshot.calendario));
    fs.writeFileSync(path.join(outDir, 'classificacao.json'), JSON.stringify(snapshot.classificacao));
    fs.writeFileSync(path.join(outDir, 'estatisticas.json'), JSON.stringify(snapshot.estatisticas));
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(snapshot.meta, null, 2));
}

module.exports = {
    TEAM_CONFIG,
    TEAM_IDS,
    DATA_FILE,
    normalize,
    loadCalendario,
    saveCalendario,
    calculateStandings,
    calculateStreaks,
    enrichCalendario,
    buildEstatisticas,
    runSync,
    writePublicData,
    inferRodadaLimite
};

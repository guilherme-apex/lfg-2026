/**
 * API local opcional (dev). Em produção o front lê JSON estático na Vercel.
 * Start: cd server && npm start
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const {
    runSync,
    writePublicData,
    loadCalendario,
    enrichCalendario,
    calculateStandings,
    buildEstatisticas,
    inferRodadaLimite
} = require('./lfg_engine');

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_DATA = path.join(__dirname, '..', 'client', 'public', 'data');

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

let lastSnapshot = null;
let syncing = false;

async function refresh(force = false) {
    if (syncing && !force) return lastSnapshot;
    syncing = true;
    try {
        lastSnapshot = await runSync();
        writePublicData(PUBLIC_DATA, lastSnapshot);
        return lastSnapshot;
    } finally {
        syncing = false;
    }
}

function snapshotOrLocal() {
    if (lastSnapshot) return lastSnapshot;
    const calendario = loadCalendario();
    const rodada = inferRodadaLimite(calendario);
    const tabela = calculateStandings(calendario, rodada);
    const estatisticas = buildEstatisticas(tabela, []);
    return {
        calendario: enrichCalendario(calendario),
        classificacao: tabela,
        estatisticas,
        meta: {
            lastSyncAt: null,
            lastUpdate: estatisticas.lastUpdate,
            rodada,
            live: false,
            mercado_aberto: true,
            syncOk: false,
            houveMudanca: false
        }
    };
}

app.get('/api/health', (req, res) => {
    const s = snapshotOrLocal();
    res.json({
        ok: true,
        lastSyncAt: s.meta.lastSyncAt,
        rodada: s.meta.rodada,
        live: s.meta.live
    });
});

app.get('/api/calendario', async (req, res) => {
    const s = snapshotOrLocal();
    res.json(s.calendario);
});

app.get('/api/classificacao', async (req, res) => {
    const s = snapshotOrLocal();
    res.json(s.classificacao);
});

app.get('/api/estatisticas', async (req, res) => {
    const s = snapshotOrLocal();
    res.json(s.estatisticas);
});

app.get('/api/meta', async (req, res) => {
    const s = snapshotOrLocal();
    res.json(s.meta);
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`LFG SERVER (dev local) na porta ${PORT}`);
    console.log('Producao: front usa /data/*.json na Vercel (sem Render).');
    refresh().catch((e) => console.log('Sync inicial falhou:', e.message));
    setInterval(() => {
        refresh().catch((e) => console.log('Sync periodico falhou:', e.message));
    }, 60_000);
});

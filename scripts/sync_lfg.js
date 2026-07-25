#!/usr/bin/env node
/**
 * CLI: sync Cartola -> server/calendario_2026.json + client/public/data/*.json
 * Uso: node scripts/sync_lfg.js
 * Depende de: server/node_modules (axios)
 */
const path = require('path');
const fs = require('fs');

const serverDir = path.join(__dirname, '..', 'server');
const outDir = path.join(__dirname, '..', 'client', 'public', 'data');

// Resolve axios from server/package.json deps
module.paths.unshift(path.join(serverDir, 'node_modules'));

const { runSync, writePublicData } = require(path.join(serverDir, 'lfg_engine.js'));

async function main() {
    console.log('LFG sync iniciando...');
    const snapshot = await runSync();
    writePublicData(outDir, snapshot);
    console.log(`JSON estatico gravado em ${outDir}`);
    console.log(JSON.stringify({
        lastSyncAt: snapshot.meta.lastSyncAt,
        rodada: snapshot.meta.rodada,
        live: snapshot.meta.live,
        syncOk: snapshot.meta.syncOk,
        houveMudanca: snapshot.meta.houveMudanca
    }));
}

main().catch((err) => {
    console.error('LFG sync falhou:', err);
    // Ainda assim tenta gravar snapshot local se existir calendario
    try {
        const { loadCalendario, enrichCalendario, calculateStandings, buildEstatisticas, inferRodadaLimite, writePublicData: write } = require(path.join(serverDir, 'lfg_engine.js'));
        const calendario = loadCalendario();
        const rodada = inferRodadaLimite(calendario);
        const tabela = calculateStandings(calendario, rodada);
        const estatisticas = buildEstatisticas(tabela, []);
        write(outDir, {
            calendario: enrichCalendario(calendario),
            classificacao: tabela,
            estatisticas,
            meta: {
                lastSyncAt: new Date().toISOString(),
                lastUpdate: estatisticas.lastUpdate,
                rodada,
                live: false,
                mercado_aberto: true,
                syncOk: false,
                houveMudanca: false,
                error: String(err.message || err)
            }
        });
        console.log('Snapshot local gravado apos falha de sync.');
        process.exit(0);
    } catch (e2) {
        console.error(e2);
        process.exit(1);
    }
});

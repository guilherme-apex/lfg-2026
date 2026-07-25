import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Table from './components/Table';
import Matches from './components/Matches';
import Stats from './components/Stats';

// Producao: JSON estatico na Vercel. Dev: API local opcional (server/).
const DATA_BASE = import.meta.env.PROD
  ? '/data'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const isStatic = import.meta.env.PROD;

function dataUrl(name) {
  if (isStatic) return `${DATA_BASE}/${name}.json`;
  return `${DATA_BASE}/${name}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('tabela');

  const [classificacao, setClassificacao] = useState([]);
  const [calendario, setCalendario] = useState({});
  const [stats, setStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('...');
  const [live, setLive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const opts = { cache: 'no-store' };

      const [resClass, resCal, resStats, resMeta] = await Promise.all([
        fetch(`${dataUrl('classificacao')}?t=${timestamp}`, opts),
        fetch(`${dataUrl('calendario')}?t=${timestamp}`, opts),
        fetch(`${dataUrl('estatisticas')}?t=${timestamp}`, opts),
        fetch(`${dataUrl('meta')}?t=${timestamp}`, opts).catch(() => null)
      ]);

      if (!resClass.ok || !resCal.ok || !resStats.ok) {
        throw new Error('Falha ao carregar dados da liga');
      }

      const dataClass = await resClass.json();
      const dataCal = await resCal.json();
      const dataStats = await resStats.json();
      const dataMeta = resMeta && resMeta.ok ? await resMeta.json() : null;

      setClassificacao(dataClass);
      setCalendario(dataCal);
      setStats(dataStats);

      if (dataMeta?.lastUpdate) {
        setLastUpdate(dataMeta.lastUpdate);
      } else if (dataStats.lastUpdate) {
        setLastUpdate(dataStats.lastUpdate);
      }

      if (typeof dataMeta?.live === 'boolean') {
        setLive(dataMeta.live);
      }

      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('ERRO NA BUSCA:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Estatico: ~5 min (Actions). Dev/local: 30s.
    const ms = isStatic ? (live ? 60_000 : 120_000) : 30_000;
    const intervalo = setInterval(fetchData, ms);
    return () => clearInterval(intervalo);
  }, [fetchData, live]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-lfg-green mb-4"></div>
        <p className="font-bold">Buscando Parciais Ao Vivo...</p>
      </div>
    );
  }

  if (error && !classificacao.length) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Erro de Conexão</h2>
        <p className="text-gray-300 mb-4">{error}</p>
        <button onClick={() => { setLoading(true); fetchData(); }} className="px-6 py-2 bg-gray-700 rounded">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans pb-12 flex flex-col">

      <div className="w-full relative">
        <Header />
        <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full z-20">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${live ? 'bg-lfg-green' : 'bg-gray-400'}`}></div>
            <span className="text-[10px] text-gray-300 font-mono tracking-tight">
                Atualizado às {lastUpdate}h
            </span>
        </div>
      </div>

      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-6">

        <div className="bg-card-bg rounded-xl shadow-lg border border-white/5 overflow-hidden w-full flex flex-col">

          <div className="flex w-full border-b border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('tabela')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider text-center transition-colors ${
                activeTab === 'tabela' ? 'bg-lfg-green text-dark-bg' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setActiveTab('confrontos')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider text-center transition-colors ${
                activeTab === 'confrontos' ? 'bg-lfg-green text-dark-bg' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              Jogos
            </button>
            <button
              onClick={() => setActiveTab('estatisticas')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider text-center transition-colors ${
                activeTab === 'estatisticas' ? 'bg-lfg-green text-dark-bg' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              Stats
            </button>
          </div>

          <div className="p-0 w-full bg-card-bg">

            {activeTab === 'tabela' && (
              <div className="p-4 md:p-6 w-full overflow-x-auto">
                 <Table data={classificacao} />
              </div>
            )}

            {activeTab === 'confrontos' && (
              <div className="p-4 md:p-6 mobile-card-view-container">
                 <Matches data={calendario || {}} />
              </div>
            )}

            {activeTab === 'estatisticas' && stats && (
               <div className="w-full overflow-x-auto p-4">
                  <Stats data={stats} />
               </div>
            )}

          </div>
        </div>
      </main>

      <footer className="text-center text-gray-600 text-xs py-6">
        <p>LFG 2026 © Liga Férias Garantidas</p>
      </footer>
    </div>
  );
}

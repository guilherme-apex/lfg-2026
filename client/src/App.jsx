import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Table from './components/Table';
import Matches from './components/Matches';
import Stats from './components/Stats';

// LINK DA API (Inteligente: Local ou Prod)
const API_URL = import.meta.env.PROD 
  ? 'https://lfg-2026.onrender.com' 
  : 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState('tabela');
   
  // Dados
  const [classificacao, setClassificacao] = useState([]);
  const [calendario, setCalendario] = useState({});
  const [stats, setStats] = useState(null);
  
  // Estado para guardar a hora da última atualização
  const [lastUpdate, setLastUpdate] = useState("...");

  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função de Busca de Dados
  const fetchData = async () => {
    try {
      // O SEGREDO DO SUCESSO: Timestamp (?t=...)
      // Isso obriga o navegador a baixar os dados novos AGORA.
      const timestamp = new Date().getTime();
      
      console.log(`🏀 Atualizando dados... (Carimbo: ${timestamp})`);

      const [resClass, resCal, resStats] = await Promise.all([
        fetch(`${API_URL}/api/classificacao?t=${timestamp}`),
        fetch(`${API_URL}/api/calendario?t=${timestamp}`),
        fetch(`${API_URL}/api/estatisticas?t=${timestamp}`)
      ]);

      const dataClass = await resClass.json();
      const dataCal = await resCal.json();
      const dataStats = await resStats.json();

      setClassificacao(dataClass);
      setCalendario(dataCal);
      setStats(dataStats);
      
      // Captura o timestamp vindo da API Stats
      if (dataStats.lastUpdate) {
          setLastUpdate(dataStats.lastUpdate);
      }

      setLoading(false);

    } catch (err) {
      console.error("❌ ERRO NA BUSCA:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Busca imediata ao carregar a página
    fetchData();

    // 2. AUTO-REFRESH: Atualiza sozinho a cada 30 segundos (Placar de Aeroporto)
    const intervalo = setInterval(fetchData, 30000);

    // Limpeza ao fechar a aba
    return () => clearInterval(intervalo);
  }, []);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-lfg-green mb-4"></div>
        <p className="font-bold">Buscando Parciais Ao Vivo...</p>
      </div>
    );
  }

  // --- ERRO ---
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Erro de Conexão</h2>
        <p className="text-gray-300 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-700 rounded">Tentar Novamente</button>
      </div>
    );
  }

  // --- APP PRINCIPAL ---
  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans pb-12 flex flex-col">
      
      {/* 1. HEADER + TIMESTAMP */}
      <div className="w-full relative">
        <Header />
        {/* Timestamp Posicionado Absolutamente no Topo/Direita (Responsivo) */}
        <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full z-20">
            <div className="w-1.5 h-1.5 bg-lfg-green rounded-full animate-pulse"></div>
            <span className="text-[10px] text-gray-300 font-mono tracking-tight">
                Atualizado às {lastUpdate}h
            </span>
        </div>
      </div>

      {/* 2. CONTEÚDO */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-6">
        
        {/* Container dos Cards */}
        <div className="bg-card-bg rounded-xl shadow-lg border border-white/5 overflow-hidden w-full flex flex-col">
          
          {/* Navegação de Abas */}
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

          {/* Área de Conteúdo */}
          <div className="p-0 w-full bg-card-bg"> 
            
            {activeTab === 'tabela' && (
              // ADIÇÃO: overflow-x-auto para a tabela grande não quebrar no mobile
              <div className="p-4 md:p-6 w-full overflow-x-auto">
                 <Table data={classificacao} />
              </div>
            )}

            {activeTab === 'confrontos' && (
              // ADIÇÃO: Classe 'mobile-card-view-container' para ativar o CSS dos cards
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
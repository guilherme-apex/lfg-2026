import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Table from './components/Table';      // Importado como Table
import Matches from './components/Matches';  // Importado como Matches
import Stats from './components/Stats';

// LINK CORRETO
const API_URL = 'https://lfg-2026.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState('tabela');
  
  // Dados
  const [classificacao, setClassificacao] = useState([]);
  const [calendario, setCalendario] = useState({});
  const [stats, setStats] = useState(null);

  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🏀 LFG: Buscando dados em:", API_URL);

        const [resClass, resCal, resStats] = await Promise.all([
          fetch(`${API_URL}/api/classificacao`),
          fetch(`${API_URL}/api/calendario`),
          fetch(`${API_URL}/api/estatisticas`)
        ]);

        if (!resClass.ok || !resCal.ok || !resStats.ok) {
          throw new Error("Erro ao buscar dados da API.");
        }

        const dataClass = await resClass.json();
        const dataCal = await resCal.json();
        const dataStats = await resStats.json();

        setClassificacao(dataClass);
        setCalendario(dataCal);
        setStats(dataStats);
        setLoading(false);

      } catch (err) {
        console.error("Erro:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-lfg-green mb-4"></div>
        <p className="font-bold">Carregando LFG 2026...</p>
      </div>
    );
  }

  // --- ERRO ---
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Erro de Conexão</h2>
        <p className="text-gray-300 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-700 rounded">Recarregar</button>
      </div>
    );
  }

  // --- APP PRINCIPAL ---
  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans pb-12 flex flex-col">
      
      {/* 1. HEADER */}
      <div className="w-full">
        <Header />
      </div>

      {/* 2. CONTEÚDO */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-6">
        
        {/* Container dos Cards */}
        <div className="bg-card-bg rounded-xl shadow-lg border border-white/5 overflow-hidden w-full">
          
          {/* Navegação de Abas */}
          <div className="flex w-full border-b border-white/10">
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
          <div className="p-4 md:p-6 min-h-[400px]">
            
            {/* Lógica de Exibição Corrigida */}
            {activeTab === 'tabela' && (
              classificacao.length > 0 ? (
                // AQUI ESTAVA O ERRO: Tabela -> Table
                <Table classificacao={classificacao} />
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>A Tabela está sendo processada...</p>
                  <p className="text-xs mt-2">(Aguardando atualização oficial do Cartola)</p>
                </div>
              )
            )}

            {activeTab === 'confrontos' && (
               // AQUI ESTAVA O ERRO: Confrontos -> Matches
               <Matches calendario={calendario || {}} />
            )}

            {activeTab === 'estatisticas' && (
               <Stats data={stats} />
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
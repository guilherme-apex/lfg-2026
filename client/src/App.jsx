import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabela from './components/Table';        
import Confrontos from './components/Matches';
import Stats from './components/Stats';

// --- CONFIGURAÇÃO DA API (A MÁGICA ACONTECE AQUI) ---
// Se estiver na Vercel, usa a variável de ambiente. Se estiver no PC, usa localhost.
const API_URL = 'https://lfg-2026.onrender.com/';

export default function App() {
  const [activeTab, setActiveTab] = useState('tabela');
  
  // Dados
  const [classificacao, setClassificacao] = useState([]);
  const [calendario, setCalendario] = useState({});
  const [stats, setStats] = useState(null);

  // Estados de Controle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🏀 LFG System: Conectando em:", API_URL);

        // Dispara as 3 requisições ao mesmo tempo para ser mais rápido
        const [resClass, resCal, resStats] = await Promise.all([
          fetch(`${API_URL}/api/classificacao`),
          fetch(`${API_URL}/api/calendario`),
          fetch(`${API_URL}/api/estatisticas`)
        ]);

        // Verifica se deu erro em alguma delas
        if (!resClass.ok || !resCal.ok || !resStats.ok) {
          throw new Error("Falha na resposta do servidor (Render).");
        }

        const dataClass = await resClass.json();
        const dataCal = await resCal.json();
        const dataStats = await resStats.json();

        setClassificacao(dataClass);
        setCalendario(dataCal);
        setStats(dataStats);
        
        // Remove o loading e garante que não tem erro
        setLoading(false);
        setError(null);

      } catch (err) {
        console.error("❌ Erro fatal no App:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- TELA DE CARREGAMENTO ---
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-lfg-green mb-4"></div>
        <p className="animate-pulse font-bold text-lg">Carregando temporada 2026...</p>
        <p className="text-xs text-gray-500 mt-2">Conectando ao servidor...</p>
      </div>
    );
  }

  // --- TELA DE ERRO (SE A CONEXÃO FALHAR) ---
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-xl max-w-md backdrop-blur-sm">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Falha na Conexão</h2>
          <p className="text-gray-300 mb-4 text-sm">
            Não conseguimos falar com o servidor. O Render pode estar "dormindo" (Free Tier).
          </p>
          <div className="bg-black/50 p-3 rounded text-xs font-mono text-left mb-4">
            <p className="text-gray-500">Tentativa em:</p>
            <p className="text-yellow-400 break-all">{API_URL}</p>
            <p className="text-gray-500 mt-2">Erro:</p>
            <p className="text-red-300">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-lfg-green text-dark-bg font-bold rounded hover:bg-green-400 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // --- APLICAÇÃO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans pb-12">
      <Header />

      <main className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-card-bg rounded-xl shadow-lg border border-white/5 overflow-hidden min-h-[500px]">
          {/* Navegação de Abas */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('tabela')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'tabela' ? 'bg-lfg-green text-dark-bg' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Classificação
            </button>
            <button
              onClick={() => setActiveTab('confrontos')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'confrontos' ? 'bg-lfg-green text-dark-bg' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Confrontos
            </button>
            <button
              onClick={() => setActiveTab('estatisticas')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'estatisticas' ? 'bg-lfg-green text-dark-bg' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Estatísticas
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-4 md:p-6 animate-fade-in">
            {activeTab === 'tabela' && <Tabela classificacao={classificacao} />}
            {activeTab === 'confrontos' && <Confrontos calendario={calendario} />}
            {activeTab === 'estatisticas' && <Stats data={stats} />}
          </div>
        </div>
      </main>

      <footer className="text-center text-gray-600 text-xs py-8 mt-4">
        <p>LFG 2026 © Desenvolvido com dados oficiais do Cartola FC</p>
      </footer>
    </div>
  );
}
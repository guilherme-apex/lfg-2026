import React, { useState, useEffect } from 'react';

// --- COMPONENTES VISUAIS (Mantendo os mesmos) ---
// (Vou simplificar os imports aqui para focar na lógica, mas mantenha seus imports de componentes se estiverem em arquivos separados)
// Se você tem os componentes Stats, Tabela, Confrontos no mesmo arquivo ou importados, mantenha-os.
// Vou assumir que você está importando eles:
import Header from './components/Header';
import Stats from './components/Stats';
import Confrontos from './components/Confrontos';
import Tabela from './components/Tabela';

// --- CONFIGURAÇÃO DA API ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState('tabela');
  const [classificacao, setClassificacao] = useState([]);
  const [calendario, setCalendario] = useState({});
  const [stats, setStats] = useState(null);
  
  // ESTADOS DE DIAGNÓSTICO
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Função para carregar tudo de uma vez
    const fetchData = async () => {
      try {
        console.log("Tentando conectar em:", API_URL); // Log no console

        // 1. Busca Classificação
        const resClass = await fetch(`${API_URL}/api/classificacao`);
        if (!resClass.ok) throw new Error(`Erro Classificação: ${resClass.status}`);
        const dataClass = await resClass.json();
        setClassificacao(dataClass);

        // 2. Busca Calendário
        const resCal = await fetch(`${API_URL}/api/calendario`);
        if (!resCal.ok) throw new Error(`Erro Calendário: ${resCal.status}`);
        const dataCal = await resCal.json();
        setCalendario(dataCal);

        // 3. Busca Estatísticas
        const resStats = await fetch(`${API_URL}/api/estatisticas`);
        if (!resStats.ok) throw new Error(`Erro Stats: ${resStats.status}`);
        const dataStats = await resStats.json();
        setStats(dataStats);

        setLoading(false); // Sucesso!
      } catch (err) {
        console.error("ERRO FATAL:", err);
        setErrorMsg(err.message); // Salva o erro para mostrar na tela
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- TELA DE CARREGAMENTO / ERRO ---
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-lfg-green mb-4"></div>
        <p>Acessando servidor em: <span className="font-mono text-yellow-400 text-sm">{API_URL}</span></p>
        <p className="text-gray-500 text-sm mt-2">Segura a bola...</p>
      </div>
    );
  }

  // --- TELA DE ERRO (O RAIO-X) ---
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-900/50 border border-red-500 p-6 rounded-xl max-w-lg">
          <h1 className="text-2xl font-bold text-red-400 mb-4">🚫 Falta Técnica! (Erro)</h1>
          <p className="mb-2">O site não conseguiu falar com o backend.</p>
          
          <div className="bg-black/50 p-4 rounded text-left font-mono text-xs mb-4 overflow-x-auto">
            <p className="text-gray-400">URL Tentada:</p>
            <p className="text-yellow-300 mb-2">{API_URL}</p>
            <p className="text-gray-400">Mensagem de Erro:</p>
            <p className="text-red-300">{errorMsg}</p>
          </div>

          <p className="text-sm text-gray-400">
            Dica para o Guilherme: Se o erro for "Failed to fetch", verifique o CORS ou se o link do Render está certo (https).
          </p>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-lfg-green text-dark-bg font-bold rounded hover:bg-green-400"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL (SE DEU TUDO CERTO) ---
  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans pb-12">
      <Header />

      <main className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-card-bg rounded-xl shadow-lg border border-white/5 overflow-hidden">
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
          <div className="p-4 md:p-6">
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
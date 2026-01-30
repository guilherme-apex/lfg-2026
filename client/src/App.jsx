import { useState, useEffect } from 'react';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Table from './components/Table';
import Matches from './components/Matches';
import Stats from './components/Stats'; // IMPORTAR STATS

function App() {
  const [activeTab, setActiveTab] = useState('table');
  const [classificacao, setClassificacao] = useState(null);
  const [calendario, setCalendario] = useState(null);
  const [stats, setStats] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

useEffect(() => {
    
    fetch(`${API_URL}/api/classificacao`)
      .then(res => res.json())
      .then(data => setClassificacao(data))
      .catch(err => console.error("Erro Classificação:", err));

    fetch(`${API_URL}/api/calendario`)
      .then(res => res.json())
      .then(data => setCalendario(data))
      .catch(err => console.error("Erro Calendário:", err));

    fetch(`${API_URL}/api/estatisticas`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Erro Estatísticas:", err));
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg font-sans text-white bg-[url('https://www.premierleague.com/resources/rebrand/v7.147.2/i/bg-elements/bg-pattern-dark.svg')] bg-fixed bg-cover">
      <Header />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        
        {/* Renderização Condicional */}
        {activeTab === 'table' && (
          <div className="animate-fade-in">
            {classificacao ? <Table data={classificacao} /> : <p className="text-center text-gray-500">Carregando...</p>}
          </div>
        )}

        {activeTab === 'matches' && (
           <div className="animate-fade-in">
             {calendario ? <Matches data={calendario} /> : <p className="text-center text-gray-500">Carregando...</p>}
           </div>
        )}

        {/* ABA ESTATÍSTICAS (NOVA) */}
        {activeTab === 'stats' && (
           <div className="animate-fade-in">
             {stats ? <Stats data={stats} /> : <p className="text-center text-gray-500">Calculando probabilidades...</p>}
           </div>
        )}

      </main>
    </div>
  );
}

export default App;
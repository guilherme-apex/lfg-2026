import React from 'react';

export default function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'matches', label: 'Confrontos' }, // Traduzi para PT-BR já
    { id: 'table', label: 'Classificação' },
    { id: 'stats', label: 'Estatísticas' },
  ];

  return (
    <nav className="bg-lfg-header border-b border-white/10 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 text-sm font-bold uppercase tracking-wider border-b-4 transition-colors duration-200
                ${activeTab === tab.id 
                  ? 'border-lfg-green text-white' 
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
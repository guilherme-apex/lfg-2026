import React from 'react';

export default function Stats({ data }) {
  // LOADING STATE
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-pulse">
        <div className="text-4xl mb-4">🏀</div>
        <p className="text-lg font-bold">Processando Estatísticas...</p>
      </div>
    );
  }

  const { saf, probabilities, streaks } = data;
  
  // Garante que streaks existam para não quebrar
  const winStreak = streaks?.win || { count: 0, teams: [] };
  const loseStreak = streaks?.lose || { count: 0, teams: [] };

  // --- REGRA DE FILTRO: Só exibe se a sequência for >= 2 jogos ---
  const showWinStreak = winStreak.count >= 2;
  const showLoseStreak = loseStreak.count >= 2;

  return (
    <div className="space-y-6 pb-12 animate-fade-in w-full">
      
      {/* 1. LINHA SUPERIOR: SAF & SEQUÊNCIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD SAF (Maior Patrimônio) */}
        <div className="bg-card-bg border border-white/10 rounded-xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="text-8xl">💰</span>
          </div>
          <div>
            <h3 className="text-lfg-green font-bold uppercase tracking-widest text-xs mb-4">Maior Patrimônio</h3>
            {saf ? (
              <div className="flex items-center gap-5 z-10 relative">
                <div className="w-20 h-20 bg-dark-bg rounded-full p-2 border-2 border-green-500/30 flex items-center justify-center shrink-0">
                   {saf.escudo ? (
                     <img src={saf.escudo} alt={saf.nome} className="w-full h-full object-contain" />
                   ) : (
                     <span className="text-2xl">🛡️</span>
                   )}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{saf.nome}</h2>
                  <p className="text-gray-400 text-sm mb-2">Cartoleiro: <span className="text-white font-semibold">{saf.cartoleiro}</span></p>
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded text-sm font-mono font-bold">
                    C$ {parseFloat(saf.patrimonio).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm">Dados financeiros indisponíveis.</div>
            )}
          </div>
        </div>

        {/* CARD SEQUÊNCIAS (Layout Flexível) */}
        <div className="bg-card-bg border border-white/10 rounded-xl p-6 shadow-lg flex flex-col gap-6">
          <h3 className="text-lfg-green font-bold uppercase tracking-widest text-xs">Sequências Atuais (2+ Jogos)</h3>
          
          {/* Sequência de Vitórias */}
          <div className="bg-dark-bg/50 p-4 rounded-lg border border-white/5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <span className="text-sm font-bold text-gray-300 uppercase">Vitórias Seguidas</span>
              </div>
              <div className="text-right">
                <span className={`text-xl font-black ${showWinStreak ? 'text-orange-500' : 'text-gray-600'}`}>
                  {showWinStreak ? winStreak.count : '-'}
                </span>
              </div>
            </div>
            
            {/* Lista de Times (Badges) */}
            <div className="flex flex-wrap gap-2 mt-1">
              {showWinStreak ? (
                winStreak.teams.map((t, idx) => (
                  <span key={idx} className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs font-bold rounded uppercase whitespace-nowrap">
                    {t.nome}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 italic">Nenhuma sequência ativa acima de 2 jogos.</span>
              )}
            </div>
          </div>

          {/* Sequência de Derrotas */}
          <div className="bg-dark-bg/50 p-4 rounded-lg border border-white/5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">❄️</span>
                <span className="text-sm font-bold text-gray-300 uppercase">Seca de Vitórias</span>
              </div>
              <div className="text-right">
                <span className={`text-xl font-black ${showLoseStreak ? 'text-blue-500' : 'text-gray-600'}`}>
                  {showLoseStreak ? loseStreak.count : '-'}
                </span>
              </div>
            </div>

            {/* Lista de Times (Badges) */}
            <div className="flex flex-wrap gap-2 mt-1">
              {showLoseStreak ? (
                loseStreak.teams.map((t, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs font-bold rounded uppercase whitespace-nowrap">
                    {t.nome}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 italic">Nenhuma sequência ativa acima de 2 jogos.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROBABILIDADE DE TÍTULO (Todos os 20 times) */}
      <div className="bg-card-bg border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-lfg-green font-bold uppercase tracking-widest text-xs mb-6">Probabilidade de Título</h3>
        
        {/* Grid Responsivo: 1 coluna no mobile, 2 no tablet/desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {probabilities && probabilities.length > 0 ? (
            probabilities.map((time, index) => (
              <div key={index} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded transition-colors group">
                
                {/* Posição */}
                <span className={`font-mono font-bold text-sm w-6 text-right ${index < 4 ? 'text-lfg-green' : 'text-gray-600'}`}>
                  {index + 1}º
                </span>

                {/* Nome do Time (Truncate inteligente) */}
                <span className="flex-1 text-sm font-bold text-gray-300 group-hover:text-white truncate">
                  {time.nome}
                </span>

                {/* Barra de Progresso e Porcentagem */}
                <div className="flex items-center gap-3 w-1/3 md:w-2/5 justify-end">
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex justify-end"> {/* justify-end para alinhar a barra à direita se quiser, ou normal */}
                     <div 
                       className={`h-full rounded-full ${index === 0 ? 'bg-yellow-400' : 'bg-lfg-green'}`} 
                       style={{ width: `${Math.max(time.probTitulo, 2)}%` }} // Mínimo visual de 2% para não sumir
                     ></div>
                  </div>
                  <span className="text-xs font-mono font-bold text-white w-10 text-right">
                    {time.probTitulo}%
                  </span>
                </div>

              </div>
            ))
          ) : (
            <p className="text-gray-500 italic p-4">Dados insuficientes para cálculo estatístico.</p>
          )}
        </div>
      </div>

    </div>
  );
}
import React from 'react';

export default function Stats({ data }) {
  // 1. LOADING STATE: Se os dados ainda não chegaram, mostra o aquecimento
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-pulse">
        <div className="text-4xl mb-4">🏀</div>
        <p className="text-lg font-bold">Analisando Estatísticas...</p>
        <span className="text-sm">Aguardando dados do servidor</span>
      </div>
    );
  }

  // Desestruturação com valores padrão para evitar quebra
  const { saf, probabilities, streaks } = data;
  const winStreak = streaks?.win || { count: 0, teams: [] };
  const loseStreak = streaks?.lose || { count: 0, teams: [] };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12 animate-fade-in">
      
      {/* CARD 1: O DONO DA BOLA (SAF / RICO) */}
      <div className="bg-card-bg border border-white/10 rounded-xl p-6 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="text-6xl">💰</span>
        </div>
        <h3 className="text-lfg-green font-bold uppercase tracking-widest text-sm mb-4">Maior Patrimônio (SAF)</h3>
        
        {saf ? (
            <div className="flex items-center gap-4">
                {saf.escudo ? (
                    <img src={saf.escudo} alt={saf.nome} className="w-16 h-16 object-contain drop-shadow-md" />
                ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                )}
                <div>
                    <h2 className="text-2xl font-black text-white">{saf.nome}</h2>
                    <p className="text-gray-400 text-sm">Cartoleiro: <span className="text-white">{saf.cartoleiro}</span></p>
                    <div className="mt-2 bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-1 inline-block">
                        <span className="text-green-400 font-mono font-bold">C$ {saf.patrimonio}</span>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-gray-500 italic">Nenhum dado financeiro disponível.</div>
        )}
      </div>

      {/* CARD 2: SEQUÊNCIAS (STREAKS) */}
      <div className="bg-card-bg border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-lfg-green font-bold uppercase tracking-widest text-sm mb-4">Sequências Atuais</h3>
        
        <div className="space-y-4">
            {/* Winning Streak */}
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                    <span className="text-2xl mr-2">🔥</span>
                    <span className="font-bold text-gray-200">Invencibilidade</span>
                </div>
                <div className="text-right">
                    <span className="text-xl font-black text-orange-400">{winStreak.count} J</span>
                    <div className="text-xs text-gray-500 max-w-[150px] truncate">
                        {winStreak.teams.map(t => t.nome).join(', ') || "-"}
                    </div>
                </div>
            </div>

            {/* Losing Streak */}
            <div className="flex justify-between items-center">
                <div>
                    <span className="text-2xl mr-2">❄️</span>
                    <span className="font-bold text-gray-200">Seca de Vitórias</span>
                </div>
                <div className="text-right">
                    <span className="text-xl font-black text-blue-400">{loseStreak.count} J</span>
                    <div className="text-xs text-gray-500 max-w-[150px] truncate">
                        {loseStreak.teams.map(t => t.nome).join(', ') || "-"}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* CARD 3: PROBABILIDADES (FULL WIDTH) */}
      <div className="col-span-1 md:col-span-2 bg-card-bg border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-lfg-green font-bold uppercase tracking-widest text-sm mb-6">Probabilidade de Título</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {probabilities && probabilities.length > 0 ? (
                probabilities.slice(0, 6).map((time, index) => (
                    <div key={index} className="flex items-center justify-between bg-dark-bg p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold w-6 ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                {index + 1}º
                            </span>
                            <span className="font-bold text-sm text-gray-200 truncate max-w-[120px]">{time.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-lfg-green" 
                                    style={{ width: `${time.probTitulo}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-mono font-bold text-lfg-green">{time.probTitulo}%</span>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-gray-500 col-span-3 text-center">Dados insuficientes para cálculo.</p>
            )}
        </div>
      </div>
    </div>
  );
}
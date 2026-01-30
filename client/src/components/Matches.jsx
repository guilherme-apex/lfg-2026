import React, { useState, useEffect } from 'react';

export default function Matches({ data }) {
  // Ordena as rodadas numericamente
  const rodadas = data ? Object.keys(data).sort((a, b) => {
      return parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''));
  }) : [];

  const [selectedRodada, setSelectedRodada] = useState(rodadas[0] || "Rodada 1");
  const [modoCapitao, setModoCapitao] = useState(false);

  // Garante que a rodada selecionada existe
  useEffect(() => {
    if (rodadas.length > 0 && !rodadas.includes(selectedRodada)) {
        setSelectedRodada(rodadas[0]);
    }
  }, [data, rodadas, selectedRodada]);

  if (!data) return null;
  
  // Pega os jogos da rodada selecionada
  const jogos = data[selectedRodada] || [];

  return (
    <div className="animate-fade-in w-full">
        
        {/* --- BOTÃO SWITCH --- */}
        <div className="flex flex-col items-center justify-center mb-6">
            <button 
                onClick={() => setModoCapitao(!modoCapitao)}
                className={`
                    px-6 py-2 md:px-8 md:py-3 rounded-lg font-black text-xs md:text-sm uppercase tracking-widest transition-all transform hover:scale-105 shadow-lg border border-white/10
                    ${modoCapitao ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}
                `}
            >
                {modoCapitao ? "PONTUAÇÃO COM CAPITÃO" : "PONTUAÇÃO SEM CAPITÃO"}
            </button>
        </div>

        {/* Navegador de Rodadas */}
        <div className="flex items-center justify-between bg-lfg-header border border-white/10 rounded-t-xl p-4">
            <button 
                onClick={() => {
                    const idx = rodadas.indexOf(selectedRodada);
                    if (idx > 0) setSelectedRodada(rodadas[idx - 1]);
                }}
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold px-2"
                disabled={rodadas.indexOf(selectedRodada) === 0}
            >
                ◀ <span className="hidden md:inline">Anterior</span>
            </button>
            <h3 className="text-lg md:text-xl font-bold text-lfg-green uppercase tracking-widest text-center">{selectedRodada}</h3>
            <button 
                onClick={() => {
                    const idx = rodadas.indexOf(selectedRodada);
                    if (idx < rodadas.length - 1) setSelectedRodada(rodadas[idx + 1]);
                }}
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold px-2"
                disabled={rodadas.indexOf(selectedRodada) === rodadas.length - 1}
            >
                <span className="hidden md:inline">Próxima</span> ▶
            </button>
        </div>

        {/* Lista de Jogos */}
        <div className="bg-card-bg border border-t-0 border-white/10 rounded-b-xl overflow-hidden">
            {jogos.map((jogo, index) => {
                // Lógica de Pontuação
                const rawPc = modoCapitao ? jogo.placar_casa_capitao : jogo.placar_casa;
                const rawPv = modoCapitao ? jogo.placar_visitante_capitao : jogo.placar_visitante;

                // FIX: ParseFloat para pegar decimais se houver, ou 0 se der erro.
                // toFixed(2) é opcional, mas garante formatação bonita.
                const pc = parseFloat(rawPc || 0); 
                const pv = parseFloat(rawPv || 0);
                
                // MUDANÇA CRÍTICA AQUI:
                // Removi a trava. Sempre exibe o placar, mesmo que seja 0.
                const jogoAconteceu = true; 

                return (
                    <div key={index} className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 border-b border-white/5 hover:bg-white/5 transition-colors gap-4 md:gap-0">
                        
                        {/* Time Casa */}
                        <div className="flex-1 flex items-center justify-center md:justify-end gap-3 w-full">
                            <span className="text-base md:text-lg font-bold text-white text-right w-full md:w-auto truncate">{jogo.casa}</span>
                            {jogo.escudo_casa ? (
                                <img src={jogo.escudo_casa} alt={jogo.casa} className="w-10 h-10 md:w-12 md:h-12 object-contain shrink-0" />
                            ) : (
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center shrink-0">🛡️</div>
                            )}
                        </div>

                        {/* Placar Central */}
                        <div className="mx-2 md:mx-8 min-w-[120px] text-center shrink-0">
                            {jogoAconteceu ? (
                                <div className={`border px-4 py-2 md:px-6 md:py-2 rounded-lg transition-all duration-300 ${modoCapitao ? 'bg-orange-900/20 border-orange-500/30' : 'bg-dark-bg border-white/10'}`}>
                                    <span className={`text-xl md:text-2xl font-black tracking-widest whitespace-nowrap ${modoCapitao ? 'text-orange-400' : 'text-lfg-green'}`}>
                                        {/* Exibe com formatação segura */}
                                        {Number(pc).toFixed(2).replace('.00', '')} - {Number(pv).toFixed(2).replace('.00', '')}
                                    </span>
                                </div>
                            ) : (
                                <div className="bg-dark-bg border border-white/10 px-4 py-1 rounded-lg">
                                    <span className="text-sm font-bold text-gray-500">v</span>
                                </div>
                            )}
                        </div>

                        {/* Time Visitante */}
                        <div className="flex-1 flex items-center justify-center md:justify-start gap-3 w-full">
                            {jogo.escudo_visitante ? (
                                <img src={jogo.escudo_visitante} alt={jogo.visitante} className="w-10 h-10 md:w-12 md:h-12 object-contain shrink-0" />
                            ) : (
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center shrink-0">🛡️</div>
                            )}
                            <span className="text-base md:text-lg font-bold text-white text-left w-full md:w-auto truncate">{jogo.visitante}</span>
                        </div>
                    </div>
                );
            })}
             {jogos.length === 0 && <div className="p-8 text-center text-gray-500 font-medium">Nenhum jogo nesta rodada. (Verifique o servidor)</div>}
        </div>
    </div>
  );
}
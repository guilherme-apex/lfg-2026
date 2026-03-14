import React, { useState, useEffect } from 'react';

export default function Matches({ data }) {
  // Ordena as rodadas numericamente
  const rodadas = data ? Object.keys(data).sort((a, b) => {
      return parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''));
  }) : [];

  const [selectedRodada, setSelectedRodada] = useState(rodadas[0] || "Rodada 1");

  // Garante que a rodada selecionada existe
  useEffect(() => {
    if (rodadas.length > 0 && !rodadas.includes(selectedRodada)) {
        setSelectedRodada(rodadas[0]);
    }
  }, [data, rodadas, selectedRodada]);

  if (!data) return null;
  
  const jogos = data[selectedRodada] || [];

  return (
    <div className="animate-fade-in w-full">
        {/* Navegador de Rodadas */}
        <div className="flex items-center justify-between bg-lfg-header border border-white/10 rounded-t-xl p-4 mb-4">
            <button 
                onClick={() => {
                    const idx = rodadas.indexOf(selectedRodada);
                    if (idx > 0) setSelectedRodada(rodadas[idx - 1]);
                }}
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold px-2 cursor-pointer"
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
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold px-2 cursor-pointer"
                disabled={rodadas.indexOf(selectedRodada) === rodadas.length - 1}
            >
                <span className="hidden md:inline">Próxima</span> ▶
            </button>
        </div>

        {/* Lista de Jogos (Cards Separados) */}
        <div className="flex flex-col gap-4">
            {jogos.map((jogo, index) => {
                // Removemos o modo capitao, usamos apenas o placar normal (que ja vem tratado do Backend)
                const pc = parseFloat(jogo.placar_casa || 0); 
                const pv = parseFloat(jogo.placar_visitante || 0);

                // Math.trunc garante que não haja casas decimais, conforme as regras da sua liga
                const pcFormatted = (jogo.placar_casa !== null && jogo.placar_casa !== undefined) ? Math.trunc(pc) : '--';
                const pvFormatted = (jogo.placar_visitante !== null && jogo.placar_visitante !== undefined) ? Math.trunc(pv) : '--';

                const winCasa = pc > pv;
                const winVis = pv > pc;

                return (
                    <div key={index} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 md:p-6 shadow-lg flex items-center justify-between hover:border-white/10 transition-colors">
                        
                        {/* Time Mandante */}
                        <div className="flex flex-col md:flex-row items-center justify-end w-[35%] md:gap-4 gap-2">
                            <span className={`text-xs md:text-base font-black text-center md:text-right uppercase truncate w-full ${winCasa ? 'text-lfg-green' : 'text-gray-300'}`}>
                                {jogo.casa}
                            </span>
                            <div className="w-10 h-10 md:w-16 md:h-16 flex-shrink-0 relative">
                                {jogo.escudo_casa ? (
                                    <img src={jogo.escudo_casa} alt={jogo.casa} className="w-full h-full object-contain filter drop-shadow-md" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-500 font-bold">LFG</div>
                                )}
                                {winCasa && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-lfg-green rounded-full border-2 border-[#1A1A1A]"></div>}
                            </div>
                        </div>

                        {/* Placar Central */}
                        <div className="flex items-center justify-center w-[30%] gap-2 md:gap-6 bg-[#111] p-3 md:p-4 rounded-xl border border-white/5">
                            <span className={`text-2xl md:text-4xl font-black ${winCasa ? 'text-lfg-green drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]' : 'text-gray-100'}`}>
                                {pcFormatted}
                            </span>
                            <span className="text-gray-500 font-black text-xs md:text-sm">X</span>
                            <span className={`text-2xl md:text-4xl font-black ${winVis ? 'text-lfg-green drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]' : 'text-gray-100'}`}>
                                {pvFormatted}
                            </span>
                        </div>

                        {/* Time Visitante */}
                        <div className="flex flex-col md:flex-row-reverse items-center justify-start w-[35%] md:gap-4 gap-2">
                            <span className={`text-xs md:text-base font-black text-center md:text-left uppercase truncate w-full ${winVis ? 'text-lfg-green' : 'text-gray-300'}`}>
                                {jogo.visitante}
                            </span>
                            <div className="w-10 h-10 md:w-16 md:h-16 flex-shrink-0 relative">
                                {jogo.escudo_visitante ? (
                                    <img src={jogo.escudo_visitante} alt={jogo.visitante} className="w-full h-full object-contain filter drop-shadow-md" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-500 font-bold">LFG</div>
                                )}
                                {winVis && <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-lfg-green rounded-full border-2 border-[#1A1A1A]"></div>}
                            </div>
                        </div>

                    </div>
                );
            })}
        </div>
    </div>
  );
}
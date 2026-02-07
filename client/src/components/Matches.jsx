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
        <div className="flex items-center justify-between bg-lfg-header border border-white/10 rounded-t-xl p-4 mb-4">
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

        {/* Lista de Jogos (Cards Separados) */}
        <div className="flex flex-col gap-4">
            {jogos.map((jogo, index) => {
                const rawPc = modoCapitao ? jogo.placar_casa_capitao : jogo.placar_casa;
                const rawPv = modoCapitao ? jogo.placar_visitante_capitao : jogo.placar_visitante;

                const pc = parseFloat(rawPc || 0); 
                const pv = parseFloat(rawPv || 0);

                // --- AQUI ESTA A CORREÇÃO ---
                // Antes: toFixed(2) -> Criava "95.68"
                // Agora: Math.trunc() -> Cria "95" (Remove tudo após a vírgula)
                const pcFormatted = Math.trunc(pc);
                const pvFormatted = Math.trunc(pv);

                return (
                    // --- CARD DO JOGO (CAIXA FECHADA) ---
                    <div key={index} className="bg-card-bg border border-white/10 rounded-xl p-4 shadow-md relative overflow-hidden">
                        
                        {/* Versão Desktop (Horizontal) - Escondida no Mobile */}
                        <div className="hidden md:flex items-center justify-between">
                            <div className="flex items-center justify-end gap-3 flex-1">
                                <span className="text-lg font-bold text-white text-right">{jogo.casa}</span>
                                {jogo.escudo_casa ? <img src={jogo.escudo_casa} className="w-12 h-12 object-contain" /> : <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">🛡️</div>}
                            </div>

                            <div className="mx-8 bg-black/20 px-6 py-2 rounded-lg border border-white/5">
                                <span className={`text-2xl font-black tracking-widest ${modoCapitao ? 'text-orange-400' : 'text-lfg-green'}`}>
                                    {pcFormatted} - {pvFormatted}
                                </span>
                            </div>

                            <div className="flex items-center justify-start gap-3 flex-1">
                                {jogo.escudo_visitante ? <img src={jogo.escudo_visitante} className="w-12 h-12 object-contain" /> : <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">🛡️</div>}
                                <span className="text-lg font-bold text-white text-left">{jogo.visitante}</span>
                            </div>
                        </div>

                        {/* Versão Mobile (Box Vertical) - Visível só no Mobile */}
                        <div className="md:hidden flex flex-col gap-3">
                            
                            {/* Linha Time Casa */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <div className="flex items-center gap-3">
                                    {jogo.escudo_casa ? <img src={jogo.escudo_casa} className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 bg-gray-700 rounded-full"></div>}
                                    <span className="font-bold text-gray-100 text-sm">{jogo.casa}</span>
                                </div>
                                <span className={`text-xl font-black ${pc > pv ? 'text-lfg-green' : 'text-white'}`}>
                                    {pcFormatted}
                                </span>
                            </div>

                            {/* "VS" Pequeno no meio */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-bg border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                                VS
                            </div>

                            {/* Linha Time Visitante */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-3">
                                    {jogo.escudo_visitante ? <img src={jogo.escudo_visitante} className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 bg-gray-700 rounded-full"></div>}
                                    <span className="font-bold text-gray-100 text-sm">{jogo.visitante}</span>
                                </div>
                                <span className={`text-xl font-black ${pv > pc ? 'text-lfg-green' : 'text-white'}`}>
                                    {pvFormatted}
                                </span>
                            </div>
                        </div>

                    </div>
                );
            })}
            
            {jogos.length === 0 && <div className="p-8 text-center text-gray-500 font-medium">Nenhum jogo nesta rodada.</div>}
        </div>
    </div>
  );
}
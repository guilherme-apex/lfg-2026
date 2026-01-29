import { useState, useEffect } from 'react';

export default function Matches({ data }) {
  // Ordena as rodadas numericamente (Rodada 1, Rodada 2...)
  const rodadas = data ? Object.keys(data).sort((a, b) => {
      return parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''));
  }) : [];

  const [selectedRodada, setSelectedRodada] = useState(rodadas[0] || "Rodada 1");
  
  // Estado para controlar o modo de visualização (False = Sem Capitão / True = Com Capitão)
  const [modoCapitao, setModoCapitao] = useState(false);

  // Garante que a rodada selecionada existe nos dados carregados
  useEffect(() => {
    if (rodadas.length > 0 && !rodadas.includes(selectedRodada)) {
        setSelectedRodada(rodadas[0]);
    }
  }, [data, rodadas, selectedRodada]);

  if (!data) return null;
  const jogos = data[selectedRodada] || [];

  return (
    <div className="animate-fade-in">
        
        {/* --- BOTÃO SWITCH (LIMPO) --- */}
        <div className="flex flex-col items-center justify-center mb-6">
            <button 
                onClick={() => setModoCapitao(!modoCapitao)}
                className={`
                    px-8 py-3 rounded-lg font-black text-sm uppercase tracking-widest transition-all transform hover:scale-105 shadow-lg border border-white/10
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
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold"
                disabled={rodadas.indexOf(selectedRodada) === 0}
            >
                ◀ Anterior
            </button>
            <h3 className="text-xl font-bold text-lfg-green uppercase tracking-widest">{selectedRodada}</h3>
            <button 
                onClick={() => {
                    const idx = rodadas.indexOf(selectedRodada);
                    if (idx < rodadas.length - 1) setSelectedRodada(rodadas[idx + 1]);
                }}
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold"
                disabled={rodadas.indexOf(selectedRodada) === rodadas.length - 1}
            >
                Próxima ▶
            </button>
        </div>

        {/* Lista de Jogos */}
        <div className="bg-card-bg border border-t-0 border-white/10 rounded-b-xl overflow-hidden">
            {jogos.map((jogo, index) => {
                // Lógica de exibição do placar
                const rawPc = modoCapitao ? jogo.placar_casa_capitao : jogo.placar_casa;
                const rawPv = modoCapitao ? jogo.placar_visitante_capitao : jogo.placar_visitante;

                const pc = parseInt(rawPc || 0);
                const pv = parseInt(rawPv || 0);
                
                const jogoAconteceu = !(pc === 0 && pv === 0); 

                return (
                    <div key={index} className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-white/5 hover:bg-white/5 transition-colors">
                        {/* Time Casa */}
                        <div className="flex-1 flex items-center justify-end gap-4 w-full md:w-auto mb-2 md:mb-0">
                            <span className="text-lg font-bold text-white text-right hidden md:block">{jogo.casa}</span>
                            <span className="text-lg font-bold text-white md:hidden">{jogo.casa}</span>
                            {jogo.escudo_casa ? (
                                <img src={jogo.escudo_casa} alt={jogo.casa} className="w-10 h-10 object-contain" />
                            ) : (
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">🛡️</div>
                            )}
                        </div>

                        {/* Placar Central */}
                        <div className="mx-8 min-w-[100px] text-center">
                            {jogoAconteceu ? (
                                <div className={`border px-6 py-2 rounded-lg transition-all duration-300 ${modoCapitao ? 'bg-orange-900/20 border-orange-500/30' : 'bg-dark-bg border-white/10'}`}>
                                    <span className={`text-2xl font-black tracking-widest ${modoCapitao ? 'text-orange-400' : 'text-lfg-green'}`}>
                                        {pc} - {pv}
                                    </span>
                                </div>
                            ) : (
                                <div className="bg-dark-bg border border-white/10 px-4 py-1 rounded-lg">
                                    <span className="text-sm font-bold text-gray-500">v</span>
                                </div>
                            )}
                        </div>

                        {/* Time Visitante */}
                        <div className="flex-1 flex items-center justify-start gap-4 w-full md:w-auto mt-2 md:mt-0">
                            {jogo.escudo_visitante ? (
                                <img src={jogo.escudo_visitante} alt={jogo.visitante} className="w-10 h-10 object-contain" />
                            ) : (
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">🛡️</div>
                            )}
                            <span className="text-lg font-bold text-white text-left">{jogo.visitante}</span>
                        </div>
                    </div>
                );
            })}
             {jogos.length === 0 && <div className="p-8 text-center text-gray-500 font-medium">Nenhum jogo nesta rodada. (Verifique o servidor)</div>}
        </div>
    </div>
  );
}
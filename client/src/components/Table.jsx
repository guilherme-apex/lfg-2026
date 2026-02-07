import React from 'react';

export default function Table({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="overflow-x-auto bg-card-bg/50 rounded-xl border border-white/5">
      <table className="w-full text-sm text-left border-collapse min-w-[600px]">
        <thead className="text-gray-400 font-bold uppercase text-xs border-b border-white/10">
          <tr>
            <th className="py-4 px-3 text-center w-12">Pos</th>
            <th className="py-4 px-3 text-left">Clube</th>
            <th className="py-4 px-3 text-center">J</th>
            <th className="py-4 px-3 text-center">V</th>
            <th className="py-4 px-3 text-center">E</th>
            <th className="py-4 px-3 text-center">D</th>
            {/* PF e PS aparecem no PC, ocultos no mobile para economizar espaço se quiser, ou deixe table-cell */}
            <th className="py-4 px-3 text-center hidden md:table-cell">PF</th>
            <th className="py-4 px-3 text-center hidden md:table-cell">PS</th>
            <th className="py-4 px-3 text-center text-white">SP</th>
            <th className="py-4 px-3 text-center font-bold text-white text-base">PTS</th>
            <th className="py-4 px-4 text-center hidden md:table-cell">Últimos 5</th>
          </tr>
        </thead>
        <tbody className="text-gray-200">
          {data.map((time, index) => {
            const posicao = index + 1;
            let rowClass = "border-b border-white/5 hover:bg-white/5 transition-colors";
            let posColor = "border-l-4 border-transparent";

            if (posicao <= 4) {
                rowClass += " bg-green-900/10";
                posColor = "border-l-4 border-lfg-green"; 
            } else if (posicao > data.length - 4) {
                rowClass += " bg-red-900/10";
                posColor = "border-l-4 border-red-600"; 
            }

            return (
              <tr key={time.nome} className={rowClass}>
                <td className={`py-4 px-3 text-center font-bold ${posColor}`}>{posicao}</td>
                <td className="py-4 px-3 flex items-center gap-3">
                  {time.escudo ? (
                    <img src={time.escudo} alt={time.nome} className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs">🛡️</div>
                  )}
                  <span className="font-bold text-white text-base whitespace-nowrap">{time.nome}</span>
                </td>
                <td className="py-4 px-3 text-center">{time.J}</td>
                <td className="py-4 px-3 text-center">{time.V}</td>
                <td className="py-4 px-3 text-center">{time.E}</td>
                <td className="py-4 px-3 text-center">{time.D}</td>
                
                {/* APLICADO MATH.TRUNC NO FRONTEND TAMBÉM POR SEGURANÇA */}
                <td className="py-4 px-3 text-center hidden md:table-cell">{Math.trunc(time.PF)}</td>
                <td className="py-4 px-3 text-center hidden md:table-cell">{Math.trunc(time.PS)}</td>
                <td className="py-4 px-3 text-center font-medium">{Math.trunc(time.SP)}</td>
                
                <td className="py-4 px-3 text-center font-bold text-white text-lg">{time.P}</td>
                <td className="py-4 px-4 hidden md:flex items-center justify-center gap-1 h-full mt-2">
                    {time.history.slice(-5).map((result, i) => {
                        let color = "bg-gray-600";
                        let letra = "E"; 
                        if (result === 'W') { color = "bg-lfg-green"; letra = "V"; }
                        if (result === 'L') { color = "bg-red-500"; letra = "D"; }
                        return (
                            <div key={i} className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-[10px] text-black font-bold`}>
                                {letra}
                            </div>
                        )
                    })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-4 flex gap-6 text-xs text-gray-400 border-t border-white/5">
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-lfg-green rounded-full"></span> G4</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-600 rounded-full"></span> Z4 (Churrasco dos Bagres)</div>
      </div>
    </div>
  );
}
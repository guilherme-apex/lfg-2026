import React from 'react';

export default function Header() {
  return (
    <header className="bg-lfg-header h-24 flex items-center px-4 md:px-8 shadow-lg relative z-10 border-b border-gray-800">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        
        {/* --- ESQUERDA: Logo e Título --- */}
        <div className="flex items-center gap-6">
          <img 
            src="/logo.png" 
            alt="LFG Logo" 
            className="h-20 w-auto object-contain drop-shadow-md" 
          />
          
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
              LIGA FÉRIAS GARANTIDAS 2026
            </h1>
            <p className="text-sm text-lfg-green font-semibold tracking-wider uppercase">
              Cartola FC
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lfg-header': '#000000', // Preto Puro para o Header/Menu
        'lfg-green': '#00ff85',  // Verde Neon (Matias Style)
        'dark-bg': '#121212',    // Fundo da página (quase preto, pra não cansar a vista)
        'card-bg': '#1e1e1e',    // Fundo dos cards
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amarillo: '#FFE000',
        rosa: '#FF1F8E',
        azul: '#1B4FD8',
        rojo: '#E31E24',
        blanco: '#FFFFFF',
        oscuro: '#2D2D2D',
      },
    },
  },
  plugins: [],
}

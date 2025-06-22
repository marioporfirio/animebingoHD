import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redireciona requisições de /graphql para a API da AniList
      '/graphql': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        // A linha 'rewrite' foi removida.
      },
    }
  }
})
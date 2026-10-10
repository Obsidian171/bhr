import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const SITEMAP_PATHS = [
  '/',
  '/charts',
  '/albums',
  '/artists',
  '/hall',
  '/journal',
  '/radio',
  '/ads',
  '/apply',
]

function sitemap(origin: string): Plugin {
  return {
    name: 'reverb-sitemap',
    apply: 'build',
    generateBundle() {
      const urls = SITEMAP_PATHS.map(
        (p) => `  <url><loc>${origin}${p}</loc><changefreq>daily</changefreq></url>`,
      ).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          'Disallow: /booth',
          '',
          `Sitemap: ${origin}/sitemap.xml`,
          '',
        ].join('\n'),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '')

  return {
    plugins: [react(), tailwindcss(), sitemap(siteUrl)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/@supabase')) return 'supabase'
            if (id.includes('node_modules/react-router')) return 'router'
            if (id.includes('node_modules/react')) return 'react'
            if (id.includes('node_modules/motion')) return 'motion'
            return undefined
          },
        },
      },
    },
  }
})
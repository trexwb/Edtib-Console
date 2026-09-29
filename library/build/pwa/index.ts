import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa'

const pwaOptions: Partial<VitePWAOptions> = {
  base: './', // ./ 或 /
  registerType: 'autoUpdate', // prompt、autoUpdate
  workbox: {
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 1024 * 1024 * 7, // 增大到 7MB
    // swDest: 'dist/static/sw.js', // 指定生成的 Service Worker 文件路径
    globPatterns: ['**/*.{js,css,html,ico,png}'],
  },
  // devOptions: {
  //   enabled: true,
  // },
  manifest: {
    lang: 'zh',
    name: 'Edtib控制中心',
    short_name: 'Edtib Console',
    description: 'Edtib控制中心',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: 'pwa-64x64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
}

export const createPwa = () => {
  return VitePWA(pwaOptions)
}

import fs from 'fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}

  const out: Record<string, string> = {}
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [keyPart, ...rest] = line.split('=')
    const key = keyPart.trim()
    if (!key) continue
    const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
    out[key] = value
  }
  return out
}

function resolveProxyTarget(apiUrl: string): string {
  if (!apiUrl || apiUrl.startsWith('/')) {
    return 'http://localhost:8000'
  }
  return apiUrl
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, __dirname, '')
  const rootEnv = parseEnvFile(path.resolve(__dirname, '../.env'))
  const rootEnvExample = parseEnvFile(path.resolve(__dirname, '../.env_example'))

  const VITE_API_URL =
    rootEnv.VITE_API_URL || localEnv.VITE_API_URL || rootEnvExample.VITE_API_URL || '/api'
  const VITE_NETWORK =
    rootEnv.VITE_NETWORK || localEnv.VITE_NETWORK || rootEnv.NETWORK || rootEnvExample.VITE_NETWORK || 'sepolia'
  const VITE_ANVIL_RPC_URL =
    rootEnv.VITE_ANVIL_RPC_URL ||
    rootEnv.ANVIL_RPC_URL ||
    localEnv.VITE_ANVIL_RPC_URL ||
    rootEnvExample.VITE_ANVIL_RPC_URL ||
    'http://127.0.0.1:8545'
  const VITE_SEPOLIA_RPC_URL =
    rootEnv.VITE_SEPOLIA_RPC_URL ||
    rootEnv.SEPOLIA_RPC_URL ||
    localEnv.VITE_SEPOLIA_RPC_URL ||
    rootEnvExample.VITE_SEPOLIA_RPC_URL ||
    'https://rpc.sepolia.org'

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(VITE_API_URL),
      'import.meta.env.VITE_NETWORK': JSON.stringify(VITE_NETWORK),
      'import.meta.env.VITE_ANVIL_RPC_URL': JSON.stringify(VITE_ANVIL_RPC_URL),
      'import.meta.env.VITE_SEPOLIA_RPC_URL': JSON.stringify(VITE_SEPOLIA_RPC_URL),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      headers: {
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: localhost:* 127.0.0.1:* *; script-src 'self' 'unsafe-inline' 'unsafe-eval' ws: localhost:* 127.0.0.1:* *; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: *; connect-src 'self' ws: wss: http: https: localhost:* 127.0.0.1:* *;"
      },
      proxy: {
        '/api': {
          target: resolveProxyTarget(VITE_API_URL),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // เปิดให้เข้าถึงจากภายนอก
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost', // หรือใช้ '192.168.1.153'
      port: 5173
    }
  }
})
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detecta iOS e mobile
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase()
      setIsIos(/iphone|ipad|ipod/.test(ua))
      setIsMobile(window.innerWidth <= 640)
    }

    // Evento para Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Handler do botão fixo (sempre visível)
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") setShowInstall(false)
    } else if (isIos) {
      setShowIosHint(true)
    } else {
      alert('Para instalar, acesse pelo Chrome no Android e clique nos 3 pontinhos do navegador, depois "Instalar app" ou "Adicionar à tela inicial".')
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-pink-100 overflow-hidden">
      {/* Blobs animados, reduzidos em mobile */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className={`absolute left-[-80px] top-[-40px] ${isMobile ? 'w-[140px] h-[100px] blur-lg' : 'w-[360px] h-[340px] blur-3xl'} rounded-full bg-pink-400 opacity-30`}
          animate={!isMobile ? {
            x: [0, 40, 0, -20, 0],
            y: [0, 20, 0, -30, 0]
          } : false}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute right-[-60px] bottom-[-60px] ${isMobile ? 'w-[80px] h-[80px] blur' : 'w-[350px] h-[350px] blur-2xl'} rounded-full bg-fuchsia-300 opacity-30`}
          animate={!isMobile ? {
            x: [0, -20, 0, 30, 0],
            y: [0, -30, 0, 20, 0]
          } : false}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute left-1/2 -translate-x-1/2 top-1/3 ${isMobile ? 'w-[90px] h-[60px] blur-sm' : 'w-[280px] h-[220px] blur-2xl'} rounded-full bg-pink-200 opacity-25`}
          animate={{ scale: [1, 1.07, 0.98, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`relative z-10 backdrop-blur-xl ${isMobile ? 'shadow-lg' : 'shadow-2xl'} bg-white/85 border border-pink-200/70 rounded-3xl ring-2 ring-pink-300/40 max-w-sm w-full text-center`}
      >
        <div className="px-5 py-8 sm:px-10 sm:py-12">
          <motion.img
            src="/salao.png"
            alt="Logo do Estúdio"
            className={`mx-auto mb-4 rounded-full border-2 border-pink-100 object-contain ${isMobile ? 'w-20 h-20 shadow' : 'w-32 h-32 shadow-xl'}`}
            initial={{ scale: 1, rotate: 0, y: 0 }}
            animate={{
              y: [0, -7, 0],
              rotate: [0, 4, -3, 0],
              scale: [1, 1.08, 1],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-pink-700 mb-2 drop-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            AgendaOne
          </motion.h1>

          <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-pink-400 to-fuchsia-500 mx-auto mb-4 rounded-full animate-pulse" />

          <motion.p
            className="text-base sm:text-lg text-pink-600 flex items-center justify-center gap-2 mb-6 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-pink-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-7 4h4m-6 4h8" />
            </svg>
            Agendamento Online
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-7 py-2 rounded-full shadow-lg font-bold hover:from-fuchsia-700 hover:to-pink-700 hover:scale-105 transition duration-300 focus:ring-2 focus:ring-pink-400"
            >
              Login
            </a>
            <a
              href="/cadastro"
              className="bg-white border-2 border-pink-400 text-pink-600 px-7 py-2 rounded-full shadow hover:bg-pink-100 hover:text-pink-900 font-bold hover:scale-105 transition duration-300 focus:ring-2 focus:ring-pink-400"
            >
              Cadastro
            </a>
          </div>
        </div>

        <button
  onClick={() => location.reload()}
  className="absolute top-2 right-2 p-2 rounded-full shadow hover:scale-110 transition duration-300 bg-white/80 hover:bg-pink-200"
  aria-label="Atualizar página"
>
  <img src="/atualizar.png" alt="Atualizar" className="w-6 h-6 object-contain" />
</button>

      </motion.div>

      {/* Banner automático Android/Chrome para instalar como PWA */}
      {showInstall && (
        <motion.div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white border border-pink-300 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 z-50"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img src="/icon-192.png" alt="App" className="w-10 h-10 rounded-xl" />
          <span className="text-pink-700 font-semibold">
            Instale o AgendaOne na tela inicial!
          </span>
          <button
            className="ml-2 bg-pink-500 text-white px-4 py-2 rounded-full font-bold shadow hover:bg-pink-700 transition"
            onClick={async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") {
                  setShowInstall(false);
                }
              }
            }}
          >
            Instalar
          </button>
        </motion.div>
      )}

      {/* Botão fixo para instalar o app (sempre visível) */}
      <button
        className="fixed bottom-5 right-5 z-50 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-full px-6 py-3 shadow-lg hover:bg-pink-700 hover:scale-105 transition"
        onClick={handleInstallClick}
      >
        📲 Instalar App
      </button>

      {/* Banner para iOS: instrução manual */}
      {(isIos && showIosHint) && (
        <motion.div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white border border-pink-300 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 z-50"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img src="/icon-192.png" className="w-8 h-8" alt="Logo" />
          <span className="text-pink-700 font-semibold">
            Toque no <b>compartilhar</b> e depois em <b>'Adicionar à Tela de Início'</b>
          </span>
          <button
            onClick={() => setShowIosHint(false)}
            className="ml-2 bg-pink-200 px-3 py-1 rounded hover:bg-pink-300 text-pink-700"
          >OK</button>
        </motion.div>
      )}
    </main>
  )
}

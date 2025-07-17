'use client'

import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-pink-100 overflow-hidden">

      {/* Fundo animado com partículas */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-40 h-40 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-fuchsia-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-24 h-24 bg-rose-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-bounce" />
      </div>

      {/* Cartão central com glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 backdrop-blur-2xl bg-white/70 shadow-2xl border border-white/30 rounded-3xl px-10 py-12 max-w-md w-full text-center ring-2 ring-pink-300/40"
      >
        {/* Imagem do ícone flutuando */}
        <motion.img
          src="/salao.png"
          alt="Logo do Estúdio"
          className="w-28 h-28 object-contain mx-auto mb-4 rounded-full shadow-xl border border-white/40"
          initial={{ scale: 1, rotate: 0, y: 0, boxShadow: '0 0 0px #f472b6' }}
          animate={{
            y: [0, -5, 0],
            rotate: [0, 2, -2, 0],
            scale: [1, 1.05, 1],
            boxShadow: [
              '0 0 10px #f472b6',
              '0 0 15px #ec4899',
              '0 0 10px #f472b6'
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Título */}
        <motion.h1
          className="text-4xl font-bold text-pink-700 mb-2 drop-shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          AgendaOne
        </motion.h1>

        <div className="w-24 h-1 bg-pink-400 mx-auto mb-4 rounded-full" />

        {/* Subtítulo */}
        <motion.p
          className="text-lg text-pink-600 flex items-center justify-center gap-2 mb-6"
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10m-7 4h4m-6 4h8"
            />
          </svg>
          Agendamento Online
        </motion.p>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="bg-pink-500 text-white px-6 py-2 rounded-full shadow-lg hover:bg-pink-600 transition duration-300 hover:scale-105 focus:ring-2 focus:ring-pink-400"
          >
            Login
          </a>
          <a
            href="/cadastro"
            className="bg-white border border-pink-500 text-pink-600 px-6 py-2 rounded-full shadow hover:bg-pink-100 transition duration-300 hover:scale-105 focus:ring-2 focus:ring-pink-400"
          >
            Cadastro
          </a>
        </div>
      </motion.div>
    </main>
  )
}

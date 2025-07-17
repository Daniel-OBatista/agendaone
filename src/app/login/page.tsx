'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

type FormularioLogin = {
  telefone: string
  senha: string
}

export default function LoginPage() {
  const { register, handleSubmit } = useForm<FormularioLogin>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarReset, setMostrarReset] = useState(false)
  const router = useRouter()

  const onSubmit = async (data: FormularioLogin) => {
    setErro('')
    setMostrarReset(false)
    setCarregando(true)

    const { telefone, senha } = data

    const { data: usuarios, error: erroBusca } = await supabase
      .from('users')
      .select('email')
      .eq('telefone', telefone)
      .single()

    if (erroBusca || !usuarios?.email) {
      setErro('Telefone ou senha digitados inválidos.')
      setCarregando(false)
      setMostrarReset(true)
      return
    }

    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: usuarios.email,
      password: senha,
    })

    if (error || !loginData.session) {
      setErro('Senha incorreta.')
      setCarregando(false)
      setMostrarReset(true)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { data: perfil } = await supabase
      .from('users')
      .select('role')
      .eq('id', userData.user?.id)
      .single()

    if (perfil?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/cliente')
    }
  }

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-white/30 ring-2 ring-pink-300/30 p-6 rounded-3xl shadow-2xl">

        <div className="relative mb-6 flex justify-center items-center">
          <button
            onClick={() => router.push('/')}
            className="absolute left-0 text-pink-500 hover:text-pink-700 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-pink-700 text-center">🎀 Login</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Telefone */}
          <input
            {...register('telefone')}
            type="tel"
            placeholder="Seu telefone"
            className="border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            required
          />

          {/* Senha com olho */}
          <div className="relative">
            <input
              {...register('senha')}
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha"
              className="w-full border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-2 top-2 text-zinc-500"
            >
              {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Barra de progresso */}
          {carregando && (
            <motion.div
              className="h-1 w-full rounded-full overflow-hidden bg-pink-200 mb-2"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="h-full w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-500"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              />
            </motion.div>
          )}

          {/* Botão de login */}
          <motion.button
            type="submit"
            disabled={carregando}
            className={`relative flex items-center justify-center font-semibold py-2 rounded-full transition-all duration-300 overflow-hidden
              ${carregando ? 'bg-pink-500/60 cursor-wait' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700'}
              text-white shadow-lg ring-2 ring-pink-400 hover:scale-105`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {carregando && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/10 via-pink-200/30 to-white/10 animate-pulse"
                initial={{ opacity: 0.4 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            )}
            <span className="relative z-10 tracking-wide">
              {carregando ? 'Entrando...' : 'Entrar'}
            </span>
          </motion.button>

          {/* Erro */}
          {erro && <p className="text-red-500 text-sm text-center mt-1">{erro}</p>}

          {/* Botão de redefinir senha */}
          {mostrarReset && (
            <button
              type="button"
              onClick={() => router.push('/redefinir-senha')}
              className="mt-4 py-2 px-4 rounded-full bg-gradient-to-r from-pink-400 to-fuchsia-500 text-white font-semibold shadow-md hover:from-pink-500 hover:to-fuchsia-600 transition-all duration-300"
  >
              🔐 Redefinir senha
            </button>
          )}
        </form>
      </div>
    </main>
  )
}

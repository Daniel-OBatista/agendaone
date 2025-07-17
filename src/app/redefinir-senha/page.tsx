'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

type FormularioSenha = {
  senha: string
  confirmarSenha: string
}

export default function CadastroPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormularioSenha>()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const router = useRouter()

  const onSubmit = async (data: FormularioSenha) => {
    setErro('')
    setCarregando(true)

    const { senha } = data

    // Simula cadastro (substitua por lógica real se necessário)
    setTimeout(() => {
      setCarregando(false)
      router.push('/login') // redireciona após "cadastro"
    }, 2000)
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
          <h1 className="text-2xl font-bold text-pink-700 text-center">🎀 Criar Senha</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Senha */}
          <div className="relative">
            <input
              {...register('senha', { required: 'A senha é obrigatória' })}
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Digite sua senha"
              className="w-full border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-zinc-500"
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.senha && <p className="text-red-500 text-sm">{errors.senha.message}</p>}
          </div>

          {/* Confirmar senha */}
          <div className="relative">
            <input
              {...register('confirmarSenha', {
                required: 'Confirme a senha',
                validate: (value) => value === watch('senha') || 'As senhas não coincidem',
              })}
              type={mostrarConfirmar ? 'text' : 'password'}
              placeholder="Confirmar senha"
              className="w-full border border-pink-200 p-2 rounded text-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-zinc-500"
              onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
            >
              {mostrarConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.confirmarSenha && <p className="text-red-500 text-sm">{errors.confirmarSenha.message}</p>}
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

          {/* Botão */}
          <motion.button
            type="submit"
            disabled={carregando}
            className={`relative flex items-center justify-center font-semibold py-3 rounded-full transition-all duration-300 overflow-hidden
              ${carregando ? 'bg-pink-500/60 cursor-wait' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700'}
              text-white shadow-lg ring-2 ring-pink-400 hover:scale-105`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 tracking-wide">
              {carregando ? 'Salvando...' : 'Salvar senha'}
            </span>
          </motion.button>

          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}
        </form>
      </div>
    </main>
  )
}
